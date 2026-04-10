from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import uuid
import pandas as pd
import plotly.express as px
import io
import json

from data_parser import DataParser
from ai_agent import AIAgent
from visualizer import Visualizer

app = FastAPI(title="DataSense API")

# Global in-memory cache for DataFrames to allow complete data visualization
GLOBAL_DFS = {}

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health_check():
    return {"status": "ok"}


@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...)):
    """
    Full pipeline:
    1. Parse file into Global DataFrame cache
    2. Extract fast schema + metadata
    3. Agent 1 (Gemini) → summary + recommend chart configs using actual backend functions
    4. Return Plotly JSON to frontend
    """
    content = await file.read()
    filename = file.filename.lower()
    file_id = str(uuid.uuid4())

    df = None
    parsed_text = ""
    try:
        if filename.endswith(".csv"):
            df = pd.read_csv(io.BytesIO(content))
            parsed_text = DataParser._summarize_dataframe(df, "CSV")
        elif filename.endswith(".xlsx") or filename.endswith(".xls"):
            df = pd.read_excel(io.BytesIO(content))
            parsed_text = DataParser._summarize_dataframe(df, "Excel")
        elif filename.endswith(".json"):
            data = json.loads(content.decode('utf-8'))
            if isinstance(data, list) and len(data) > 0 and isinstance(data[0], dict):
                df = pd.DataFrame(data)
                parsed_text = DataParser._summarize_dataframe(df, "JSON Array")
            else:
                 parsed_text = DataParser.parse_json(content)
        elif filename.endswith(".pdf"):
            parsed_text = DataParser.parse_pdf(content)
        else:
            raise HTTPException(status_code=400, detail="Unsupported file type.")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Parsing error: {str(e)}")

    # Cache the dataframe
    if df is not None:
        GLOBAL_DFS[file_id] = df

    # Extract raw rows + column metadata
    raw_sample = df.head(50).fillna("").to_dict(orient="records") if df is not None else []
    column_meta = DataParser.extract_column_metadata(content, filename)

    # Multi-Agent AI Analysis (now generates Plotly arguments)
    analysis = AIAgent.analyze_and_configure_charts(parsed_text, filename, column_meta)
    
    # Pre-generate Llama 3 chat suggestions so they are ready immediately
    suggestions = AIAgent.generate_suggestions(column_meta, filename)

    # Convert the AI configs into Plotly JSON strings
    plot_definitions = []
    if df is not None:
        for config in analysis.get("charts", []):
            fig_json = _generate_plotly_for_config(df, config)
            if fig_json:
                plot_definitions.append({
                    "type": config.get("type"),
                    "title": config.get("title"),
                    "description": config.get("description"),
                    "plotly_json": fig_json
                })
    else:
        plot_definitions = analysis.get("charts", [])

    return {
        "file_id": file_id,
        "filename": filename,
        "content_summary": parsed_text,
        "original_data": raw_sample,
        "column_meta": column_meta,
        "insights": {
            "summary": analysis.get("summary", ""),
            "suggested_charts": [c.get("type", "") for c in analysis.get("charts", [])],
        },
        "chat_suggestions": suggestions,
        "chart_configs": plot_definitions,
        "status": "success"
    }


def _generate_plotly_for_config(df: pd.DataFrame, config: dict) -> Optional[str]:
    """Generate Plotly JSON for a config."""
    chart_type = config.get("type", "")
    title = config.get("title", "")
    
    generators = {
        "Bar Chart": lambda: Visualizer.generate_bar_chart(df, title, config.get("x_key"), config.get("y_keys", [])),
        "Line Chart": lambda: Visualizer.generate_line_chart(df, title, config.get("x_key"), config.get("y_keys", [])),
        "Pie Chart": lambda: Visualizer.generate_pie_chart(df, title, config.get("label_key"), config.get("value_key")),
        "Scatter Plot": lambda: Visualizer.generate_scatter_plot(df, title, config.get("x_key"), config.get("y_keys", [None])[0], config.get("tooltip_key")),
        "Histogram": lambda: Visualizer.generate_histogram(df, title, config.get("x_key"), config.get("nbins", 30)),
        "Box Plot": lambda: Visualizer.generate_box_plot(df, title, config.get("x_key"), config.get("y_key")),
        "Heatmap": lambda: Visualizer.generate_heatmap(df, title, config.get("columns")),
    }
    
    return generators.get(chart_type, lambda: None)()





