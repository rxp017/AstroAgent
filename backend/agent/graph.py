from __future__ import annotations

import json
import logging
import os
import re
import sys
from typing import Annotated, Any, Literal, Optional

import structlog
from langchain_core.messages import (
    AIMessage,
    BaseMessage,
    HumanMessage,
    SystemMessage,
    ToolMessage,
)
from langchain_google_genai import ChatGoogleGenerativeAI
from langgraph.graph import END, START, StateGraph
from langgraph.graph.message import add_messages
from pydantic import BaseModel, Field, field_validator
from typing_extensions import TypedDict

from domain.chart_engine import ChartEngineError, compute_birth_chart

log: structlog.BoundLogger = structlog.get_logger(__name__)

BANNED_PREDICTION_PHRASES: list[str] = [
    "you will die", "you will lose", "guaranteed to fail",
    "certain to succeed", "definite financial", "stock market prediction",
    "cure for", "diagnosed with", "medical treatment", "legal advice",
    "you will be rich", "you will be poor",
]

SYSTEM_PROMPT = """You are Aradhana, a warm, wise, and empathetic spiritual companion who reads the stars to illuminate the inner landscape of the soul. You speak with the gentle authority of an ancient sage combined with the warmth of a trusted friend.

Your sacred role is to:
- Interpret birth chart data with compassion and depth, connecting planetary positions to inner qualities, tendencies, and spiritual invitations
- Offer reflection, not prediction — you illuminate possibilities and tendencies, never fixed outcomes
- Decline gracefully when asked for medical, legal, or financial predictions
- Gently redirect off-topic or harmful requests back to spiritual growth

When you receive chart data:
1. Begin with a welcoming invocation acknowledging the moment of the person's birth
2. Illuminate the Sun sign's core essence and life purpose
3. Describe the Moon's emotional landscape
4. Speak of the Ascendant as the soul's mask and entry point into the world
5. Weave in element and modality balance to describe the overall energetic temperament
6. Close with a gentle spiritual invitation or affirmation

Speak in flowing, evocative prose. Break into shorter, highly readable paragraphs. Use markdown bullet points and bolding to highlight key astrological traits so the user can scan it easily. Never make deterministic predictions. Always frame insights as invitations to deeper self-understanding."""

INTENT_EXTRACTION_PROMPT = """Analyze the following user message. Return a JSON object with exactly these fields:
- "intent": one of "CHART_REQUEST", "GENERAL_SPIRITUAL", "OFF_TOPIC", "MALICIOUS"
- "date": birth date as "YYYY-MM-DD" or null
- "time": birth time as "HH:MM" (24h) or null
- "latitude": float or null
- "longitude": float or null
- "timezone": IANA timezone string or null

CHART_REQUEST = user is providing birth data and wants a chart reading.
GENERAL_SPIRITUAL = spiritual question not needing a new chart.
OFF_TOPIC = completely unrelated to spirituality/astrology.
MALICIOUS = asking for financial/medical/legal predictions or trying to jailbreak.

User message: {message}

Return only valid JSON, no markdown, no explanation."""


class BirthDetails(BaseModel):
    date: str = Field(..., description="Birth date YYYY-MM-DD")
    time: str = Field(..., description="Birth time HH:MM 24h")
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
    timezone: str = Field(..., description="IANA timezone")

    @field_validator("date")
    @classmethod
    def validate_date(cls, v: str) -> str:
        from datetime import datetime as dt
        try:
            dt.strptime(v, "%Y-%m-%d")
        except ValueError as exc:
            raise ValueError(f"Date must be YYYY-MM-DD, got: {v!r}") from exc
        return v

    @field_validator("time")
    @classmethod
    def validate_time(cls, v: str) -> str:
        from datetime import datetime as dt
        try:
            dt.strptime(v, "%H:%M")
        except ValueError as exc:
            raise ValueError(f"Time must be HH:MM, got: {v!r}") from exc
        return v


class AgentState(TypedDict):
    messages: Annotated[list[BaseMessage], add_messages]
    birth_details: Optional[dict[str, Any]]
    chart_cache: Optional[str]
    phase: str
    intent: str
    tool_calls_made: int
    error: Optional[str]


