from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import pandas as pd
from data_parser import DataParser
from ai_agent import AIAgent
from data_cleaner import DataCleaner
from dashboard_db import DashboardDB
from export_service import ExportService
from typing import List, Optional

app = FastAPI(title="DataSense API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174"],
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
    1. Parse file → text summary + raw sample rows + column metadata
    2. Agent 1 (2-stage Gemini) → summary + per-chart column configs
    3. Return everything to frontend
    """
    content = await file.read()
    filename = file.filename.lower()

    # Step 1: Parse
    parsed_text = ""
    if filename.endswith(".csv"):
        parsed_text = DataParser.parse_csv(content)
    elif filename.endswith(".xlsx") or filename.endswith(".xls"):
        parsed_text = DataParser.parse_excel(content)
    elif filename.endswith(".json"):
        parsed_text = DataParser.parse_json(content)
    elif filename.endswith(".pdf"):
        parsed_text = DataParser.parse_pdf(content)
    else:
        raise HTTPException(status_code=400, detail="Unsupported file type.")

    # Step 2: Extract raw rows + column metadata
    raw_sample = DataParser.extract_raw_sample(content, filename)
    column_meta = DataParser.extract_column_metadata(content, filename)

    # Step 3: Multi-Agent AI Analysis
    analysis = AIAgent.analyze_and_configure_charts(parsed_text, filename, column_meta)

    return {
        "filename": filename,
        "content_summary": parsed_text,
        "original_data": raw_sample,
        "column_meta": column_meta,
        # New structured response
        "insights": {
            "summary": analysis.get("summary", ""),
            "suggested_charts": [c.get("type", "") for c in analysis.get("charts", [])],
        },
        "chart_configs": analysis.get("charts", []),
        "status": "success"
    }


@app.post("/api/upload-multiple")
async def upload_multiple_files(
    files: List[UploadFile] = File(...),
    merge_type: str = Form("union"),
    join_columns: Optional[str] = Form(None)
):
    """
    Upload and merge multiple files together.
    
    Args:
        files: Multiple files to upload
        merge_type: 'union' (concat rows), 'join' (merge on columns), 'intersect' (common cols only)
        join_columns: Comma-separated column names to join on (optional, auto-detects if not provided)
    
    Returns:
        Merged dataset analysis
    """
    if not files or len(files) == 0:
        raise HTTPException(status_code=400, detail="At least one file is required.")
    
    try:
        # Step 1: Read all files into dataframes
        dataframes = []
        filenames = []
        contents = []
        
        for file in files:
            try:
                content = await file.read()
                filename = file.filename.lower()
                contents.append(content)
                filenames.append(filename)
                
                # Parse the dataframe
                df = DataParser.read_dataframe(content, filename)
                dataframes.append(df)
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Error reading {file.filename}: {str(e)}")
        
        # Step 2: Parse join columns if provided
        join_cols = None
        if join_columns:
            join_cols = [col.strip() for col in join_columns.split(",")]
        
        # Step 3: Merge dataframes
        merged_df = DataParser.merge_dataframes(dataframes, merge_type=merge_type, join_columns=join_cols)
        
        if merged_df.empty:
            raise HTTPException(status_code=400, detail="Merged result is empty. Check file formats and merge type.")
        
        # Step 4: Get metadata from merged data
        merged_content = merged_df.to_csv(index=False).encode('utf-8')
        
        parsed_text = DataParser._summarize_dataframe(merged_df, f"Merged from {len(files)} files")
        raw_sample = merged_df.head(50).fillna("").to_dict(orient="records")
        column_meta = DataParser.extract_column_metadata(merged_content, "merged.csv")
        
        # Step 5: AI Analysis
        analysis = AIAgent.analyze_and_configure_charts(parsed_text, f"merged_{merge_type}", column_meta)
        
        return {
            "filename": f"merged_{merge_type}",
            "content_summary": parsed_text,
            "original_data": raw_sample,
            "column_meta": column_meta,
            "insights": {
                "summary": analysis.get("summary", ""),
                "suggested_charts": [c.get("type", "") for c in analysis.get("charts", [])],
            },
            "chart_configs": analysis.get("charts", []),
            "merge_info": {
                "files_merged": len(files),
                "merge_type": merge_type,
                "final_rows": len(merged_df),
                "final_columns": list(merged_df.columns)
            },
            "status": "success"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Multi-file merge error: {str(e)}")


@app.post("/api/merge-preview")
async def preview_merge(
    files: List[UploadFile] = File(...),
    merge_type: str = Form("union")
):
    """
    Preview what files will look like when merged, without full AI analysis.
    Useful for selecting merge strategy before full processing.
    """
    if not files or len(files) == 0:
        raise HTTPException(status_code=400, detail="At least one file is required.")
    
    try:
        dataframes = []
        file_previews = []
        filenames = []
        contents = []
        
        for file in files:
            try:
                content = await file.read()
                filename = file.filename.lower()
                df = DataParser.read_dataframe(content, filename)
                dataframes.append(df)
                filenames.append(filename)
                contents.append(content)
                
                # Get preview of each file
                file_previews.append({
                    "name": filename,
                    "rows": len(df),
                    "columns": list(df.columns),
                    "preview": df.head(3).to_dict(orient="records")
                })
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Error reading {file.filename}: {str(e)}")
        
        # Merge and show preview
        merged_df = DataParser.merge_dataframes(dataframes, merge_type=merge_type)
        
        # Detect common columns
        common_cols = DataParser.get_common_columns(filenames, contents)
        
        return {
            "status": "preview",
            "files": file_previews,
            "common_columns": common_cols,
            "merge_preview": {
                "type": merge_type,
                "estimated_rows": len(merged_df),
                "estimated_columns": list(merged_df.columns),
                "preview_rows": merged_df.head(5).to_dict(orient="records")
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Preview error: {str(e)}")

    content_summary: str
    question: str
    history: list = []


@app.post("/api/chat")
async def chat_with_data(request: ChatRequest):
    response_text = AIAgent.chat_with_data(
        parsed_text=request.content_summary,
        question=request.question,
        previous_history=request.history
    )
    return {"answer": response_text}


class GraphRequest(BaseModel):
    content_summary: str


@app.post("/api/graph")
async def get_graph_data(request: GraphRequest):
    graph_data = AIAgent.generate_graph_data(request.content_summary)
    return graph_data


class DataQualityRequest(BaseModel):
    original_data: list


@app.post("/api/analyze-quality")
async def analyze_data_quality(request: DataQualityRequest):
    """Analyze data quality issues in the provided dataset."""
    try:
        df = pd.DataFrame(request.original_data)
        quality_report = DataCleaner.analyze_data_quality(df)
        return {
            "status": "success",
            "quality_report": quality_report
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Quality analysis error: {str(e)}")


class CleaningRequest(BaseModel):
    original_data: list
    cleaning_steps: List[dict]


@app.post("/api/apply-cleaning")
async def apply_cleaning(request: CleaningRequest):
    """Apply cleaning operations to dataset and return cleaned data."""
    try:
        df = pd.DataFrame(request.original_data)
        df_cleaned, report = DataCleaner.apply_cleaning(df, request.cleaning_steps)
        
        # Get updated metadata
        cleaned_content = df_cleaned.to_csv(index=False).encode('utf-8')
        cleaned_sample = df_cleaned.head(50).fillna("").to_dict(orient="records")
        column_meta = DataParser.extract_column_metadata(cleaned_content, "cleaned.csv")
        
        return {
            "status": "success",
            "original_rows": len(df),
            "cleaned_rows": len(df_cleaned),
            "cleaned_data": cleaned_sample,
            "column_meta": column_meta,
            "cleaning_report": report
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Cleaning error: {str(e)}")


class SaveDashboardRequest(BaseModel):
    dashboard_name: str
    filename: str
    insights_summary: str
    chart_configs: list
    original_data: list
    column_metadata: dict
    content_summary: str


@app.post("/api/save-dashboard")
async def save_dashboard(request: SaveDashboardRequest):
    """Save current dashboard configuration for later retrieval."""
    try:
        dashboard_id = DashboardDB.save_dashboard(
            name=request.dashboard_name,
            filename=request.filename,
            insights_summary=request.insights_summary,
            chart_configs=request.chart_configs,
            original_data=request.original_data,
            column_metadata=request.column_metadata,
            content_summary=request.content_summary
        )
        return {
            "status": "success",
            "dashboard_id": dashboard_id,
            "message": f"Dashboard '{request.dashboard_name}' saved successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Save error: {str(e)}")


@app.get("/api/dashboards")
async def list_dashboards():
    """List all saved dashboards."""
    try:
        dashboards = DashboardDB.list_dashboards()
        return {
            "status": "success",
            "dashboards": dashboards,
            "count": len(dashboards)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"List error: {str(e)}")


@app.get("/api/dashboard/{dashboard_id}")
async def load_dashboard(dashboard_id: str):
    """Load a saved dashboard by ID."""
    try:
        dashboard = DashboardDB.load_dashboard(dashboard_id)
        if not dashboard:
            raise HTTPException(status_code=404, detail="Dashboard not found")
        
        return {
            "status": "success",
            "dashboard": dashboard,
            # Format response like upload endpoint for compatibility
            "filename": dashboard["filename"],
            "content_summary": dashboard["content_summary"],
            "original_data": dashboard["original_data"],
            "column_meta": dashboard["column_metadata"],
            "insights": dashboard["insights_summary"],
            "chart_configs": dashboard["chart_configs"]
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Load error: {str(e)}")


class DashboardUpdateRequest(BaseModel):
    dashboard_id: str
    new_name: str


@app.put("/api/dashboard/{dashboard_id}")
async def update_dashboard(dashboard_id: str, request: DashboardUpdateRequest):
    """Update dashboard name."""
    try:
        success = DashboardDB.update_dashboard_name(dashboard_id, request.new_name)
        if not success:
            raise HTTPException(status_code=404, detail="Dashboard not found")
        
        return {
            "status": "success",
            "message": "Dashboard updated successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Update error: {str(e)}")


@app.delete("/api/dashboard/{dashboard_id}")
async def delete_dashboard(dashboard_id: str):
    """Delete a saved dashboard."""
    try:
        success = DashboardDB.delete_dashboard(dashboard_id)
        if not success:
            raise HTTPException(status_code=404, detail="Dashboard not found")
        
        return {
            "status": "success",
            "message": "Dashboard deleted successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Delete error: {str(e)}")


class ExportRequest(BaseModel):
    data: list
    filename: str
    format: str  # 'csv', 'json', 'xlsx'


@app.post("/api/export")
async def export_data(request: ExportRequest):
    """Export data in requested format."""
    try:
        if request.format == 'csv':
            content = ExportService.export_to_csv(request.data)
            media_type = "text/csv"
            file_ext = "csv"
        elif request.format == 'json':
            content = ExportService.export_to_json(request.data)
            media_type = "application/json"
            file_ext = "json"
        elif request.format == 'xlsx':
            content = ExportService.export_to_excel(request.data)
            media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            file_ext = "xlsx"
        else:
            raise HTTPException(status_code=400, detail="Invalid export format")
        
        filename = f"{request.filename.split('.')[0]}_export.{file_ext}"
        
        return StreamingResponse(
            iter([content]),
            media_type=media_type,
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Export error: {str(e)}")


class SummaryReportRequest(BaseModel):
    filename: str
    insights_summary: str
    column_metadata: dict
    data_rows_count: int


@app.post("/api/export-summary")
async def export_summary(request: SummaryReportRequest):
    """Export data summary as text report."""
    try:
        report_content = ExportService.generate_summary_report(
            request.filename,
            request.insights_summary,
            request.column_metadata,
            request.data_rows_count
        )
        
        filename = f"{request.filename.split('.')[0]}_report.txt"
        content = report_content.encode('utf-8')
        
        return StreamingResponse(
            iter([content]),
            media_type="text/plain",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Report export error: {str(e)}")