class ChatRequest(BaseModel):
    file_id: str
    filename: str
    column_meta: dict
    content_summary: str
    question: str
    history: list = []


@app.post("/api/chat")
async def chat_with_data(request: ChatRequest):
    """
    Smart hybrid chat:
    1. Ask Gemini to translate user question into a pandas operation
    2. Execute the pandas operation on the FULL cached DataFrame
    3. Ask Gemini to narrate the real results
    Falls back to original method for PDFs / when DataFrame is unavailable.
    """
    df = GLOBAL_DFS.get(request.file_id)

    # ── Fallback for PDFs or missing DataFrames → use original method ──
    if df is None:
        response_text = AIAgent.chat_with_data(
            parsed_text=request.content_summary,
            question=request.question,
            previous_history=request.history
        )
        return _process_chat_response(response_text, request)

    # ── Stage 1: AI generates a pandas query intent ──
    query = AIAgent.generate_data_query(
        question=request.question,
        column_meta=request.column_meta,
        parsed_text_preview=request.content_summary,
        previous_history=request.history,
    )

    operation = query.get("operation", "passthrough")
    params = query.get("params", {})
    narrative_hint = query.get("narrative_hint", "")

    # If AI detected a chart request, use original pipeline
    if operation == "chart":
        response_text = AIAgent.chat_with_data(
            parsed_text=request.content_summary,
            question=request.question,
            previous_history=request.history
        )
        return _process_chat_response(response_text, request)

    # If passthrough or unrecognized, default to summary on full data
    if operation == "passthrough":
        operation = "summary"
        params = {}

    # ── Stage 2: Execute pandas query on the FULL DataFrame ──
    result_text = _execute_pandas_query(df, operation, params)

    # ── Stage 3: Ask Gemini to narrate the actual results ──
    narrated = AIAgent.narrate_result(
        question=request.question,
        operation=operation,
        result_text=result_text,
        narrative_hint=narrative_hint,
        previous_history=request.history,
    )

    return _process_chat_response(narrated, request)