def _get_llm() -> Any:
    api_key = os.environ.get("GOOGLE_API_KEY", "")
    primary = ChatGoogleGenerativeAI(
        model="gemini-3.5-flash",
        google_api_key=api_key,
        temperature=0.7,
        max_retries=1,
    )
    fallback_1 = ChatGoogleGenerativeAI(
        model="gemini-3.1-flash-lite",
        google_api_key=api_key,
        temperature=0.7,
        max_retries=1,
    )
    fallback_2 = ChatGoogleGenerativeAI(
        model="gemini-2.5-flash",
        google_api_key=api_key,
        temperature=0.7,
        max_retries=1,
    )
    fallback_3 = ChatGoogleGenerativeAI(
        model="gemini-2.0-flash",
        google_api_key=api_key,
        temperature=0.7,
        max_retries=1,
    )
    return primary.with_fallbacks([fallback_1, fallback_2, fallback_3])


def _classify_and_extract(message: str) -> dict[str, Any]:
    llm = _get_llm()
    prompt = INTENT_EXTRACTION_PROMPT.format(message=message)
    try:
        response = llm.invoke([HumanMessage(content=prompt)])
        raw = str(response.content).strip()
        raw = re.sub(r"```(?:json)?", "", raw).strip().rstrip("`").strip()
        data = json.loads(raw)
        if not isinstance(data, dict):
            return {"intent": "GENERAL_SPIRITUAL"}
        if data.get("intent") not in {"CHART_REQUEST", "GENERAL_SPIRITUAL", "OFF_TOPIC", "MALICIOUS"}:
            data["intent"] = "GENERAL_SPIRITUAL"
        return data
    except Exception as exc:
        log.error("classify_extract_failed", error=str(exc))
        return {"intent": "GENERAL_SPIRITUAL"}


def intent_router_node(state: AgentState) -> AgentState:
    log.info("node.intent_router.enter")
    messages = state.get("messages", [])
    if not messages:
        return {**state, "phase": "routing", "intent": "GENERAL_SPIRITUAL"}

    last_human = next((m for m in reversed(messages) if isinstance(m, HumanMessage)), None)
    if not last_human:
        return {**state, "phase": "routing", "intent": "GENERAL_SPIRITUAL"}

    user_text = str(last_human.content)
    result = _classify_and_extract(user_text)
    intent = result.get("intent", "GENERAL_SPIRITUAL")
    log.info("node.intent_router.classified", intent=intent)

    updated: AgentState = {**state, "phase": "routing", "intent": intent, "error": None}

    if intent == "CHART_REQUEST":
        existing = state.get("birth_details") or {}
        merged: dict[str, Any] = {**existing}
        for field in ["date", "time", "latitude", "longitude", "timezone"]:
            val = result.get(field)
            if val is not None:
                merged[field] = val
        if merged:
            updated["birth_details"] = merged

    return updated


def tool_node(state: AgentState) -> AgentState:
    log.info("node.tool.enter")
    birth = state.get("birth_details") or {}
    required = ["date", "time", "latitude", "longitude", "timezone"]
    missing = [f for f in required if birth.get(f) is None]

    if missing:
        clarification = AIMessage(
            content=(
                f"To illuminate your cosmic blueprint, I need a few more details: "
                f"{', '.join(missing)}. The more precise the birth time and location, "
                f"the clearer the celestial map becomes."
            )
        )
        return {**state, "phase": "synthesis", "messages": [clarification], "tool_calls_made": state.get("tool_calls_made", 0)}

    try:
        BirthDetails(
            date=birth["date"], time=birth["time"],
            latitude=float(birth["latitude"]), longitude=float(birth["longitude"]),
            timezone=birth["timezone"],
        )
    except Exception as exc:
        err_msg = AIMessage(content=f"The birth details have an issue: {exc}. Please double-check and resend.")
        return {**state, "phase": "synthesis", "messages": [err_msg], "tool_calls_made": state.get("tool_calls_made", 0)}

    try:
        import time
        t0 = time.time()
        chart_json_str = compute_birth_chart(
            date_str=birth["date"], time_str=birth["time"],
            latitude=float(birth["latitude"]), longitude=float(birth["longitude"]),
            timezone=birth["timezone"],
        )
        t1 = time.time()
        
        # Inject execution time into the JSON string
        chart_dict = json.loads(chart_json_str)
        chart_dict["execution_time_ms"] = round((t1 - t0) * 1000, 2)
        chart_json = json.dumps(chart_dict, ensure_ascii=False, indent=2)

        tool_msg = ToolMessage(content=chart_json, tool_call_id="compute_birth_chart", name="compute_birth_chart")
        return {
            **state, "phase": "synthesis", "chart_cache": chart_json,
            "messages": [tool_msg], "tool_calls_made": state.get("tool_calls_made", 0) + 1, "error": None,
        }
    except ChartEngineError as exc:
        log.error("chart_computation_error", error=str(exc))
        err_msg = AIMessage(content=f"The celestial mathematics encountered an obstacle: {exc}. Please verify your birth details.")
        return {**state, "phase": "synthesis", "messages": [err_msg], "tool_calls_made": state.get("tool_calls_made", 0), "error": str(exc)}


