import { useState } from 'react';
import { AlertTriangle, CheckCircle, X, Loader2, RotateCw, Zap } from 'lucide-react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';

interface DataQualityIssue {
    type: string;
    column: string;
    severity: 'low' | 'medium' | 'high';
    count: number;
    percentage: number;
    suggestion: string;
    fixable: boolean;
}

interface QualityReport {
    summary: string;
    total_rows: number;
    total_columns: number;
    issues: DataQualityIssue[];
}

interface DataCleanerProps {
    data: any[];
    onCleaningComplete?: (cleanedData: any[], report: any) => void;
}

export default function DataCleaner({ data, onCleaningComplete }: DataCleanerProps) {
    const [loading, setLoading] = useState(false);
    const [qualityReport, setQualityReport] = useState<QualityReport | null>(null);
    const [selectedIssues, setSelectedIssues] = useState<Set<number>>(new Set());
    const [cleaningLoading, setCleaningLoading] = useState(false);
    const [cleaningResult, setCleaningResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    const analyzeQuality = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await axios.post('http://localhost:8000/api/analyze-quality', {
                original_data: data
            });
            setQualityReport(response.data.quality_report);
            setSelectedIssues(new Set());
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to analyze data quality');
        } finally {
            setLoading(false);
        }
    };

    const toggleIssueSelection = (idx: number) => {
        const newSet = new Set(selectedIssues);
        if (newSet.has(idx)) {
            newSet.delete(idx);
        } else {
            newSet.add(idx);
        }
        setSelectedIssues(newSet);
    };

    const generateCleaningSteps = (): any[] => {
        if (!qualityReport) return [];
        
        const steps: any[] = [];
        qualityReport.issues.forEach((issue, idx) => {
            if (!selectedIssues.has(idx)) return;

            if (issue.type === 'missing_values' && issue.column !== 'entire_row') {
                steps.push({
                    operation: 'fill_missing',
                    column: issue.column,
                    method: 'median'
                });
            } else if (issue.type === 'duplicates') {
                steps.push({ operation: 'remove_duplicates' });
            } else if (issue.type === 'outliers') {
                steps.push({
                    operation: 'remove_outliers',
                    column: issue.column
                });
            } else if (issue.type === 'datatype') {
                steps.push({
                    operation: 'convert_dtype',
                    column: issue.column,
                    target_type: 'numeric'
                });
            }
        });

        return steps;
    };

    const applySelectedCleaning = async () => {
        if (selectedIssues.size === 0) {
            setError('Select at least one issue to fix');
            return;
        }

        setCleaningLoading(true);
        setError(null);
        try {
            const cleaningSteps = generateCleaningSteps();
            const response = await axios.post('http://localhost:8000/api/apply-cleaning', {
                original_data: data,
                cleaning_steps: cleaningSteps
            });
            setCleaningResult(response.data);
            if (onCleaningComplete) {
                onCleaningComplete(response.data.cleaned_data, response.data.cleaning_report);
            }
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Cleaning failed');
        } finally {
            setCleaningLoading(false);
        }
    };

    const selectAll = () => {
        if (!qualityReport) return;
        const fixableIndices = new Set<number>();
        qualityReport.issues.forEach((issue, idx) => {
            if (issue.fixable) fixableIndices.add(idx);
        });
        setSelectedIssues(fixableIndices);
    };

    const clearAll = () => {
        setSelectedIssues(new Set());
    };

    if (!qualityReport && !cleaningResult) {
        return (
            <div className="p-6 bg-blue-50 border border-blue-200 rounded-2xl">
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <h3 className="text-lg font-semibold text-blue-900 flex items-center gap-2">
                            <Zap size={20} className="text-blue-600" />
                            Data Quality Checker
                        </h3>
                        <p className="text-sm text-blue-700 mt-1">Detect and fix data issues automatically</p>
                    </div>
                </div>

                <button
                    disabled={loading}
                    onClick={analyzeQuality}
                    className="px-4 py-2 rounded-lg font-semibold transition-all bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
                >
                    {loading ? (
                        <>
                            <Loader2 size={16} className="inline animate-spin mr-2" />
                            Analyzing...
                        </>
                    ) : (
                        'Scan for Issues'
                    )}
                </button>
            </div>
        );
    }

    if (cleaningResult) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-6 bg-green-50 border border-green-200 rounded-2xl"
            >
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <h3 className="text-lg font-semibold text-green-900 flex items-center gap-2">
                            <CheckCircle size={20} className="text-green-600" />
                            Cleaning Complete
                        </h3>
                    </div>
                    <button
                        onClick={() => {
                            setCleaningResult(null);
                            setQualityReport(null);
                        }}
                        className="text-green-600 hover:text-green-800"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-4 text-sm">
                    <div className="bg-white p-3 rounded-lg border border-green-200">
                        <p className="text-green-600 font-semibold">{cleaningResult.original_rows}</p>
                        <p className="text-green-700 text-xs">Original rows</p>
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-green-200">
                        <p className="text-green-600 font-semibold">{cleaningResult.cleaned_rows}</p>
                        <p className="text-green-700 text-xs">Cleaned rows</p>
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-green-200">
                        <p className="text-green-600 font-semibold">{cleaningResult.original_rows - cleaningResult.cleaned_rows}</p>
                        <p className="text-green-700 text-xs">Rows removed</p>
                    </div>
                </div>

                <div className="text-sm text-green-700 space-y-1">
                    <p className="font-semibold">Operations applied:</p>
                    {cleaningResult.cleaning_report.operations_applied.map((op: string, idx: number) => (
                        <p key={idx} className="flex items-center gap-2">
                            <CheckCircle size={14} />
                            {op}
                        </p>
                    ))}
                </div>

                <button
                    onClick={() => {
                        setCleaningResult(null);
                        setQualityReport(null);
                        setSelectedIssues(new Set());
                    }}
                    className="mt-4 px-4 py-2 rounded-lg font-semibold bg-green-600 hover:bg-green-700 text-white"
                >
                    Scan Again
                </button>
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 bg-amber-50 border border-amber-200 rounded-2xl"
        >
            <div className="mb-4">
                <h3 className="text-lg font-semibold text-amber-900 flex items-center gap-2">
                    <AlertTriangle size={20} className="text-amber-600" />
                    {qualityReport?.summary}
                </h3>
                <p className="text-sm text-amber-700 mt-1">
                    {qualityReport?.total_rows} rows × {qualityReport?.total_columns} columns
                </p>
            </div>

            {error && (
                <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded-lg text-sm text-red-700">
                    {error}
                </div>
            )}

            {qualityReport && qualityReport.issues.length === 0 ? (
                <div className="text-center py-6">
                    <CheckCircle size={40} className="mx-auto text-green-600 mb-2" />
                    <p className="text-green-700 font-semibold">Data quality looks good!</p>
                </div>
            ) : (
                <>
                    <div className="space-y-2 mb-4 max-h-96 overflow-y-auto">
                        <AnimatePresence>
                            {qualityReport?.issues.map((issue, idx) => (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -10 }}
                                    className="flex items-start gap-3 p-3 bg-white rounded-lg border border-amber-200 cursor-pointer hover:bg-amber-100/50 transition"
                                    onClick={() => toggleIssueSelection(idx)}
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedIssues.has(idx)}
                                        onChange={() => { }}
                                        className="mt-1"
                                        disabled={!issue.fixable}
                                    />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="font-medium text-amber-900">
                                                {issue.type.replace(/_/g, ' ').toUpperCase()}
                                            </p>
                                            {issue.column && issue.column !== 'entire_row' && (
                                                <span className="text-xs bg-amber-200 text-amber-800 px-2 py-0.5 rounded">
                                                    {issue.column}
                                                </span>
                                            )}
                                            <span className={`text-xs px-2 py-0.5 rounded font-semibold ${
                                                issue.severity === 'high'
                                                    ? 'bg-red-200 text-red-700'
                                                    : issue.severity === 'medium'
                                                    ? 'bg-yellow-200 text-yellow-700'
                                                    : 'bg-blue-200 text-blue-700'
                                            }`}>
                                                {issue.severity.toUpperCase()}
                                            </span>
                                        </div>
                                        <p className="text-sm text-amber-800 mt-1">
                                            {issue.count} affected ({issue.percentage}%)
                                        </p>
                                        <p className="text-xs text-amber-700 mt-1 italic">{issue.suggestion}</p>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>

                    <div className="flex gap-2 mb-4">
                        <button
                            onClick={selectAll}
                            className="text-sm px-3 py-1.5 rounded-lg border border-amber-300 text-amber-700 hover:bg-amber-100"
                        >
                            Select Fixable
                        </button>
                        <button
                            onClick={clearAll}
                            className="text-sm px-3 py-1.5 rounded-lg border border-amber-300 text-amber-700 hover:bg-amber-100"
                        >
                            Clear
                        </button>
                    </div>

                    <button
                        disabled={selectedIssues.size === 0 || cleaningLoading}
                        onClick={applySelectedCleaning}
                        className={`w-full py-2 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
                            selectedIssues.size === 0 || cleaningLoading
                                ? 'bg-amber-200 text-amber-500 cursor-not-allowed'
                                : 'bg-amber-600 hover:bg-amber-700 text-white'
                        }`}
                    >
                        {cleaningLoading ? (
                            <>
                                <Loader2 size={18} className="animate-spin" />
                                Cleaning...
                            </>
                        ) : (
                            <>
                                <RotateCw size={18} />
                                Apply Cleaning ({selectedIssues.size} selected)
                            </>
                        )}
                    </button>
                </>
            )}
        </motion.div>
    );
}
