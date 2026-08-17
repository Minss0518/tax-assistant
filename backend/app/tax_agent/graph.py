from langgraph.graph import END, START, StateGraph

from app.tax_agent.nodes.calculate import calculate_node
from app.tax_agent.nodes.classify import classify_node
from app.tax_agent.nodes.clarify import clarify_node
from app.tax_agent.nodes.guard import guard_node
from app.tax_agent.nodes.intake import intake_node
from app.tax_agent.nodes.respond import respond_node
from app.tax_agent.nodes.retrieve import retrieve_node
from app.tax_agent.nodes.verify import verify_node
from app.tax_agent.state import TaxAgentState

MAX_RETRY = 2


def route_after_guard(state: TaxAgentState) -> str:
    return END if state.get("final_answer") else "intake"


def route_after_intake(state: TaxAgentState) -> str:
    # Defensive check: even if the LLM reported no missing_info, never proceed
    # to calculation with zero income data captured. Routing functions cannot
    # mutate state, so clarify_node's question may be generic in this
    # (expected-rare) fallback case; the primary defense is the strengthened
    # INTAKE_SYSTEM_PROMPT in intake.py.
    if not state.get("income_data"):
        return "clarify"
    return "clarify" if state.get("missing_info") else "classify"


def route_after_verify(state: TaxAgentState) -> str:
    if state["verified"] or state["retry_count"] >= MAX_RETRY:
        return "respond"
    return "retrieve"


def build_graph(checkpointer):
    builder = StateGraph(TaxAgentState)
    builder.add_node("guard", guard_node)
    builder.add_node("intake", intake_node)
    builder.add_node("clarify", clarify_node)
    builder.add_node("classify", classify_node)
    builder.add_node("retrieve", retrieve_node)
    builder.add_node("calculate", calculate_node)
    builder.add_node("verify", verify_node)
    builder.add_node("respond", respond_node)

    builder.add_edge(START, "guard")
    builder.add_conditional_edges("guard", route_after_guard, {"intake": "intake", END: END})
    builder.add_conditional_edges("intake", route_after_intake, {"clarify": "clarify", "classify": "classify"})
    builder.add_edge("clarify", "intake")
    builder.add_edge("classify", "retrieve")
    builder.add_edge("retrieve", "calculate")
    builder.add_edge("calculate", "verify")
    builder.add_conditional_edges("verify", route_after_verify, {"respond": "respond", "retrieve": "retrieve"})
    builder.add_edge("respond", END)

    return builder.compile(checkpointer=checkpointer)
