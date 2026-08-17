from typing import Optional, TypedDict


class TaxAgentState(TypedDict):
    user_query: str
    income_types: list[str]
    income_data: dict
    missing_info: list[str]
    search_queries: list[str]
    retrieved_docs: list[dict]
    deductions: list[dict]
    tax_result: Optional[dict]
    verified: bool
    verification_notes: str
    retry_count: int
    final_answer: str
