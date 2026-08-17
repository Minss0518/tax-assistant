"""소득세법 조문 중 종합소득세 관련 조문만 골라내는 필터.

실제 API 응답에서 조문단위 배열에는 장/절 제목용 항목(조문여부='전문')과 실제 조문
(조문여부='조문')이 섞여 있다. 장/절 제목 항목은 조문제목 필드가 아예 없다.
"""


def filter_comprehensive_income_articles(law_detail: dict | None) -> list[dict]:
    if not law_detail:
        return []

    units = law_detail.get("조문", {}).get("조문단위", [])
    if isinstance(units, dict):
        units = [units]

    matched = []
    for unit in units:
        if unit.get("조문여부") != "조문":
            continue
        title = unit.get("조문제목") or ""
        content = unit.get("조문내용") or ""
        if "종합소득" in title or "종합소득" in content:
            matched.append(unit)

    return matched
