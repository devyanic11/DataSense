import React, { useState, useRef, useEffect } from 'react';
import { UploadCloud, FileType, CheckCircle, AlertCircle, Loader2, X, Eye } from 'lucide-react';
import axios from 'axios';
import type { InsightData } from '../App';
import { motion, AnimatePresence } from 'framer-motion';

interface FileUploadProps {
    onSuccess: (data: InsightData) => void;
}

interface FileWithContent {
    file: File;
    content?: ArrayBuffer;
}

interface PreviewData {
    files: any[];
    common_columns: string[];
    merge_preview: {
        type: string;
        estimated_rows: number;
        estimated_columns: string[];
        preview_rows: any[];
    };
}

export default function FileUpload({ onSuccess }: FileUploadProps) {
    const [dragActive, setDragActive] = useState(false);
    const [files, setFiles] = useState<FileWithContent[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingText, setLoadingText] = useState("Analyzing Data...");
    const [previewLoading, setPreviewLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [mergeType, setMergeType] = useState<'union' | 'join' | 'intersect'>('union');
    const [preview, setPreview] = useState<PreviewData | null>(null);
    const [showPreview, setShowPreview] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!loading) return;
        const texts = [
            "Parsing file structure...",
            "Extracting schema and column metadata...",
            "AI is mapping relations...",
            "Generating optimized visual configurations...",
            "Finalizing your interactive dashboard..."
        ];
        let i = 0;
        setLoadingText(texts[0]);
        const interval = setInterval(() => {
            i = (i + 1) % texts.length;
            setLoadingText(texts[i]);
        }, 3000);
        return () => clearInterval(interval);
    }, [loading]);

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFiles(Array.from(e.dataTransfer.files));
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        e.preventDefault();
        if (e.target.files && e.target.files.length > 0) {
            handleFiles(Array.from(e.target.files));
        }
    };

    const handleFiles = (selectedFiles: File[]) => {
        const validFiles = selectedFiles.filter(f => {
            const ext = f.name.toLowerCase();
            return ext.endsWith('.csv') || ext.endsWith('.xlsx') || ext.endsWith('.xls') || 
                   ext.endsWith('.json') || ext.endsWith('.pdf');
        });

        if (validFiles.length === 0) {
            setError("Invalid file format. Supported: CSV, XLSX, JSON, PDF");
            return;
        }

        setFiles(prev => [...prev, ...validFiles.map(f => ({ file: f }))]);
        setError(null);
        setPreview(null);
    };

    const removeFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
        setPreview(null);
    };

    const handlePreview = async () => {
        if (files.length < 2) {
            setError("Select at least 2 files to merge");
            return;
        }

        setPreviewLoading(true);
        setError(null);

        const formData = new FormData();
        files.forEach(f => formData.append("files", f.file));
        formData.append("merge_type", mergeType);

        try {
            const response = await axios.post("http://localhost:8000/api/merge-preview", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            setPreview(response.data);
            setShowPreview(true);
        } catch (err: any) {
            setError(err.response?.data?.detail || "Preview failed");
        } finally {
            setPreviewLoading(false);
        }
    };

    const handleUpload = async () => {
        if (files.length === 0) return;

        setLoading(true);
        setError(null);

        const formData = new FormData();
        files.forEach(f => formData.append("files", f.file));
        formData.append("merge_type", mergeType);

        try {
            const endpoint = files.length === 1 ? "/api/upload" : "/api/upload-multiple";
            const url = `http://localhost:8000${endpoint}`;
            
            let response;
            if (files.length === 1) {
                const singleFormData = new FormData();
                singleFormData.append("file", files[0].file);
                response = await axios.post(url, singleFormData, {
                    headers: { "Content-Type": "multipart/form-data" },
                });
            } else {
                response = await axios.post(url, formData, {
                    headers: { "Content-Type": "multipart/form-data" },
                });
            }

            onSuccess(response.data);
        } catch (err: any) {
            setError(err.response?.data?.detail || "Upload failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full max-w-4xl px-4">
            <div className="text-center mb-8">
                <h2 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-yellow-500 mb-4">
                    Uncover Hidden Insights
                </h2>
                <p className="text-slate-600 text-lg">
                    {files.length === 0
                        ? "Upload your data securely and let our AI Agent generate visual summaries."
                        : `${files.length} file${files.length !== 1 ? 's' : ''} selected${files.length > 1 ? ' - Ready to merge' : ''}`}
                </p>
            </div>

            <div
                className={`relative group flex flex-col items-center justify-center w-full h-96 md:h-[450px] rounded-3xl border-2 border-dashed transition-all duration-300 ${dragActive
                    ? "border-orange-500 bg-orange-100 scale-[1.02]"
                    : "border-slate-300 bg-white hover:border-orange-400 hover:bg-orange-50"
                    } shadow-lg`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
            >
                <input
                    ref={inputRef}
                    type="file"
                    className="hidden"
                    accept=".csv,.xlsx,.xls,.json,.pdf"
                    onChange={handleChange}
                    multiple
                />

                {files.length === 0 ? (
                    <div className="flex flex-col items-center space-y-4 pointer-events-none">
                        <div className="p-4 bg-gradient-to-tr from-orange-100 to-yellow-100 rounded-full group-hover:scale-110 transition-transform duration-300">
                            <UploadCloud size={48} className="text-orange-500" />
                        </div>
                        <div className="text-center">
                            <p className="text-xl font-semibold text-slate-700">
                                Click to upload or drag and drop
                            </p>
                            <p className="text-slate-500 mt-2">
                                CSV, XLSX, JSON, or PDF (single or multiple files)
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center space-y-3 z-10 w-full px-6">
                        <FileType size={40} className="text-green-500" />
                        <p className="text-lg font-semibold text-slate-800">{files.length} file(s) selected</p>
                        <p className="text-sm text-slate-500">Click again to add more files</p>
                    </div>
                )}

                <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent rounded-3xl pointer-events-none" />
            </div>

            {/* File List */}
            <AnimatePresence>
                {files.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-6 space-y-3"
                    >
                        {files.map((f, idx) => (
                            <div key={idx} className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl p-3">
                                <div className="flex items-center gap-3">
                                    <FileType size={18} className="text-orange-500" />
                                    <div className="min-w-0">
                                        <p className="font-medium text-slate-700 truncate">{f.file.name}</p>
                                        <p className="text-xs text-slate-500">{(f.file.size / 1024 / 1024).toFixed(2)} MB</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => removeFile(idx)}
                                    className="text-slate-400 hover:text-red-500 transition-colors"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Merge Strategy (show if multiple files) */}
            {files.length > 1 && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-2xl"
                >
                    <p className="text-sm font-semibold text-blue-900 mb-3">Merge Strategy</p>
                    <div className="grid grid-cols-3 gap-2">
                        {(['union', 'join', 'intersect'] as const).map(type => (
                            <button
                                key={type}
                                onClick={() => { setMergeType(type); setPreview(null); }}
                                className={`py-2 px-3 rounded-lg text-xs font-medium transition-all ${
                                    mergeType === type
                                        ? 'bg-blue-500 text-white border-2 border-blue-600'
                                        : 'bg-white border border-blue-200 text-blue-700 hover:bg-blue-100'
                                }`}
                            >
                                {type.charAt(0).toUpperCase() + type.slice(1)}
                                <span className="block text-[10px] opacity-70 mt-0.5">
                                    {type === 'union' && 'All rows'}
                                    {type === 'join' && 'Match by ID'}
                                    {type === 'intersect' && 'Common cols'}
                                </span>
                            </button>
                        ))}
                    </div>
                </motion.div>
            )}

            {/* Preview Section */}
            {showPreview && preview && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl max-h-96 overflow-auto"
                >
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-semibold text-amber-900">Merge Preview</p>
                        <button onClick={() => setShowPreview(false)} className="text-amber-600 hover:text-amber-800">
                            <X size={16} />
                        </button>
                    </div>
                    <div className="text-xs text-amber-800 space-y-1">
                        <p><strong>Estimated Rows:</strong> {preview.merge_preview.estimated_rows}</p>
                        <p><strong>Columns ({preview.merge_preview.estimated_columns.length}):</strong> {preview.merge_preview.estimated_columns.join(', ')}</p>
                        {preview.common_columns.length > 0 && (
                            <p><strong>Common Columns:</strong> {preview.common_columns.join(', ')}</p>
                        )}
                    </div>
                </motion.div>
            )}

            {/* Error */}
            <AnimatePresence>
                {error && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="mt-4 flex items-center gap-2 text-red-400 bg-red-400/10 px-4 py-3 rounded-xl border border-red-400/20 w-full justify-center"
                    >
                        <AlertCircle size={20} />
                        <span>{error}</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Action Buttons */}
            <div className="mt-8 flex flex-col items-center gap-3">
                {files.length > 1 && (
                    <button
                        disabled={previewLoading}
                        onClick={handlePreview}
                        className="px-6 py-3 rounded-xl font-semibold text-sm flex items-center gap-2 border border-slate-200 text-slate-700 hover:bg-slate-50 transition-all"
                    >
                        {previewLoading ? (
                            <Loader2 size={18} className="animate-spin" />
                        ) : (
                            <Eye size={18} />
                        )}
                        Preview Merge
                    </button>
                )}

                <button
                    disabled={files.length === 0 || loading}
                    onClick={handleUpload}
                    className={`relative overflow-hidden group px-8 py-4 rounded-xl font-bold text-lg transition-all duration-300 w-full sm:w-auto min-w-[240px] flex items-center justify-center gap-3 ${files.length === 0 || loading
                        ? "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200"
                        : "bg-orange-500 hover:bg-orange-600 text-white shadow-md hover:shadow-lg border border-orange-400/50"
                        }`}
                >
                    {loading ? (
                        <>
                            <Loader2 size={24} className="animate-spin" />
                            <span className="min-w-[280px] text-center">{loadingText}</span>
                            {/* Progress bar overlay animation */}
                            <div className="absolute inset-0 bg-white/20 animate-pulse" />
                            <span>Processing...</span>
                        </>
                    ) : (
                        <>
                            <CheckCircle size={24} />
                            <span>{files.length > 1 ? 'Merge & Generate' : 'Generate Dashboard'}</span>
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
