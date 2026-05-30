# ✦ AstroAgent: Aradhana

An elite, production-grade spiritual companion powered by Agentic AI (LangGraph), deterministic astrological ephemeris mathematics (`ephem`), and a deeply skeuomorphic React frontend.

Aradhana fuses the ancient wisdom of celestial positioning with cutting-edge LLM state machine orchestration to provide deeply empathetic, non-deterministic spiritual reflections.

---

## 1. Architecture Deep-Dive

AstroAgent leverages **LangGraph** to maintain a persistent `AgentState` machine. The graph strictly controls the flow of conversation, intent extraction, tool execution, and synthesis to prevent hallucinations and enforce safety boundaries.

### The LangGraph State Machine

```mermaid
graph TD
    %% Nodes
    Start((START))
    Router[intent_router_node<br><i>Classifies Intent & Extracts Data</i>]
    Tool[tool_node<br><i>Executes ephem mathematics</i>]
    Synth[synthesis_node<br><i>Generates empathetic reflection</i>]
    End((END))

    %% Routing logic
    Start --> Router
    Router -- "intent == 'CHART_REQUEST'" --> Tool
    Router -- "intent != 'CHART_REQUEST'" --> Synth
    Tool --> Synth
    Synth --> End

    %% State Management Overlay
    subgraph AgentState Parameters
        direction TB
        S1[messages: List[BaseMessage]]
        S2[birth_details: Optional[Dict]]
        S3[chart_cache: Optional[String]]
        S4[intent: String]
        S5[tool_calls_made: Integer]
    end
```

### Component Directory Specification

The repository is decoupled into three distinct architectural pillars:

- **`/backend`**: The Python FastAPI & LangGraph engine.
  - `agent/graph.py`: Contains the compiled StateGraph, system prompts, and tool nodes.
  - `domain/chart_engine.py`: Pure Python implementation of Julian day calculations, obliquity, and ecliptic planetary positions using the PyEphem library.
  - `main.py`: The ASGI entry point running the SSE event generator.
- **`/frontend`**: A Vite + React application.
  - `src/components/`: Houses the complex, skeuomorphic UI components (`CosmicChat`, `AstrolabeForm`).
  - `src/index.css`: Deeply customized Tailwind layer containing CSS variables for glassmorphism, CRT scan-lines, and embossed brass textures.
- **`/eval_harness`**: A standalone automated evaluation suite.
  - `runner.py`: Executes deterministic assertions and an LLM-as-a-Judge rubric across all tests.
  - `eval_cases.jsonl`: 25 strict boundary test cases.

---

## 2. API & SSE Stream Specifications

Aradhana streams responses directly to the frontend using Server-Sent Events (SSE). This allows the UI to render intermediate states (like tool execution) while the LLM generates tokens.

### `POST /api/chat/stream`

**Expected JSON Payload:**
```json
{
  "message": "Please read my birth chart. I was born on 1990-05-15 at 14:30...",
  "thread_id": "optional-uuid-for-continuity",
  "birth_details": {
    "date": "1990-05-15",
    "time": "14:30",
    "latitude": 34.0522,
    "longitude": -118.2437,
    "timezone": "America/Los_Angeles"
  }
}
```

**Raw SSE Event Trace Example (Tool Triggered):**
```http
event: processing_start
data: {"thread_id": "uuid", "status": "Consulting the celestial records..."}

event: tool_start
data: {"tool": "compute_birth_chart", "status": "running"}

event: intent_classified
data: {"intent": "CHART_REQUEST", "phase": "routing"}

event: tool_end
data: {"tool": "compute_birth_chart", "status": "complete"}

event: token
data: {"token": "The "}

event: token
data: {"token": "stars "}

event: done
data: {"thread_id": "uuid", "phase": "done", "tool_calls_made": 1, "chart_available": true, "intent": "CHART_REQUEST"}
```

---

## 3. Operational Trade-offs & Limitations

Building a deterministic math engine alongside a probabilistic LLM requires strict engineering trade-offs:

*   **Ephemeris Compute Overhead:** Initializing the `ephem` context and computing precise ecliptic longitudes for 10 celestial bodies adds approximately ~150-300ms of latency per execution. We trade raw speed for deterministic mathematical accuracy (avoiding LLM hallucinations of planetary positions).
*   **Geo-Coordinate Resolution Constraints:** The system expects explicit floating-point latitude and longitude. Edge cases in ambiguous place names (e.g., "Springfield") without strict coordinate mapping will fail. The frontend enforces strict coordinate inputs to mitigate this.
*   **State Volatility:** The current `thread_store` maintains conversational state natively in Python memory (`dict`). 
    *   *Trade-off:* Lightning-fast read/writes during the session.
    *   *Limitation:* If the FastAPI process restarts or scales horizontally across workers, active sessions will be lost. For a distributed production setup, this must be migrated to a `RedisSaver` (LangGraph checkpointing).
*   **LLM Rate Limiting Strategy:** The system employs a fallback cascade (`gemini-3.5-flash` -> `3.1-flash-lite` -> `2.5-flash` -> `2.0-flash`). While robust, transitioning through fallbacks during global API degradation will proportionally increase initial Time-To-First-Token (TTFT).

---

## 4. Deployment Guide

Follow these exact Git commands to initialize the repository, commit the architecture, and push to your public remote.

```bash
# 1. Initialize the repository
git init

# 2. Add the .gitignore to prevent pushing heavy binaries/cache
echo "node_modules/" >> .gitignore
echo "__pycache__/" >> .gitignore
echo ".env" >> .gitignore
echo ".DS_Store" >> .gitignore

# 3. Stage all architectural files cleanly
git add backend/ frontend/ eval_harness/ README.md .gitignore

# 4. Commit with a semantic message
git commit -m "feat: initial commit of AstroAgent with LangGraph engine and skeuomorphic UI"

# 5. Link your remote repository (Replace <YOUR_REPO_URL> with your GitHub/GitLab URL)
git remote add origin <YOUR_REPO_URL>

# 6. Push to the main branch
git branch -M main
git push -u origin main
```

> **Note:** Ensure you never commit your `.env` file containing your `GOOGLE_API_KEY`. It has been added to the `.gitignore` step above for safety.
