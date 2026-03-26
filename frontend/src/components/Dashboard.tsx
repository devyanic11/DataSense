import { useState, useEffect, useMemo, useRef } from 'react';
import type { InsightData, ChartConfig, ChartRequest } from '../App';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
    PieChart, Pie, Cell, AreaChart, Area, ScatterChart, Scatter, ZAxis
} from 'recharts';
import {
    Activity, PieChart as PieChartIcon, BarChart2, TrendingUp,
    Map as MapIcon, Network, Loader2, Sparkles, Info, Table as TableIcon, AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import DataCleaner from './DataCleaner';

interface DashboardProps {
    data: InsightData;
    externalChartRequest?: ChartRequest | null;
}

interface DashboardState {
    loading: boolean;
    chartTransitioning: boolean;
    error: string | null;
}

const COLORS = ['#f97316', '#0ea5e9', '#10b981', '#e11d48', '#f59e0b', '#6366f1', '#14b8a6', '#ef4444'];

const tooltipStyle = {
    contentStyle: {
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        border: '1px solid rgba(148, 163, 184, 0.25)',
        borderRadius: '12px',
        backdropFilter: 'blur(10px)',
        color: '#e2e8f0',
        fontSize: '13px'
    },
    itemStyle: { color: '#fbbf24' },
    labelStyle: { color: '#cbd5e1' }
};

const axisStyle = {
    stroke: 'rgba(148,163,184,0.5)',
    tick: { fill: 'rgba(71,85,105,1)', fontSize: 11 }
};

function prepareRows(raw: any[], limit = 30): any[] {
    return raw.slice(0, limit).map(row => {
        const cleaned: any = {};
        for (const [k, v] of Object.entries(row)) {
            cleaned[k] = typeof v === 'number' ? v : (isNaN(Number(v)) ? String(v).slice(0, 28) : Number(v));
        }
        return cleaned;
    });
}

// ═══════════════════════════════════════════════════════════
// Simple Knowledge Graph renderer (no ReactFlow dependency)
// ═══════════════════════════════════════════════════════════
interface GraphNode { id: string; data: { label: string } }
interface GraphEdge { id: string; source: string; target: string; label?: string }

function SimpleKnowledgeGraph({ nodes, edges }: { nodes: GraphNode[]; edges: GraphEdge[] }) {
    const r = 200;
    const cx = 320, cy = 220;
    const positions: Record<string, { x: number; y: number }> = {};

    nodes.forEach((node, i) => {
        const angle = (i / nodes.length) * 2 * Math.PI - Math.PI / 2;
        positions[node.id] = {
            x: cx + r * Math.cos(angle),
            y: cy + r * Math.sin(angle)
        };
    });

    return (
        <div className="w-full h-full relative overflow-hidden" style={{ minHeight: 400 }}>
            <svg width="100%" height="100%" viewBox="0 0 640 440" className="absolute inset-0">
                {/* Edges */}
                {edges.map(edge => {
                    const from = positions[edge.source];
                    const to = positions[edge.target];
                    if (!from || !to) return null;
                    const mx = (from.x + to.x) / 2;
                    const my = (from.y + to.y) / 2;
                    return (
                        <g key={edge.id}>
                            <line
                                x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                                stroke="rgba(249,115,22,0.4)" strokeWidth="1.5"
                                strokeDasharray="4 4"
                            />
                            {edge.label && (
                                <text x={mx} y={my - 6} fill="rgba(234,88,12,0.7)" fontSize="9" textAnchor="middle">
                                    {edge.label}
                                </text>
                            )}
                        </g>
                    );
                })}
                {/* Nodes */}
                {nodes.map(node => {
                    const pos = positions[node.id];
                    if (!pos) return null;
                    const label = node.data.label || node.id;
                    return (
                        <g key={node.id}>
                            <rect
                                x={pos.x - 50} y={pos.y - 16}
                                width={100} height={32} rx={10}
                                fill="rgba(254,215,170,0.5)"
                                stroke="rgba(249,115,22,0.5)"
                                strokeWidth="1"
                            />
                            <text
                                x={pos.x} y={pos.y + 4}
                                fill="#ea580c" fontSize="11"
                                textAnchor="middle"
                                fontWeight="500"
                            >
                                {label.length > 14 ? label.slice(0, 13) + '…' : label}
                            </text>
                        </g>
                    );
                })}
            </svg>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════
// Dashboard Component
// ═══════════════════════════════════════════════════════════
export default function Dashboard({ data, externalChartRequest }: DashboardProps) {
    const initialTabs: ChartConfig[] = data.chart_configs?.length > 0
        ? data.chart_configs
        : (data.insights.suggested_charts || []).map(type => ({ type, title: type }));

    // Main tab state (Summary, Visualizations, Data Quality, Data Preview)
    const [mainTab, setMainTab] = useState<'summary' | 'visualizations' | 'quality' | 'preview'>('summary');
    
    const [chartTabs, setChartTabs] = useState<ChartConfig[]>(initialTabs);
    const [selectedIdx, setSelectedIdx] = useState(0);
    
    // Enhanced Dashboard State
    const [dashboardState, setDashboardState] = useState<DashboardState>({
        loading: false,
        chartTransitioning: false,
        error: null
    });

    // Knowledge Graph state
    const [graphNodes, setGraphNodes] = useState<GraphNode[]>([]);
    const [graphEdges, setGraphEdges] = useState<GraphEdge[]>([]);
    const [graphLoading, setGraphLoading] = useState(false);
    const [graphFetched, setGraphFetched] = useState(false);

    // Data Cleaner state
    const [currentData, setCurrentData] = useState<any[]>(data.original_data || []);

    // Ref to track the last processed request timestamp
    const lastProcessedTs = useRef(0);
    // Ref for scrolling chart area into view
    const chartAreaRef = useRef<HTMLDivElement>(null);

    // Auto-generate column config for a chart type from data introspection
    const autoConfigForType = (chartTypeName: string): ChartConfig => {
        const raw = data.original_data || [];
        const keys = raw.length > 0 ? Object.keys(raw[0]) : [];
        const numericCols = keys.filter(k => typeof raw[0]?.[k] === 'number');
        const categoricalCols = keys.filter(k => typeof raw[0]?.[k] === 'string');
        const type = chartTypeName.toLowerCase();

        if (type.includes('bar')) {
            return { type: chartTypeName, title: chartTypeName, x_key: categoricalCols[0] || keys[0], y_keys: numericCols.slice(0, 3) };
        }
        if (type.includes('line') || type.includes('area') || type.includes('trend')) {
            return { type: chartTypeName, title: chartTypeName, x_key: categoricalCols[0] || keys[0], y_keys: numericCols.slice(0, 3) };
        }
        if (type.includes('pie')) {
            return { type: chartTypeName, title: chartTypeName, label_key: categoricalCols[0] || keys[0], value_key: numericCols[0] || keys[1] };
        }
        if (type.includes('scatter') || type.includes('plot')) {
            return { type: chartTypeName, title: chartTypeName, x_key: numericCols[0] || keys[0], y_key: numericCols[1] || numericCols[0] || keys[1], tooltip_key: categoricalCols[0] };
        }
        return { type: chartTypeName, title: chartTypeName };
    };

    // Handle chart tab selection with loading state
    const handleChartSelection = (idx: number) => {
        if (idx === selectedIdx || dashboardState.chartTransitioning) return;
        
        setDashboardState(prev => ({ ...prev, chartTransitioning: true }));
        setTimeout(() => {
            setSelectedIdx(idx);
            setDashboardState(prev => ({ ...prev, chartTransitioning: false }));
        }, 200);
    };
    useEffect(() => {
        if (!externalChartRequest) return;
        if (externalChartRequest.ts <= lastProcessedTs.current) return; // already processed
        lastProcessedTs.current = externalChartRequest.ts;

        const incoming = externalChartRequest.type.trim();

        // Use functional update to access current chartTabs (avoids stale closure)
        setChartTabs(prevTabs => {
            const existsAt = prevTabs.findIndex(
                t => t.type.toLowerCase() === incoming.toLowerCase()
            );

            if (existsAt >= 0) {
                // Tab exists — switch with loading state
                setDashboardState(prev => ({ ...prev, chartTransitioning: true }));
                setTimeout(() => {
                    setSelectedIdx(existsAt);
                    chartAreaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    setDashboardState(prev => ({ ...prev, chartTransitioning: false }));
                }, 300);
                return prevTabs; // no change
            } else {
                // New tab — add with loading animation
                const newConfig = autoConfigForType(incoming);
                const updated = [...prevTabs, newConfig];
                setDashboardState(prev => ({ ...prev, chartTransitioning: true }));
                setTimeout(() => {
                    setSelectedIdx(updated.length - 1);
                    chartAreaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    setDashboardState(prev => ({ ...prev, chartTransitioning: false }));
                }, 300);
                return updated;
            }
        });
    }, [externalChartRequest]);

    const selectedConfig = chartTabs[selectedIdx] || chartTabs[0];
    const chartType = selectedConfig?.type?.toLowerCase() || '';

    const rawRows = useMemo(() => prepareRows(data.original_data || []), [data.original_data]);


    // Fetch Knowledge Graph once when needed
    useEffect(() => {
        const isGraph = chartType.includes('graph') || chartType.includes('network') || chartType.includes('knowledge');
        if (isGraph && !graphFetched && !graphLoading) {
            setGraphLoading(true);
            axios.post('http://localhost:8000/api/graph', { content_summary: data.content_summary })
                .then(res => {
                    const nodes = res.data?.nodes || [];
                    const edges = res.data?.edges || [];
                    setGraphNodes(nodes);
                    setGraphEdges(edges);
                })
                .catch(err => {
                    console.error('Graph API error:', err);
                    setGraphNodes([]);
                    setGraphEdges([]);
                })
                .finally(() => {
                    setGraphLoading(false);
                    setGraphFetched(true);
                });
        }
    }, [chartType, graphFetched]);

    const getIcon = (type: string, size = 16) => {
        const t = type.toLowerCase();
        if (t.includes('pie')) return <PieChartIcon size={size} />;
        if (t.includes('bar')) return <BarChart2 size={size} />;
        if (t.includes('line') || t.includes('trend') || t.includes('area')) return <TrendingUp size={size} />;
        if (t.includes('scatter') || t.includes('plot')) return <Activity size={size} />;
        if (t.includes('map') || t.includes('geo')) return <MapIcon size={size} />;
        if (t.includes('graph') || t.includes('network') || t.includes('knowledge')) return <Network size={size} />;
        return <Activity size={size} />;
    };

    // ─── CHART RENDERER ──────────────────────────────────────
    const renderChart = () => {
        const cfg = selectedConfig;
        if (!cfg) return null;
        const type = cfg.type.toLowerCase();

        // Bar Chart
        if (type.includes('bar')) {
            const xKey = cfg.x_key;
            const yKeys = cfg.y_keys || [];
            if (!xKey || yKeys.length === 0) return <NoColumnWarning />;
            return (
                <ResponsiveContainer width="100%" height={360}>
                    <BarChart data={rawRows} margin={{ top: 16, right: 24, left: 0, bottom: 40 }} barGap={4}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
                        <XAxis dataKey={xKey} {...axisStyle} angle={-30} textAnchor="end" interval="preserveStartEnd" />
                        <YAxis {...axisStyle} />
                        <Tooltip {...tooltipStyle} />
                        <Legend wrapperStyle={{ color: '#64748b', fontSize: 12, paddingTop: 8 }} />
                        {yKeys.map((key, i) => (
                            <Bar key={key} dataKey={key} fill={COLORS[i % COLORS.length]} radius={[4, 4, 0, 0]} maxBarSize={48} />
                        ))}
                    </BarChart>
                </ResponsiveContainer>
            );
        }

        // Line / Area Chart
        if (type.includes('line') || type.includes('area') || type.includes('trend')) {
            const xKey = cfg.x_key;
            const yKeys = cfg.y_keys || [];
            if (!xKey || yKeys.length === 0) return <NoColumnWarning />;
            return (
                <ResponsiveContainer width="100%" height={360}>
                    <AreaChart data={rawRows} margin={{ top: 16, right: 24, left: 0, bottom: 40 }}>
                        <defs>
                            {yKeys.map((key, i) => (
                                <linearGradient key={key} id={`grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={COLORS[i]} stopOpacity={0.6} />
                                    <stop offset="95%" stopColor={COLORS[i]} stopOpacity={0} />
                                </linearGradient>
                            ))}
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
                        <XAxis dataKey={xKey} {...axisStyle} angle={-30} textAnchor="end" interval="preserveStartEnd" />
                        <YAxis {...axisStyle} />
                        <Tooltip {...tooltipStyle} />
                        <Legend wrapperStyle={{ color: '#64748b', fontSize: 12, paddingTop: 8 }} />
                        {yKeys.map((key, i) => (
                            <Area key={key} type="monotone" dataKey={key} stroke={COLORS[i]} strokeWidth={2} fillOpacity={1} fill={`url(#grad-${i})`} />
                        ))}
                    </AreaChart>
                </ResponsiveContainer>
            );
        }

        // Pie Chart
        if (type.includes('pie')) {
            const labelKey = cfg.label_key;
            const valueKey = cfg.value_key;
            if (!labelKey || !valueKey) return <NoColumnWarning />;

            const grouped: Record<string, number> = {};
            for (const row of rawRows) {
                const k = String(row[labelKey] ?? 'Unknown').slice(0, 24);
                grouped[k] = (grouped[k] || 0) + (Number(row[valueKey]) || 0);
            }
            const pieData = Object.entries(grouped)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10)
                .map(([name, value]) => ({ name, value }));

            return (
                <ResponsiveContainer width="100%" height={360}>
                    <PieChart>
                        <Pie
                            data={pieData}
                            cx="50%" cy="50%"
                            innerRadius="30%" outerRadius="60%"
                            paddingAngle={3}
                            dataKey="value"
                            nameKey="name"
                            stroke="none"
                        >
                            {pieData.map((_, i) => (
                                <Cell key={i} fill={COLORS[i % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip {...tooltipStyle} formatter={(v: any) => v.toLocaleString()} />
                        <Legend wrapperStyle={{ color: '#64748b', fontSize: 12 }} />
                    </PieChart>
                </ResponsiveContainer>
            );
        }

        // Scatter Plot
        if (type.includes('scatter') || type.includes('plot')) {
            const xKey = cfg.x_key;
            const yKey = cfg.y_key || cfg.y_keys?.[0];
            if (!xKey || !yKey) return <NoColumnWarning />;
            return (
                <ResponsiveContainer width="100%" height={360}>
                    <ScatterChart margin={{ top: 16, right: 24, bottom: 40, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                        <XAxis type={typeof rawRows[0]?.[xKey] === 'number' ? 'number' : 'category'} dataKey={xKey} name={xKey} {...axisStyle} />
                        <YAxis type="number" dataKey={yKey} name={yKey} {...axisStyle} />
                        {cfg.tooltip_key && <ZAxis dataKey={cfg.tooltip_key} range={[40, 280]} />}
                        <Tooltip cursor={{ strokeDasharray: '3 3' }} {...tooltipStyle} />
                        <Scatter name="Data Points" data={rawRows} fill="#ec4899" fillOpacity={0.75} />
                    </ScatterChart>
                </ResponsiveContainer>
            );
        }

        // Map
        if (type.includes('map') || type.includes('geo')) {
            return (
                <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-slate-500">
                    <MapIcon size={56} className="opacity-40" />
                    <p className="text-base">Geographic Map</p>
                    <p className="text-sm text-slate-500">Requires GeoJSON location data</p>
                </div>
            );
        }

        // Knowledge Graph — SVG based (no ReactFlow)
        if (type.includes('graph') || type.includes('network') || type.includes('knowledge')) {
            if (graphLoading) return (
                <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-slate-500">
                    <Loader2 size={48} className="animate-spin text-orange-400" />
                    <p className="text-sm">AI is generating the Knowledge Graph…</p>
                </div>
            );
            if (graphNodes.length === 0) return (
                <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-slate-500">
                    <Network size={56} className="opacity-40" />
                    <p className="text-sm">No graph data could be extracted from this file.</p>
                    <p className="text-xs text-slate-500">Works best with text-rich or relational data.</p>
                </div>
            );
            return <SimpleKnowledgeGraph nodes={graphNodes} edges={graphEdges} />;
        }

        // Fallback: generic bar chart with detected columns
        const keys = Object.keys(rawRows[0] || {});
        const numCols = keys.filter(k => typeof rawRows[0][k] === 'number');
        const catCols = keys.filter(k => typeof rawRows[0][k] === 'string');
        const xKey = catCols[0] || keys[0];
        if (numCols.length === 0) return <NoColumnWarning />;
        return (
            <ResponsiveContainer width="100%" height={360}>
                <BarChart data={rawRows} margin={{ top: 16, right: 24, left: 0, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
                    <XAxis dataKey={xKey} {...axisStyle} angle={-30} textAnchor="end" interval="preserveStartEnd" />
                    <YAxis {...axisStyle} />
                    <Tooltip {...tooltipStyle} />
                    <Legend wrapperStyle={{ color: '#64748b', fontSize: 12, paddingTop: 8 }} />
                    {numCols.slice(0, 3).map((key, i) => (
                        <Bar key={key} dataKey={key} fill={COLORS[i]} radius={[4, 4, 0, 0]} maxBarSize={48} />
                    ))}
                </BarChart>
            </ResponsiveContainer>
        );
    };

    return (
        <div className="relative flex flex-col h-full overflow-hidden rounded-3xl border border-slate-200/70 bg-gradient-to-b from-orange-50/40 via-amber-50/30 to-white">
            <div className="pointer-events-none absolute -top-16 -right-14 h-52 w-52 rounded-full bg-orange-300/25 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-12 -left-8 h-44 w-44 rounded-full bg-sky-300/20 blur-3xl" />

            {/* MAIN TABS */}
            <div className="relative z-10 border-b border-slate-200/50 bg-white/60 backdrop-blur-sm sticky top-0">
                <div className="flex items-center gap-0">
                    {[
                        { id: 'summary', label: 'Summary', icon: Sparkles },
                        { id: 'visualizations', label: 'Visualizations', icon: BarChart2 },
                        { id: 'quality', label: 'Data Quality', icon: AlertCircle },
                        { id: 'preview', label: 'Data', icon: TableIcon }
                    ].map(tab => {
                        const isActive = mainTab === tab.id;
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setMainTab(tab.id as typeof mainTab)}
                                className={`relative px-4 py-3 flex items-center gap-2 text-sm font-medium transition-all duration-200 whitespace-nowrap flex-1 lg:flex-none ${
                                    isActive
                                        ? 'text-orange-600 bg-orange-50'
                                        : 'text-slate-600 hover:text-orange-500'
                                }`}
                            >
                                <Icon size={16} />
                                <span className="hidden sm:inline">{tab.label}</span>
                                {isActive && (
                                    <motion.div
                                        layoutId="tab-underline"
                                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-orange-500 to-amber-500"
                                    />
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* TAB CONTENT */}
            <div className="relative z-10 flex-1 overflow-y-auto p-4 md:p-6 scrollbar-hide">
                <AnimatePresence mode="wait">
                    {/* SUMMARY TAB */}
                    {mainTab === 'summary' && (
                        <motion.div
                            key="summary"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                            className="space-y-4"
                        >
                            <div className="rounded-2xl border border-orange-200/60 bg-white/95 p-5 shadow-sm">
                                <div className="flex items-start gap-3 mb-4">
                                    <Sparkles size={20} className="text-orange-500 flex-shrink-0 mt-0.5" />
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-slate-900">AI Summary</h3>
                                        <p className="text-xs text-slate-500 mt-0.5">Insights powered by AI</p>
                                    </div>
                                </div>
                                <p className="text-sm text-slate-700 leading-relaxed">{data.insights.summary}</p>
                            </div>

                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                <MetricCard label="Rows" value={prepareRows(data.original_data || []).length.toLocaleString()} />
                                <MetricCard label="Columns" value={(Object.keys(data.original_data?.[0] || {}) || []).length.toString()} />
                                <MetricCard label="Numeric" value={Object.keys(data.original_data?.[0] || {}).filter(k => typeof data.original_data?.[0]?.[k] === 'number').length.toString()} />
                                <MetricCard label="Charts" value={chartTabs.length.toString()} />
                            </div>
                        </motion.div>
                    )}

                    {/* VISUALIZATIONS TAB */}
                    {mainTab === 'visualizations' && (
                        <motion.div
                            key="visualizations"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                            className="space-y-4"
                        >
                            {/* Chart Tabs */}
                            <div className="flex flex-wrap gap-2 pb-3 overflow-x-auto scrollbar-hide">
                                {chartTabs.map((cfg, idx) => {
                                    const isActive = idx === selectedIdx;
                                    const isNew = idx >= (data.chart_configs?.length || initialTabs.length);
                                    return (
                                        <motion.button
                                            key={`${cfg.type}-${idx}`}
                                            whileHover={{ y: -1 }}
                                            whileTap={{ scale: 0.97 }}
                                            onClick={() => handleChartSelection(idx)}
                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 flex-shrink-0 ${isActive
                                                ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md'
                                                : 'bg-white/80 text-slate-600 border border-slate-200 hover:border-orange-300'
                                                }`}
                                        >
                                            {getIcon(cfg.type, 14)}
                                            <span>{cfg.title || cfg.type}</span>
                                            {isNew && <span className="text-[9px] bg-red-500 px-1 rounded text-white">NEW</span>}
                                        </motion.button>
                                    );
                                })}
                            </div>

                            {/* Chart Display */}
                            <div className="rounded-2xl border border-slate-200 bg-white/95 p-4 overflow-auto" style={{ height: 'calc(100vh - 350px)', maxHeight: 500 }}>
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={`${selectedIdx}-${selectedConfig?.type}`}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.15 }}
                                        className="w-full h-full"
                                    >
                                        {renderChart()}
                                    </motion.div>
                                </AnimatePresence>
                                {dashboardState.chartTransitioning && (
                                    <div className="absolute inset-0 bg-white/50 flex items-center justify-center rounded-2xl">
                                        <Loader2 size={20} className="animate-spin text-orange-500" />
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}

                    {/* DATA QUALITY TAB */}
                    {mainTab === 'quality' && (
                        <motion.div
                            key="quality"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                        >
                            <DataCleaner
                                data={currentData}
                                onCleaningComplete={(cleanedData) => {
                                    setCurrentData(cleanedData);
                                }}
                            />
                        </motion.div>
                    )}

                    {/* DATA PREVIEW TAB */}
                    {mainTab === 'preview' && (
                        <motion.div
                            key="preview"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                            className="space-y-3"
                        >
                            <div className="rounded-2xl border border-slate-200 bg-white/95 overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead className="bg-slate-50 sticky top-0">
                                            <tr>
                                                {Object.keys(currentData[0] || {}).map(col => (
                                                    <th key={col} className="px-3 py-2 text-left text-xs font-semibold text-slate-700 whitesp ace-nowrap">
                                                        {col}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {currentData.slice(0, 20).map((row, i) => (
                                                <tr key={i} className="hover:bg-orange-50/30">
                                                    {Object.values(row).map((val: any, j) => (
                                                        <td key={j} className="px-3 py-2 text-xs text-slate-700 max-w-[200px] truncate">
                                                            {typeof val === 'number' ? val.toFixed(2) : String(val).slice(0, 50)}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            <p className="text-xs text-slate-500 text-center">Showing {Math.min(20, currentData.length)} of {currentData.length} rows</p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}

function MetricCard({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 px-3 py-2.5">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">{label}</p>
            <p className="text-lg font-semibold text-slate-800 leading-tight">{value}</p>
        </div>
    );
}

function NoColumnWarning() {
    return (
        <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 gap-2">
            <Info size={40} className="opacity-40" />
            <p className="text-sm">AI chart config is missing column mappings for this chart type.</p>
            <p className="text-xs text-slate-500">This may happen if the file lacks matching numeric or categorical columns.</p>
        </div>
    );
}
