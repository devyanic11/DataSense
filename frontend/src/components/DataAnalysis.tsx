import { useState, useMemo } from 'react';
import axios from 'axios';
import type { InsightData } from '../App';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import { Loader2 } from 'lucide-react';

interface DataAnalysisProps {
  data: InsightData;
  fileId: string;
}

export default function DataAnalysis({ data, fileId }: DataAnalysisProps) {
  const [analysisType, setAnalysisType] = useState<'aggregate' | 'top-values' | 'distribution' | 'pivot'>('aggregate');
  const [groupBy, setGroupBy] = useState('');
  const [aggColumn, setAggColumn] = useState('');
  const [aggFunction, setAggFunction] = useState('sum');
  const [topValueColumn, setTopValueColumn] = useState('');
  const [topN, setTopN] = useState(10);
  const [distColumn, setDistColumn] = useState('');
  const [bins, setBins] = useState(10);
  const [pivotRows, setPivotRows] = useState('');
  const [pivotCols, setPivotCols] = useState('');
  const [pivotValues, setPivotValues] = useState('');
  const [pivotAgg, setPivotAgg] = useState('sum');

  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const numericCols = useMemo(() => 
    Object.keys(data.column_meta || {}).filter(col => data.column_meta[col].type === 'numeric'),
    [data.column_meta]
  );

  const categoricalCols = useMemo(() =>
    Object.keys(data.column_meta || {}).filter(col => data.column_meta[col].type === 'categorical'),
    [data.column_meta]
  );

  const allCols = useMemo(() => Object.keys(data.column_meta || {}), [data.column_meta]);

  const handleAggregate = async () => {
    if (!groupBy || !aggColumn) {
      setError('Select group column and aggregate column');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await axios.post('http://localhost:8000/api/aggregate', {
        file_id: fileId,
        group_by: groupBy,
        agg_column: aggColumn,
        agg_function: aggFunction
      });
      setResults(res.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error generating analysis');
    }
    setLoading(false);
  };

  const handleTopValues = async () => {
    if (!topValueColumn) {
      setError('Select a column');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await axios.post('http://localhost:8000/api/top-values', {
        file_id: fileId,
        column: topValueColumn,
        n: topN
      });
      setResults(res.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error fetching top values');
    }
    setLoading(false);
  };

  const handleDistribution = async () => {
    if (!distColumn) {
      setError('Select a numeric column');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await axios.post('http://localhost:8000/api/distribution', {
        file_id: fileId,
        column: distColumn,
        bins: bins
      });
      setResults(res.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error generating distribution');
    }
    setLoading(false);
  };

  const handlePivot = async () => {
    if (!pivotRows || !pivotCols || !pivotValues) {
      setError('Select rows, columns, and values');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await axios.post('http://localhost:8000/api/pivot', {
        file_id: fileId,
        rows: pivotRows,
        columns: pivotCols,
        values: pivotValues,
        agg: pivotAgg
      });
      setResults(res.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error generating pivot');
    }
    setLoading(false);
  };

  const COLORS = ['#818CF8', '#34D399', '#FB923C', '#F472B6', '#38BDF8', '#A78BFA', '#FBBF24', '#F87171'];

  return (
    <div className="flex flex-col gap-6">
      {/* Tab Selector */}
      <div className="flex gap-2 border-b border-[var(--border)]">
        {[
          { id: 'aggregate', label: '📊 Group & Aggregate' },
          { id: 'top-values', label: '🔝 Top Values' },
          { id: 'distribution', label: '📈 Distribution' },
          { id: 'pivot', label: '🔀 Pivot Table' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => { setAnalysisType(tab.id as any); setResults(null); }}
            style={{
              padding: '10px 14px',
              fontSize: 12,
              fontWeight: analysisType === tab.id ? 600 : 500,
              color: analysisType === tab.id ? 'var(--accent)' : 'var(--text-muted)',
              borderBottom: analysisType === tab.id ? '2px solid var(--accent)' : 'none',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
        {analysisType === 'aggregate' && (
          <div className="flex flex-col gap-4">
            <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Group & Aggregate</h3>
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Group data by a column and apply aggregation function</p>
            
            <div className="grid gap-3">
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>
                  Group By (Categorical)
                </label>
                <select
                  value={groupBy}
                  onChange={(e) => setGroupBy(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-inset)', color: 'var(--text-primary)', fontSize: 13 }}
                >
                  <option value="">Select column...</option>
                  {categoricalCols.map(col => <option key={col} value={col}>{col}</option>)}
                </select>
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>
                  Aggregate Column (Numeric)
                </label>
                <select
                  value={aggColumn}
                  onChange={(e) => setAggColumn(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-inset)', color: 'var(--text-primary)', fontSize: 13 }}
                >
                  <option value="">Select column...</option>
                  {numericCols.map(col => <option key={col} value={col}>{col}</option>)}
                </select>
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>
                  Function
                </label>
                <select
                  value={aggFunction}
                  onChange={(e) => setAggFunction(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-inset)', color: 'var(--text-primary)', fontSize: 13 }}
                >
                  <option value="sum">Sum</option>
                  <option value="avg">Average</option>
                  <option value="count">Count</option>
                  <option value="max">Maximum</option>
                  <option value="min">Minimum</option>
                  <option value="std">Std Dev</option>
                </select>
              </div>
            </div>

            <button
              onClick={handleAggregate}
              disabled={loading}
              style={{
                padding: '10px 16px',
                background: 'var(--accent)',
                color: 'white',
                border: 'none',
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1
              }}
            >
              {loading ? <Loader2 className="animate-spin" size={16} /> : 'Generate Analysis'}
            </button>
          </div>
        )}

        {analysisType === 'top-values' && (
          <div className="flex flex-col gap-4">
            <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Top Values</h3>
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Find most frequent values in a column</p>
            
            <div className="grid gap-3">
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>
                  Column
                </label>
                <select
                  value={topValueColumn}
                  onChange={(e) => setTopValueColumn(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-inset)', color: 'var(--text-primary)', fontSize: 13 }}
                >
                  <option value="">Select column...</option>
                  {allCols.map(col => <option key={col} value={col}>{col}</option>)}
                </select>
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>
                  Top N
                </label>
                <input
                  type="number"
                  value={topN}
                  onChange={(e) => setTopN(parseInt(e.target.value))}
                  min="1"
                  max="100"
                  style={{ width: '100%', padding: '8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-inset)', color: 'var(--text-primary)', fontSize: 13 }}
                />
              </div>
            </div>

            <button
              onClick={handleTopValues}
              disabled={loading}
              style={{
                padding: '10px 16px',
                background: 'var(--accent)',
                color: 'white',
                border: 'none',
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1
              }}
            >
              {loading ? <Loader2 className="animate-spin" size={16} /> : 'Get Top Values'}
            </button>
          </div>
        )}

        {analysisType === 'distribution' && (
          <div className="flex flex-col gap-4">
            <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Distribution</h3>
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Analyze how numeric values are distributed</p>
            
            <div className="grid gap-3">
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>
                  Numeric Column
                </label>
                <select
                  value={distColumn}
                  onChange={(e) => setDistColumn(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-inset)', color: 'var(--text-primary)', fontSize: 13 }}
                >
                  <option value="">Select column...</option>
                  {numericCols.map(col => <option key={col} value={col}>{col}</option>)}
                </select>
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>
                  Number of Bins
                </label>
                <input
                  type="number"
                  value={bins}
                  onChange={(e) => setBins(parseInt(e.target.value))}
                  min="2"
                  max="50"
                  style={{ width: '100%', padding: '8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-inset)', color: 'var(--text-primary)', fontSize: 13 }}
                />
              </div>
            </div>

            <button
              onClick={handleDistribution}
              disabled={loading}
              style={{
                padding: '10px 16px',
                background: 'var(--accent)',
                color: 'white',
                border: 'none',
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1
              }}
            >
              {loading ? <Loader2 className="animate-spin" size={16} /> : 'Generate Distribution'}
            </button>
          </div>
        )}

        {analysisType === 'pivot' && (
          <div className="flex flex-col gap-4">
            <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Pivot Table</h3>
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Cross-tabulation of two dimensions</p>
            
            <div className="grid gap-3">
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>
                  Rows
                </label>
                <select
                  value={pivotRows}
                  onChange={(e) => setPivotRows(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-inset)', color: 'var(--text-primary)', fontSize: 13 }}
                >
                  <option value="">Select column...</option>
                  {categoricalCols.map(col => <option key={col} value={col}>{col}</option>)}
                </select>
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>
                  Columns
                </label>
                <select
                  value={pivotCols}
                  onChange={(e) => setPivotCols(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-inset)', color: 'var(--text-primary)', fontSize: 13 }}
                >
                  <option value="">Select column...</option>
                  {categoricalCols.map(col => <option key={col} value={col}>{col}</option>)}
                </select>
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>
                  Values (Numeric)
                </label>
                <select
                  value={pivotValues}
                  onChange={(e) => setPivotValues(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-inset)', color: 'var(--text-primary)', fontSize: 13 }}
                >
                  <option value="">Select column...</option>
                  {numericCols.map(col => <option key={col} value={col}>{col}</option>)}
                </select>
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>
                  Aggregation
                </label>
                <select
                  value={pivotAgg}
                  onChange={(e) => setPivotAgg(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-inset)', color: 'var(--text-primary)', fontSize: 13 }}
                >
                  <option value="sum">Sum</option>
                  <option value="avg">Average</option>
                  <option value="count">Count</option>
                  <option value="max">Max</option>
                  <option value="min">Min</option>
                </select>
              </div>
            </div>

            <button
              onClick={handlePivot}
              disabled={loading}
              style={{
                padding: '10px 16px',
                background: 'var(--accent)',
                color: 'white',
                border: 'none',
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1
              }}
            >
              {loading ? <Loader2 className="animate-spin" size={16} /> : 'Generate Pivot'}
            </button>
          </div>
        )}

        {error && (
          <div style={{ padding: 12, background: '#fee', borderRadius: 6, color: '#c00', fontSize: 12, marginTop: 12 }}>
            ❌ {error}
          </div>
        )}
      </div>

      {/* Results */}
      {results && (
        <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16 }}>Results</h3>

          {analysisType === 'aggregate' && results.data && (
            <>
              <div style={{ marginBottom: 16 }}>
                {results.data.map((item: any, i: number) => (
                  <div key={i} style={{ fontSize: 13, padding: 8, borderBottom: '1px solid var(--border)' }}>
                    <strong>{item.group}</strong>: {typeof item.value === 'number' ? item.value.toFixed(2) : item.value}
                  </div>
                ))}
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={results.data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="group" stroke="var(--text-muted)" />
                  <YAxis stroke="var(--text-muted)" />
                  <Tooltip contentStyle={{ background: 'var(--bg-overlay)', border: '1px solid var(--border)', borderRadius: 6 }} />
                  <Bar dataKey="value" fill="var(--accent)" radius={[4, 4, 0, 0]}>
                    {results.data.map((_: any, i: number) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </>
          )}

          {analysisType === 'top-values' && results.top_values && (
            <>
              <div style={{ marginBottom: 16 }}>
                {results.top_values.map((item: any, i: number) => (
                  <div key={i} style={{ fontSize: 13, padding: 8, borderBottom: '1px solid var(--border)' }}>
                    <strong>{item.value}</strong>: {item.count} occurrences
                  </div>
                ))}
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={results.top_values}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="value" stroke="var(--text-muted)" angle={-45} textAnchor="end" height={100} />
                  <YAxis stroke="var(--text-muted)" />
                  <Tooltip contentStyle={{ background: 'var(--bg-overlay)', border: '1px solid var(--border)', borderRadius: 6 }} />
                  <Bar dataKey="count" fill="var(--accent)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </>
          )}

          {analysisType === 'distribution' && results.distribution && (
            <>
              <div style={{ marginBottom: 16 }}>
                {results.distribution.map((item: any, i: number) => (
                  <div key={i} style={{ fontSize: 13, padding: 8, borderBottom: '1px solid var(--border)' }}>
                    <strong>{item.range}</strong>: {item.count} items
                  </div>
                ))}
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={results.distribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="range" stroke="var(--text-muted)" />
                  <YAxis stroke="var(--text-muted)" />
                  <Tooltip contentStyle={{ background: 'var(--bg-overlay)', border: '1px solid var(--border)', borderRadius: 6 }} />
                  <Bar dataKey="count" fill="var(--accent)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </>
          )}

          {analysisType === 'pivot' && results.data && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border)' }}>
                    <th style={{ padding: 8, textAlign: 'left', fontWeight: 600 }}>{results.rows?.[0] || 'Rows'}</th>
                    {results.columns?.map((col: string) => (
                      <th key={col} style={{ padding: 8, textAlign: 'center', fontWeight: 600 }}>{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {results.rows?.map((row: string, ri: number) => (
                    <tr key={ri} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: 8, fontWeight: 500 }}>{row}</td>
                      {results.data?.[ri]?.map((val: any, ci: number) => (
                        <td key={ci} style={{ padding: 8, textAlign: 'center' }}>{typeof val === 'number' ? val.toFixed(2) : val}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