def _execute_pandas_query(df: pd.DataFrame, operation: str, params: dict) -> str:
    """Execute a deterministic pandas query on the full DataFrame. Zero AI."""
    try:
        col = params.get("column", "")
        top_n = int(params.get("top_n", 10))

        if operation == "value_counts":
            if col not in df.columns:
                return f"Column '{col}' not found."
            vc = df[col].value_counts().head(top_n)
            return f"Value counts for '{col}' (top {top_n}):\n{vc.to_string()}\nTotal unique: {df[col].nunique()}"

        elif operation == "describe":
            if col and col in df.columns:
                desc = df[col].describe()
                return f"Statistics for '{col}':\n{desc.to_string()}\nTotal rows: {len(df)}"
            else:
                desc = df.describe()
                return f"Dataset statistics:\n{desc.to_string()}"

        elif operation == "max_row":
            if col not in df.columns:
                return f"Column '{col}' not found."
            top = df.nlargest(top_n, col)
            return f"Top {top_n} rows by '{col}':\n{top.to_string(index=False)}"

        elif operation == "min_row":
            if col not in df.columns:
                return f"Column '{col}' not found."
            bottom = df.nsmallest(top_n, col)
            return f"Bottom {top_n} rows by '{col}':\n{bottom.to_string(index=False)}"

        elif operation == "filter":
            op = params.get("operator", "==")
            val = params.get("value", "")
            if col not in df.columns:
                return f"Column '{col}' not found."
            if op == "contains":
                mask = df[col].astype(str).str.contains(str(val), case=False, na=False)
            elif op == "==":
                mask = df[col].astype(str) == str(val)
            elif op == ">":
                mask = pd.to_numeric(df[col], errors='coerce') > float(val)
            elif op == "<":
                mask = pd.to_numeric(df[col], errors='coerce') < float(val)
            elif op == ">=":
                mask = pd.to_numeric(df[col], errors='coerce') >= float(val)
            elif op == "<=":
                mask = pd.to_numeric(df[col], errors='coerce') <= float(val)
            elif op == "!=":
                mask = df[col].astype(str) != str(val)
            else:
                mask = df[col].astype(str) == str(val)
            filtered = df[mask].head(top_n)
            return f"Filtered rows ({min(len(df[mask]), top_n)} shown / {len(df[mask])} match):\n{filtered.to_string(index=False)}"

        elif operation == "correlation":
            col_a = params.get("col_a", "")
            col_b = params.get("col_b", "")
            if col_a not in df.columns or col_b not in df.columns:
                return f"Column(s) not found."
            corr = df[[col_a, col_b]].corr().iloc[0, 1]
            return f"Pearson correlation between '{col_a}' and '{col_b}': {corr:.4f}\n(Based on {len(df)} rows)"

        elif operation == "group_agg":
            group_col = params.get("group_by", "")
            agg_col = params.get("agg_col", "")
            agg_func = params.get("agg_func", "sum")
            if group_col not in df.columns or agg_col not in df.columns:
                return f"Column(s) not found."
            grouped = df.groupby(group_col)[agg_col].agg(agg_func).sort_values(ascending=False).head(top_n)
            return f"'{agg_col}' grouped by '{group_col}' ({agg_func}, top {top_n}):\n{grouped.to_string()}"

        elif operation == "nunique":
            if col and col in df.columns:
                return f"Column '{col}' has {df[col].nunique()} unique values out of {len(df)} rows."
            else:
                uniques = {c: df[c].nunique() for c in df.columns}
                return f"Unique value counts per column:\n" + "\n".join(f"  {k}: {v}" for k, v in uniques.items())

        elif operation == "null_check":
            if col == "__all__" or not col:
                nulls = df.isnull().sum()
                return f"Null counts per column:\n{nulls.to_string()}\nTotal rows: {len(df)}"
            elif col in df.columns:
                nc = df[col].isnull().sum()
                return f"Column '{col}': {nc} null values out of {len(df)} rows ({nc/len(df)*100:.1f}%)"

        elif operation == "head":
            n = int(params.get("n", 10))
            return f"First {n} rows:\n{df.head(n).to_string(index=False)}"

        elif operation == "sample":
            n = min(int(params.get("n", 5)), len(df))
            return f"Random {n} rows:\n{df.sample(n).to_string(index=False)}"

        elif operation == "summary":
            return f"Dataset: {len(df)} rows × {len(df.columns)} columns.\nColumns: {', '.join(df.columns.tolist())}\n\nBasic stats:\n{df.describe().to_string()}"

        return f"Operation '{operation}' not recognized."
    except Exception as e:
        return f"Query execution error: {str(e)}"


def _process_chat_response(response_text: str, request: ChatRequest) -> dict:
    """Process an AI response to extract chart tags and generate plotly JSON if needed."""
    plotly_json = None
    chart_info = None

    if "<CHART:" in response_text:
        start = response_text.find("<CHART:") + 7
        end = response_text.find(">", start)
        chart_type = response_text[start:end].strip()

        config_response = AIAgent.analyze_and_configure_charts(
            parsed_text=request.content_summary,
            filename=request.filename,
            column_meta=request.column_meta,
            force_chart_types=[chart_type],
            user_request=request.question
        )

        charts = config_response.get("charts", [])
        if charts:
            df = GLOBAL_DFS.get(request.file_id)
            if df is not None:
                fig_json = _generate_plotly_for_config(df, charts[0])
                if fig_json:
                    plotly_json = fig_json
                    chart_info = {
                        "type": chart_type,
                        "title": charts[0].get("title", ""),
                        "description": charts[0].get("description", "")
                    }

    return {
        "answer": response_text,
        "new_chart": chart_info,
        "plotly_json": plotly_json
    }


