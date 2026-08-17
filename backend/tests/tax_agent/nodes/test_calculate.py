from app.tax_agent.nodes.calculate import calculate_node


async def test_calculate_node_populates_tax_result_and_deductions():
    state = {
        "user_query": "", "income_types": ["근로소득"],
        "income_data": {"근로소득": {"gross": 30_000_000}},
        "missing_info": [], "search_queries": [], "retrieved_docs": [],
        "deductions": [], "tax_result": None, "verified": False,
        "verification_notes": "", "retry_count": 0, "final_answer": "",
    }

    result = await calculate_node(state)

    assert result["tax_result"]["gross_income"] == 30_000_000
    assert any(d["name"] == "근로소득공제" for d in result["deductions"])