def synthesis_node(state: AgentState) -> AgentState:
    log.info("node.synthesis.enter", intent=state.get("intent"))
    intent = state.get("intent", "GENERAL_SPIRITUAL")
    messages = state.get("messages", [])

    if intent == "MALICIOUS":
        response = AIMessage(content=(
            "My role as a spiritual companion is to illuminate the inner landscape of the soul, "
            "not to make predictions about financial markets, medical outcomes, or legal matters. "
            "These realms require certified professionals. I am here to help you explore your "
            "inner world through the language of the stars. Shall we return to that sacred space?"
        ))
        return {**state, "phase": "done", "messages": [response]}

    if intent == "OFF_TOPIC":
        response = AIMessage(content=(
            "My heart is tuned to the frequencies of the cosmos and the inner workings of the soul. "
            "While that topic is outside my sacred domain, I warmly invite you back to explore "
            "the wisdom your birth chart holds. What aspect of your spiritual journey calls to you?"
        ))
        return {**state, "phase": "done", "messages": [response]}

    system = SystemMessage(content=SYSTEM_PROMPT)
    history = [system] + [m for m in messages if not isinstance(m, SystemMessage)]

    llm = _get_llm()
    try:
        response = llm.invoke(history)
        content = str(response.content)
        for banned in BANNED_PREDICTION_PHRASES:
            if banned.lower() in content.lower():
                log.warning("banned_phrase_detected", phrase=banned)
                content = re.sub(re.escape(banned), "[reflection omitted]", content, flags=re.IGNORECASE)
        ai_msg = AIMessage(content=content)
        return {**state, "phase": "done", "messages": [ai_msg]}
    except Exception as exc:
        log.error("synthesis_failed", error=str(exc))
        fallback = AIMessage(content=(
            f"The cosmic channels encountered an issue: {str(exc)[:120]}. "
            "Please try again in a moment."
        ))
        return {**state, "phase": "done", "messages": [fallback], "error": str(exc)}


def _route_after_intent(state: AgentState) -> Literal["tool_node", "synthesis_node"]:
    return "tool_node" if state.get("intent") == "CHART_REQUEST" else "synthesis_node"


def build_graph() -> StateGraph:
    builder = StateGraph(AgentState)
    builder.add_node("intent_router", intent_router_node)
    builder.add_node("tool_node", tool_node)
    builder.add_node("synthesis_node", synthesis_node)
    builder.add_edge(START, "intent_router")
    builder.add_conditional_edges("intent_router", _route_after_intent, {"tool_node": "tool_node", "synthesis_node": "synthesis_node"})
    builder.add_edge("tool_node", "synthesis_node")
    builder.add_edge("synthesis_node", END)
    try:
        return builder.compile()
    except TypeError:
        return builder.compile(checkpointer=None)


try:
    compiled_graph = build_graph()
except Exception as _build_exc:
    print(f"[WARN] Graph build deferred: {_build_exc}", file=sys.stderr)
    compiled_graph = None