# ─────────────────────────────────────────────────────────────
# Suggestions — AI-generated suggestion pills (Llama 3)
# ─────────────────────────────────────────────────────────────
class SuggestionsRequest(BaseModel):
    column_meta: dict
    filename: str


@app.post("/api/suggestions")
async def get_suggestions(request: SuggestionsRequest):
    """Generate context-aware chat suggestion pills using Llama 3."""
    suggestions = AIAgent.generate_suggestions(
        column_meta=request.column_meta,
        filename=request.filename,
    )
    return {"suggestions": suggestions}


# ─────────────────────────────────────────────────────────────
# Report Summary — AI narrative for PDF export
# ─────────────────────────────────────────────────────────────
class ReportRequest(BaseModel):
    content_summary: str
    column_meta: dict
    chart_configs: list
    filename: str


@app.post("/api/report-summary")
async def report_summary(request: ReportRequest):
    """Generate comprehensive report with data summary + AI narrative."""
    # Build data statistics section
    data_stats = _build_data_stats(request.column_meta)
    
    # Get AI narrative
    ai_narrative = AIAgent.generate_report_narrative(
        content_summary=request.content_summary,
        column_meta=request.column_meta,
        chart_configs=request.chart_configs,
        filename=request.filename,
    )
    
    return {
        "executive_summary": ai_narrative.get("executive_summary", ""),
        "data_overview": data_stats,
        "chart_interpretations": ai_narrative.get("chart_interpretations", {}),
        "key_findings": ai_narrative.get("key_findings", []),
        "closing_takeaway": ai_narrative.get("closing_takeaway", ""),
    }


def _build_data_stats(column_meta: dict) -> dict:
    """Extract and format key statistics from column metadata."""
    stats = {
        "total_columns": len(column_meta),
        "column_breakdown": {"numeric": 0, "categorical": 0, "datetime": 0},
        "columns": []
    }
    
    for col_name, col_info in column_meta.items():
        col_type = col_info.get("type", "unknown")
        
        # Count types
        if col_type == "numeric":
            stats["column_breakdown"]["numeric"] += 1
        elif col_type == "categorical":
            stats["column_breakdown"]["categorical"] += 1
        elif col_type == "datetime":
            stats["column_breakdown"]["datetime"] += 1
        
        # Build column summary
        col_summary = {
            "name": col_name,
            "type": col_type,
            "null_count": col_info.get("null_count", 0),
        }
        
        if col_type == "numeric":
            col_summary.update({
                "min": col_info.get("min"),
                "max": col_info.get("max"),
                "mean": col_info.get("mean"),
            })
        elif col_type == "categorical":
            col_summary["unique_count"] = col_info.get("unique_count", 0)
            col_summary["top_value"] = col_info.get("top_value")
        
        stats["columns"].append(col_summary)
    
    return stats


class GraphRequest(BaseModel):
    content_summary: str


@app.post("/api/graph")
async def get_graph_data(request: GraphRequest):
    graph_data = AIAgent.generate_graph_data(request.content_summary)
    return graph_data


# ─────────────────────────────────────────────────────────────
# Chart Editor — deterministic re-render (zero LLM calls)
# ─────────────────────────────────────────────────────────────

_DEFAULT_PLOTLY_SEQ = list(px.colors.qualitative.Plotly)

def _patch_palette(primary_hex: str):
    """Temporarily override Plotly's default colour sequence so the next chart
    uses the user-chosen primary colour."""
    px.defaults.color_discrete_sequence = [primary_hex] + _DEFAULT_PLOTLY_SEQ[1:]

def _reset_palette():
    px.defaults.color_discrete_sequence = _DEFAULT_PLOTLY_SEQ


class RenderRequest(BaseModel):
    file_id:     str
    chart_type:  str
    title:       str
    x_key:       Optional[str] = None
    y_keys:      Optional[List[str]] = None
    label_key:   Optional[str] = None
    value_key:   Optional[str] = None
    tooltip_key: Optional[str] = None
    nbins:       Optional[int] = 30
    columns:     Optional[List[str]] = None
    color:       Optional[str] = None


