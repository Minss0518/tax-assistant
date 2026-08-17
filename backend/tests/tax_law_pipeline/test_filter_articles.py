from tax_law_pipeline.filter_articles import filter_comprehensive_income_articles


def _law_detail(units):
    return {"조문": {"조문단위": units}}


def test_excludes_chapter_heading_entries():
    # 실제 API 응답: 장 제목 항목은 조문여부가 '전문'이고 조문제목이 아예 없음
    units = [
        {"조문번호": "1", "조문여부": "전문", "조문내용": "제1장 총칙 <개정 2009.12.31>"},
    ]
    assert filter_comprehensive_income_articles(_law_detail(units)) == []


def test_includes_real_article_mentioning_comprehensive_income():
    # 실제 API 응답: 소득세법 제15조
    units = [
        {
            "조문번호": "15",
            "조문여부": "조문",
            "조문제목": "세액 계산의 순서",
            "조문내용": "제15조(세액 계산의 순서) 거주자의 종합소득 및 퇴직소득에 대한 소득세는...",
        }
    ]
    result = filter_comprehensive_income_articles(_law_detail(units))
    assert len(result) == 1
    assert result[0]["조문번호"] == "15"


def test_excludes_unrelated_article():
    units = [
        {
            "조문번호": "94",
            "조문여부": "조문",
            "조문제목": "양도소득의 범위",
            "조문내용": "제94조(양도소득의 범위) 양도소득은 다음 각 호에서 규정하는 소득으로 한다...",
        }
    ]
    assert filter_comprehensive_income_articles(_law_detail(units)) == []


def test_matches_on_title_even_when_content_does_not_mention_keyword():
    units = [
        {
            "조문번호": "5",
            "조문여부": "조문",
            "조문제목": "종합소득세 과세기간",
            "조문내용": "제5조 이 법에 따른 과세기간은 1월 1일부터 12월 31일까지로 한다.",
        }
    ]
    result = filter_comprehensive_income_articles(_law_detail(units))
    assert len(result) == 1


def test_handles_single_article_collapsed_to_dict():
    # 실제 API 특성: 조문단위가 1개면 리스트가 아니라 dict로 올 수 있음
    law_detail = {
        "조문": {
            "조문단위": {
                "조문번호": "15",
                "조문여부": "조문",
                "조문제목": "세액 계산의 순서",
                "조문내용": "제15조(세액 계산의 순서) 거주자의 종합소득...",
            }
        }
    }
    result = filter_comprehensive_income_articles(law_detail)
    assert len(result) == 1


def test_none_or_missing_articles_returns_empty_list():
    assert filter_comprehensive_income_articles(None) == []
    assert filter_comprehensive_income_articles({}) == []
