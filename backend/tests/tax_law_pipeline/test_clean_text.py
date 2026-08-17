from tax_law_pipeline.clean_text import clean_text


def test_removes_html_tags():
    assert clean_text("<br/> 소득세법 제27조 제1항, 제3항") == "소득세법 제27조 제1항, 제3항"


def test_normalizes_fullwidth_and_repeated_whitespace():
    assert clean_text("제1장   총칙　　<개정 2009.12.31>") == "제1장 총칙"


def test_strips_leading_and_trailing_whitespace():
    assert clean_text("   제15조(세액 계산의 순서)   ") == "제15조(세액 계산의 순서)"


def test_none_and_empty_input_return_empty_string():
    assert clean_text(None) == ""
    assert clean_text("") == ""


def test_real_prec_fragment_from_api():
    raw = "<br/> 소득세법 제27조 제1항, 제3항, 제33조 제1항 제13호, 소득세법 시행령 제55조 제1항 제13호"
    assert clean_text(raw) == "소득세법 제27조 제1항, 제3항, 제33조 제1항 제13호, 소득세법 시행령 제55조 제1항 제13호"


def test_strips_amendment_annotation_from_real_article_content():
    raw = (
        "제15조(세액 계산의 순서) 거주자의 종합소득 및 퇴직소득에 대한 소득세는 이 법에 "
        "특별한 규정이 있는 경우를 제외하고는 다음 각 호에 따라 계산한다. "
        "<개정 2012.1.1, 2014.1.1, 2019.12.31, 2022.12.31>"
    )
    result = clean_text(raw)
    assert "<개정" not in result
    assert result.startswith("제15조(세액 계산의 순서)")