@app.post("/api/render")
def render_chart(req: RenderRequest):
    """Re-render a chart with user-chosen config."""
    df = GLOBAL_DFS.get(req.file_id)
    if df is None:
        raise HTTPException(status_code=404, detail="DataFrame not found. Re-upload the file.")

    if req.color:
        _patch_palette(req.color)

    # Normalize y_keys
    y_keys = req.y_keys if req.y_keys else []

    CHART_DISPATCH = {
        "Bar Chart":    lambda: Visualizer.generate_bar_chart(df, req.title, req.x_key, y_keys),
        "Line Chart":   lambda: Visualizer.generate_line_chart(df, req.title, req.x_key, y_keys),
        "Pie Chart":    lambda: Visualizer.generate_pie_chart(df, req.title, req.label_key, req.value_key),
        "Scatter Plot": lambda: Visualizer.generate_scatter_plot(df, req.title, req.x_key, (y_keys[0] if y_keys else None), req.tooltip_key),
        "Histogram":    lambda: Visualizer.generate_histogram(df, req.title, req.x_key, req.nbins or 30),
        "Box Plot":     lambda: Visualizer.generate_box_plot(df, req.title, req.x_key, (y_keys[0] if y_keys else None)),
        "Heatmap":      lambda: Visualizer.generate_heatmap(df, req.title, req.columns),
    }

    handler = CHART_DISPATCH.get(req.chart_type)
    if not handler:
        _reset_palette()
        raise HTTPException(status_code=400, detail=f"Unknown chart type: {req.chart_type}")

    try:
        fig_json = handler()
    finally:
        _reset_palette()

    return {"plotly_json": fig_json}


# ─────────────────────────────────────────────────────────────
# AGGREGATION ENDPOINTS — Data summarization & visualization
# ─────────────────────────────────────────────────────────────

class AggregateRequest(BaseModel):
    file_id: str
    group_by: str
    agg_column: str
    agg_function: str  # sum, count, avg, max, min, std


@app.post("/api/aggregate")
def aggregate_data(req: AggregateRequest):
    """Group by a column and aggregate another column."""
    df = GLOBAL_DFS.get(req.file_id)
    if df is None:
        raise HTTPException(status_code=404, detail="DataFrame not found")
    
    result = DataParser.aggregate_data(df, req.group_by, req.agg_column, req.agg_function)
    return {
        "group_by": req.group_by,
        "agg_column": req.agg_column,
        "agg_function": req.agg_function,
        "data": result
    }


class TopValuesRequest(BaseModel):
    file_id: str
    column: str
    n: int = 10


@app.post("/api/top-values")
def get_top_values(req: TopValuesRequest):
    """Get top N most frequent values in a column."""
    df = GLOBAL_DFS.get(req.file_id)
    if df is None:
        raise HTTPException(status_code=404, detail="DataFrame not found")
    
    result = DataParser.get_top_values(df, req.column, req.n)
    return {"column": req.column, "top_values": result}


class DistributionRequest(BaseModel):
    file_id: str
    column: str
    bins: int = 10


@app.post("/api/distribution")
def get_distribution(req: DistributionRequest):
    """Get numeric distribution (histogram data)."""
    df = GLOBAL_DFS.get(req.file_id)
    if df is None:
        raise HTTPException(status_code=404, detail="DataFrame not found")
    
    result = DataParser.get_numeric_distribution(df, req.column, req.bins)
    return {"column": req.column, "distribution": result}


class PivotRequest(BaseModel):
    file_id: str
    rows: str
    columns: str
    values: str
    agg: str = "sum"


@app.post("/api/pivot")
def get_pivot_table(req: PivotRequest):
    """Get cross-tabulation (pivot table style) aggregation."""
    df = GLOBAL_DFS.get(req.file_id)
    if df is None:
        raise HTTPException(status_code=404, detail="DataFrame not found")
    
    result = DataParser.get_pivot_summary(df, req.rows, req.columns, req.values, req.agg)
    return result
