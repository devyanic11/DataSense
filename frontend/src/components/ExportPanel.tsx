import { useState } from 'react';
import { Download, FileJson, FileText, Table, Loader2 } from 'lucide-react';
import axios from 'axios';
import { motion } from 'framer-motion';
import type { InsightData } from '../App';

interface ExportPanelProps {
    insightData: InsightData | null;
}

export default function ExportPanel({ insightData }: ExportPanelProps) {
    const [exporting, setExporting] = useState(false);
    const [exportFormat, setExportFormat] = useState<string | null>(null);

    if (!insightData) {
        return null;
    }

    const exportData = async (format: 'csv' | 'json' | 'xlsx') => {
        setExporting(true);
        setExportFormat(format);
        try {
            const response = await axios.post(
                'http://localhost:8000/api/export',
                {
                    data: insightData.original_data,
                    filename: insightData.filename,
                    format: format
                },
                { responseType: 'blob' }
            );

            const url = window.URL.createObjectURL(response.data);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${insightData.filename.split('.')[0]}_export.${format}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Export failed:', error);
            alert('Failed to export data');
        } finally {
            setExporting(false);
            setExportFormat(null);
        }
    };

    const exportSummary = async () => {
        setExporting(true);
        setExportFormat('summary');
        try {
            const response = await axios.post(
                'http://localhost:8000/api/export-summary',
                {
                    filename: insightData.filename,
                    insights_summary: insightData.insights.summary,
                    column_metadata: insightData.column_meta,
                    data_rows_count: insightData.original_data.length
                },
                { responseType: 'blob' }
            );

            const url = window.URL.createObjectURL(response.data);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${insightData.filename.split('.')[0]}_report.txt`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Summary export failed:', error);
            alert('Failed to export summary');
        } finally {
            setExporting(false);
            setExportFormat(null);
        }
    };

    const exportPDF = async () => {
        alert('PDF export coming soon! For now, use your browser\'s Print to PDF feature (Ctrl+P or Cmd+P)');
    };

    const exportPNG = async () => {
        alert('PNG export coming soon! For now, use your browser\'s screenshot feature or Print to PDF, then convert.');
    };

    return (
        <div className="flex flex-col h-full bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl">
            {/* Header */}
            <div className="flex-shrink-0 px-3 py-3 border-b border-emerald-200">
                <h3 className="text-sm font-semibold text-emerald-900 flex items-center gap-2">
                    <Download size={16} className="text-emerald-600" />
                    Export Data
                </h3>
            </div>

            {/* Content */}
            <div className="flex-1 px-3 py-3 space-y-3 overflow-y-auto scrollbar-hide">
                {/* Tabular Formats */}
                <div>
                    <p className="text-[11px] text-emerald-700 font-medium mb-1.5">Tabular Formats</p>
                    <div className="grid grid-cols-2 gap-1.5">
                        {[
                            { format: 'csv' as const, label: 'CSV', icon: Table },
                            { format: 'json' as const, label: 'JSON', icon: FileJson },
                            { format: 'xlsx' as const, label: 'Excel', icon: Table },
                        ].map(({ format, label, icon: Icon }) => (
                            <motion.button
                                key={format}
                                whileHover={{ y: -1 }}
                                whileTap={{ scale: 0.95 }}
                                disabled={exporting}
                                onClick={() => exportData(format)}
                                className={`flex items-center justify-center gap-1 px-2 py-1.5 rounded text-[11px] font-semibold transition-all ${
                                    exporting && exportFormat === format
                                        ? 'bg-emerald-600 text-white'
                                        : 'bg-white border border-emerald-300 text-emerald-700 hover:bg-emerald-100'
                                }`}
                            >
                                {exporting && exportFormat === format ? (
                                    <Loader2 size={12} className="animate-spin" />
                                ) : (
                                    <Icon size={12} />
                                )}
                                <span className="hidden sm:inline">{label}</span>
                            </motion.button>
                        ))}
                    </div>
                </div>

                {/* Reports */}
                <div className="border-t border-emerald-200 pt-2">
                    <p className="text-[11px] text-emerald-700 font-medium mb-1.5">Reports</p>
                    <motion.button
                        whileHover={{ y: -1 }}
                        whileTap={{ scale: 0.95 }}
                        disabled={exporting}
                        onClick={exportSummary}
                        className={`w-full flex items-center justify-center gap-1 px-2 py-1.5 rounded text-[11px] font-semibold transition-all ${
                            exporting && exportFormat === 'summary'
                                ? 'bg-emerald-600 text-white'
                                : 'bg-white border border-emerald-300 text-emerald-700 hover:bg-emerald-100'
                        }`}
                    >
                        {exporting && exportFormat === 'summary' ? (
                            <Loader2 size={12} className="animate-spin" />
                        ) : (
                            <FileText size={12} />
                        )}
                        Summary Report
                    </motion.button>
                </div>

                {/* Documents */}
                <div className="border-t border-emerald-200 pt-2">
                    <p className="text-[11px] text-emerald-700 font-medium mb-1.5">Documents</p>
                    <div className="grid grid-cols-2 gap-1.5">
                        <motion.button
                            whileHover={{ y: -1 }}
                            whileTap={{ scale: 0.95 }}
                            disabled={exporting}
                            onClick={exportPDF}
                            className="flex items-center justify-center gap-1 px-2 py-1.5 rounded text-[11px] font-semibold bg-white border border-emerald-300 text-emerald-700 hover:bg-emerald-100 transition-all disabled:opacity-50"
                        >
                            <FileText size={12} />
                            PDF
                        </motion.button>
                        <motion.button
                            whileHover={{ y: -1 }}
                            whileTap={{ scale: 0.95 }}
                            disabled={exporting}
                            onClick={exportPNG}
                            className="flex items-center justify-center gap-1 px-2 py-1.5 rounded text-[11px] font-semibold bg-white border border-emerald-300 text-emerald-700 hover:bg-emerald-100 transition-all disabled:opacity-50"
                        >
                            <Download size={12} />
                            PNG
                        </motion.button>
                    </div>
                </div>

                <p className="text-[10px] text-emerald-600 text-center mt-2">
                    💡 Use Ctrl+P for PDF
                </p>
            </div>
        </div>
    );
}
