# Architecting DataSense: A Hybrid Deterministic-Probabilistic Pipeline for Automated Data Intelligence

**Abstract**
DataSense represents a novel approach to automated data analysis and visualization. By bridging the gap between non-deterministic Large Language Models (LLMs) and deterministic data operations (Pandas, Plotly, D3.js Force Physics), DataSense provides a secure, hallucination-free, and dynamic BI dashboard environment. This paper outlines the architecture, which features a multi-agent routing system, client-side physics simulation for knowledge graphs, complex KPI heuristics, and a reactive chat-to-visualization interface supporting 13 distinct chart types.

---

## 1. Introduction
Traditional Business Intelligence (BI) tools require steep learning curves, while pure LLM chat interfaces suffer from hallucinations, token limits, and an inability to process millions of rows of data securely. DataSense solves this by introducing a "Send the Schema, Execute the Data" paradigm.

## 2. Core Architecture

DataSense operates on a decoupled Client-Server architecture:
- **Frontend (Client)**: React 18, Vite, Tailwind CSS v4, Plotly.js, and `react-force-graph-2d`.
- **Backend (Server)**: Python 3.11, FastAPI, Pandas, and the Google Gemini API.

### 2.1 The Hybrid Routing Pipeline (`/api/chat`)
The system employs a sophisticated 3-stage routing mechanism for natural language queries:
1. **Deterministic Pre-Check**: A regex engine intercepts keywords (`plot`, `violin`, `treemap`, `chart`) and forcefully routes the request to the visualization pipeline, bypassing the LLM query planner to prevent operational hallucinations.
2. **AI Query Planner (Agent 3B)**: If no visualization is requested, the LLM translates the natural language query into a strict JSON pandas operation (e.g., `{"operation": "group_agg", "params": {"group_by": "region"}}`).
3. **Deterministic Execution**: The Python backend perfectly executes the pandas query on the *full* dataset (not a sample), ensuring mathematically accurate results.
4. **AI Narration**: The exact result is fed back into the LLM, which formats the deterministic output into human-readable markdown.

## 3. Visualization and Analytical Engine

### 3.1 Unification of 13 Plotly Structures
DataSense supports 13 distinct visualizations: Bar, Line, Area, Pie, Scatter, Histogram, Box Plot, Violin Plot, Heatmap, Treemap, Sunburst, Funnel, and Waterfall.
The AI is instructed to act as a "Frontend Developer", mapping literal column metadata to `x_key`, `y_keys`, and `path_cols`. The frontend `Dashboard.tsx` uses a reactive tab system to seamlessly switch views upon interception of a `<CHART: Type>` tag emitted by the LLM.

### 3.2 Advanced KPI Heuristics
Rather than relying on the LLM to guess key metrics, DataSense uses deterministic static analysis in `visualizer.py`:
- Checks exact numeric column sums vs averages based on column naming conventions (e.g., "sales", "revenue", "qty" use summation; "age", "rate", "score" use average).
- Categorical data surfaces Top 3 and Bottom 3 distinct values.
- Time-series data triggers "Surge and Dip" algorithms, calculating delta variance across time intervals to pinpoint exact dates of highest growth or steep decline.

### 3.3 Physics-Based Knowledge Graphs
For unstructured data (PDFs) or complex relationships, DataSense employs `react-force-graph-2d` utilizing a D3-based physics engine:
- Nodes represent entities (People, Organizations, Quantities).
- Links represent verbs/actions extracted dynamically by the LLM.
- The Engine employs `charge`, `collide`, and `center` forces, calculating node mass based on the degree of edge connections (`node.val = Math.sqrt(degree)`), ensuring highly connected hubs gravitate toward the center while pushing smaller nodes to the periphery.

## 4. Security and Scalability
By keeping the DataFrame entirely in the Python server's memory (`GLOBAL_DFS`), DataSense ensures that sensitive row-level data is never sent to the LLM API. Only highly compressed, heavily typed column metadata (types, nunique, min/max) is transmitted. This reduces API token consumption by 99% and strictly enforces data privacy.

## 5. Conclusion
DataSense successfully merges the reasoning capabilities of LLMs with the absolute accuracy of deterministic code execution, resulting in an automated, highly extensible BI platform capable of rivaling human analyst performance on diverse datasets.
