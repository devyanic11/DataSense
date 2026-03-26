import { useState, useEffect } from 'react';
import { Save, Loader2, Trash2, Download, Plus, Calendar, RotateCcw } from 'lucide-react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import type { InsightData } from '../App';

interface SavedDashboard {
    id: string;
    name: string;
    filename: string;
    created_at: string;
    updated_at: string;
}

interface DashboardManagerProps {
    insightData: InsightData | null;
    onDashboardLoaded?: (data: InsightData) => void;
}

export default function DashboardManager({ insightData, onDashboardLoaded }: DashboardManagerProps) {
    const [showSaveDialog, setShowSaveDialog] = useState(false);
    const [dashboardName, setDashboardName] = useState('');
    const [savedDashboards, setSavedDashboards] = useState<SavedDashboard[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [expandedDashboardId, setExpandedDashboardId] = useState<string | null>(null);

    useEffect(() => {
        loadDashboards();
    }, []);

    const loadDashboards = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await axios.get('http://localhost:8000/api/dashboards');
            setSavedDashboards(response.data.dashboards || []);
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to load dashboards');
        } finally {
            setLoading(false);
        }
    };

    const saveDashboard = async () => {
        if (!insightData || !dashboardName.trim()) {
            setError('Dashboard name is required');
            return;
        }

        setSaving(true);
        setError(null);

        try {
            await axios.post('http://localhost:8000/api/save-dashboard', {
                dashboard_name: dashboardName,
                filename: insightData.filename,
                insights_summary: insightData.insights.summary,
                chart_configs: insightData.chart_configs,
                original_data: insightData.original_data,
                column_metadata: insightData.column_meta,
                content_summary: insightData.content_summary
            });

            setDashboardName('');
            setShowSaveDialog(false);
            await loadDashboards();
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to save dashboard');
        } finally {
            setSaving(false);
        }
    };

    const loadDashByID = async (id: string) => {
        setLoading(true);
        setError(null);
        try {
            const response = await axios.get(`http://localhost:8000/api/dashboard/${id}`);
            if (onDashboardLoaded) {
                onDashboardLoaded({
                    file_id: response.data.file_id,
                    filename: response.data.filename,
                    content_summary: response.data.content_summary,
                    original_data: response.data.original_data,
                    insights: response.data.insights,
                    chart_configs: response.data.chart_configs,
                    column_meta: response.data.column_meta
                });
            }
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to load dashboard');
        } finally {
            setLoading(false);
        }
    };

    const deleteDash = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this dashboard?')) return;

        try {
            await axios.delete(`http://localhost:8000/api/dashboard/${id}`);
            await loadDashboards();
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to delete dashboard');
        }
    };

    const formatDate = (dateStr: string) => {
        try {
            return new Date(dateStr).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return dateStr;
        }
    };

    return (
        <div className="flex flex-col h-full bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl">
            {/* Header */}
            <div className="flex-shrink-0 px-3 py-3 border-b border-indigo-200">
                <h3 className="text-sm font-semibold text-indigo-900 flex items-center gap-2">
                    <Download size={16} className="text-indigo-600" />
                    Saved Dashboards
                </h3>
                <p className="text-xs text-indigo-700 mt-0.5">Restore your analyses</p>
            </div>

            {/* Error Message */}
            {error && (
                <div className="flex-shrink-0 mx-3 mt-2 p-2 bg-red-100 border border-red-300 rounded text-xs text-red-700 flex justify-between items-center">
                    <span>{error}</span>
                    <button
                        onClick={() => setError(null)}
                        className="text-red-500 hover:text-red-700 ml-2"
                    >
                        ✕
                    </button>
                </div>
            )}

            {/* Save Dialog */}
            <AnimatePresence>
                {showSaveDialog && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex-shrink-0 mx-3 mt-2 p-2.5 bg-white rounded border border-indigo-200">
                        <label className="block text-xs font-medium text-indigo-900 mb-1.5">
                            Dashboard Name
                        </label>
                        <div className="flex flex-col gap-2">
                            <input
                                type="text"
                                value={dashboardName}
                                onChange={e => setDashboardName(e.target.value)}
                                placeholder="e.g., Q1 Analysis"
                                className="w-full px-2 py-1.5 border border-indigo-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                onKeyDown={e => e.key === 'Enter' && saveDashboard()}
                            />
                            <div className="flex gap-2">
                                <button
                                    disabled={saving}
                                    onClick={saveDashboard}
                                    className="flex-1 px-3 py-1.5 rounded text-xs font-semibold bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 transition-all flex items-center justify-center gap-1"
                                >
                                    {saving ? (
                                        <Loader2 size={12} className="animate-spin" />
                                    ) : (
                                        <Plus size={12} />
                                    )}
                                    Save
                                </button>
                                <button
                                    onClick={() => setShowSaveDialog(false)}
                                    className="flex-1 px-3 py-1.5 rounded text-xs font-semibold border border-indigo-300 text-indigo-700 hover:bg-indigo-100"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Save Button */}
            {insightData && !showSaveDialog && (
                <motion.button
                    whileHover={{ y: -1 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowSaveDialog(true)}
                    className="flex-shrink-0 mx-3 mt-2 flex items-center justify-center gap-2 px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-all"
                >
                    <Save size={14} />
                    Save Current
                </motion.button>
            )}

            {/* Saved Dashboards List - Scrollable */}
            <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5 scrollbar-hide">
                {loading && !savedDashboards.length ? (
                    <div className="text-center py-4 text-indigo-600">
                        <Loader2 size={18} className="animate-spin mx-auto mb-1" />
                        <p className="text-xs">Loading...</p>
                    </div>
                ) : savedDashboards.length === 0 ? (
                    <div className="text-center py-4">
                        <p className="text-indigo-700 text-xs">No saved dashboards</p>
                        <p className="text-indigo-600 text-[10px] mt-0.5">Save your analysis to access later</p>
                    </div>
                ) : (
                    <AnimatePresence>
                        {savedDashboards.map((dash, idx) => (
                            <motion.div
                                key={dash.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                transition={{ delay: idx * 0.05 }}
                                className="bg-white rounded border border-indigo-200 p-2 hover:border-indigo-400 transition-all"
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div
                                        className="flex-1 cursor-pointer min-w-0"
                                        onClick={() => setExpandedDashboardId(expandedDashboardId === dash.id ? null : dash.id)}
                                    >
                                        <p className="font-semibold text-indigo-900 text-xs truncate">{dash.name}</p>
                                        <div className="flex items-center gap-1 text-[10px] text-indigo-600 mt-0.5">
                                            <Calendar size={10} />
                                            {formatDate(dash.created_at)}
                                        </div>
                                        <p className="text-[10px] text-indigo-700 mt-0.5 truncate">{dash.filename}</p>
                                    </div>
                                    <div className="flex gap-0.5 flex-shrink-0">
                                        <button
                                            onClick={() => loadDashByID(dash.id)}
                                            disabled={loading}
                                            className="p-1 rounded bg-indigo-100 hover:bg-indigo-200 text-indigo-700 disabled:opacity-50 transition-all"
                                            title="Load"
                                        >
                                            <RotateCcw size={12} />
                                        </button>
                                        <button
                                            onClick={() => deleteDash(dash.id)}
                                            className="p-1 rounded bg-red-100 hover:bg-red-200 text-red-700 transition-all"
                                            title="Delete"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                )}
            </div>

            {/* Refresh Button - Fixed at bottom */}
            {savedDashboards.length > 0 && (
                <button
                    onClick={loadDashboards}
                    disabled={loading}
                    className="flex-shrink-0 mx-3 mb-2 text-xs py-1 px-2 rounded border border-indigo-300 text-indigo-700 hover:bg-indigo-100 disabled:opacity-50 flex items-center justify-center gap-1 transition-all"
                >
                    <RotateCcw size={12} className={loading ? 'animate-spin' : ''} />
                    Refresh
                </button>
            )}
        </div>
    );
}
