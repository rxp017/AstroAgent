from __future__ import annotations

import asyncio
import json
import logging
import os
import sys
import uuid
from contextlib import asynccontextmanager
from typing import Any, AsyncGenerator, Optional

import structlog
import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from langchain_core.messages import AIMessage, HumanMessage
from pydantic import BaseModel, Field
from sse_starlette.sse import EventSourceResponse

load_dotenv()

structlog.configure(
    processors=[
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.StackInfoRenderer(),
        structlog.dev.set_exc_info,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.dev.ConsoleRenderer(),
    ],
    wrapper_class=structlog.make_filtering_bound_logger(logging.INFO),
    context_class=dict,
    logger_factory=structlog.PrintLoggerFactory(),
    cache_logger_on_first_use=True,
)

log: structlog.BoundLogger = structlog.get_logger(__name__)

from agent.graph import compiled_graph

if compiled_graph is None:
    raise RuntimeError(
        "LangGraph compiled_graph failed to initialise. "
        "Check GOOGLE_API_KEY and dependency versions."
    )

thread_store: dict[str, dict[str, Any]] = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info("astroagent.startup", version="1.0.0")
    yield
    log.info("astroagent.shutdown")


app = FastAPI(
    title="AstroAgent Aradhana API",
    version="1.0.0",
    description="LangGraph-powered astrological chat API with SSE streaming.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=4000)
    thread_id: Optional[str] = Field(default=None)
    birth_details: Optional[dict[str, Any]] = Field(default=None)


class ChatResponse(BaseModel):
    thread_id: str
    message: str
    phase: str
    tool_calls_made: int
    chart_available: bool


def _get_or_create_thread(thread_id: Optional[str]) -> tuple[str, dict[str, Any]]:
    if thread_id and thread_id in thread_store:
        return thread_id, thread_store[thread_id]
    new_id = thread_id or str(uuid.uuid4())
    thread_store[new_id] = {
        "messages": [],
        "birth_details": None,
        "chart_cache": None,
        "phase": "idle",
        "intent": "",
        "tool_calls_made": 0,
        "error": None,
    }
    return new_id, thread_store[new_id]


async def _stream_graph_events(
    thread_id: str,
    user_message: str,
    birth_details: Optional[dict[str, Any]],
) -> AsyncGenerator[dict[str, Any], None]:
    tid, state = _get_or_create_thread(thread_id)

    current_messages = list(state.get("messages", []))
    current_messages.append(HumanMessage(content=user_message))

    input_state = {
        "messages": current_messages,
        "birth_details": birth_details or state.get("birth_details"),
        "chart_cache": state.get("chart_cache"),
        "phase": "routing",
        "intent": "",
        "tool_calls_made": state.get("tool_calls_made", 0),
        "error": None,
    }

    yield {
        "event": "processing_start",
        "data": json.dumps({"thread_id": tid, "status": "Consulting the celestial records..."}),
    }

    try:
        yield {
            "event": "tool_start",
            "data": json.dumps({"tool": "compute_birth_chart", "status": "running"}),
        }

        final_state: dict[str, Any] = await asyncio.to_thread(
            compiled_graph.invoke, input_state
        )

        thread_store[tid] = final_state
        intent = final_state.get("intent", "")
        tool_calls_made = final_state.get("tool_calls_made", 0)

        yield {
            "event": "intent_classified",
            "data": json.dumps({"intent": intent, "phase": "routing"}),
        }

        yield {
            "event": "tool_end",
            "data": json.dumps({
                "tool": "compute_birth_chart" if tool_calls_made > 0 else "none",
                "status": "complete",
            }),
        }

        result_messages = final_state.get("messages", [])
        last_ai_msg = next(
            (m for m in reversed(result_messages) if isinstance(m, AIMessage)), None
        )

        if last_ai_msg:
            content = str(last_ai_msg.content)
            chunk_size = 5
            for i in range(0, len(content), chunk_size):
                chunk = content[i: i + chunk_size]
                yield {"event": "token", "data": json.dumps({"token": chunk})}
                await asyncio.sleep(0.012)

        yield {
            "event": "done",
            "data": json.dumps({
                "thread_id": tid,
                "phase": final_state.get("phase", "done"),
                "tool_calls_made": tool_calls_made,
                "chart_available": final_state.get("chart_cache") is not None,
                "intent": intent,
            }),
        }

    except asyncio.CancelledError:
        log.info("stream.cancelled", thread_id=tid)
        yield {"event": "error", "data": json.dumps({"error": "Stream cancelled."})}
    except Exception as exc:
        log.error("stream.error", thread_id=tid, error=str(exc))
        yield {"event": "error", "data": json.dumps({"error": f"Error: {str(exc)[:200]}"})}


@app.post("/api/chat", response_model=ChatResponse)
async def chat_non_streaming(request: ChatRequest) -> ChatResponse:
    tid, state = _get_or_create_thread(request.thread_id)
    current_messages = list(state.get("messages", []))
    current_messages.append(HumanMessage(content=request.message))
    input_state = {
        "messages": current_messages,
        "birth_details": request.birth_details or state.get("birth_details"),
        "chart_cache": state.get("chart_cache"),
        "phase": "routing",
        "intent": "",
        "tool_calls_made": state.get("tool_calls_made", 0),
        "error": None,
    }
    try:
        final_state = await asyncio.to_thread(compiled_graph.invoke, input_state)
        thread_store[tid] = final_state
        result_messages = final_state.get("messages", [])
        last_ai = next((m for m in reversed(result_messages) if isinstance(m, AIMessage)), None)
        response_text = str(last_ai.content) if last_ai else "The stars are silent for now."
        return ChatResponse(
            thread_id=tid,
            message=response_text,
            phase=final_state.get("phase", "done"),
            tool_calls_made=final_state.get("tool_calls_made", 0),
            chart_available=final_state.get("chart_cache") is not None,
        )
    except Exception as exc:
        log.error("chat.non_streaming.error", thread_id=tid, error=str(exc))
        raise HTTPException(status_code=500, detail=f"Graph execution failed: {exc}")


@app.get("/api/chat/stream")
async def chat_streaming(
    request: Request,
    message: str = Query(..., min_length=1, max_length=4000),
    thread_id: Optional[str] = Query(default=None),
    birth_date: Optional[str] = Query(default=None),
    birth_time: Optional[str] = Query(default=None),
    latitude: Optional[float] = Query(default=None),
    longitude: Optional[float] = Query(default=None),
    timezone: Optional[str] = Query(default=None),
) -> EventSourceResponse:
    birth_details: Optional[dict[str, Any]] = None
    if all([birth_date, birth_time, latitude is not None, longitude is not None, timezone]):
        birth_details = {
            "date": birth_date, "time": birth_time,
            "latitude": latitude, "longitude": longitude, "timezone": timezone,
        }
    log.info("chat.stream.request", thread_id=thread_id, message_preview=message[:60], has_birth_details=birth_details is not None)
    tid = thread_id or str(uuid.uuid4())

    async def event_generator() -> AsyncGenerator[dict[str, Any], None]:
        async for event in _stream_graph_events(tid, message, birth_details):
            if await request.is_disconnected():
                break
            yield event

    return EventSourceResponse(event_generator())


@app.post("/api/chat/stream")
async def chat_streaming_post(request: Request, body: ChatRequest) -> EventSourceResponse:
    tid = body.thread_id or str(uuid.uuid4())
    log.info("chat.stream.post.request", thread_id=tid, message_preview=body.message[:60])

    async def event_generator() -> AsyncGenerator[dict[str, Any], None]:
        async for event in _stream_graph_events(tid, body.message, body.birth_details):
            if await request.is_disconnected():
                break
            yield event

    return EventSourceResponse(event_generator())


@app.get("/api/thread/{thread_id}")
async def get_thread(thread_id: str) -> JSONResponse:
    if thread_id not in thread_store:
        raise HTTPException(status_code=404, detail="Thread not found")
    state = thread_store[thread_id]
    messages_serialized = [{"type": m.__class__.__name__, "content": str(m.content)[:500]} for m in state.get("messages", [])]
    return JSONResponse({
        "thread_id": thread_id, "phase": state.get("phase"), "intent": state.get("intent"),
        "tool_calls_made": state.get("tool_calls_made", 0),
        "chart_available": state.get("chart_cache") is not None,
        "message_count": len(messages_serialized), "messages": messages_serialized,
    })


@app.get("/api/chart/{thread_id}")
async def get_chart(thread_id: str) -> JSONResponse:
    if thread_id not in thread_store:
        raise HTTPException(status_code=404, detail="Thread not found")
    state = thread_store[thread_id]
    chart_cache = state.get("chart_cache")
    if not chart_cache:
        raise HTTPException(status_code=404, detail="No chart computed for this thread")
    return JSONResponse(json.loads(chart_cache))


@app.get("/health")
async def health_check() -> JSONResponse:
    return JSONResponse({"status": "ok", "service": "astroagent", "version": "1.0.0"})


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True, log_level="info")
