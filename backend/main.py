from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from data_parser import DataParser
from ai_agent import AIAgent

app = FastAPI(title="DataSense API")

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


class ChatRequest(BaseModel):
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
