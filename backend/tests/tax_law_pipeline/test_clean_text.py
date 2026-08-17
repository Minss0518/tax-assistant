from tax_law_pipeline.clean_text import clean_text


def test_removes_html_tags():
    assert clean_text("<br/> 소득세법 제27조 제1항, 제3항") == "소득세법 제27조 제1항, 제3항"


def test_normalizes_fullwidth_and_repeated_whitespace():
    assert clean_text("제1장   총칙　　＜개정 2009.12.31＞") == "제1장 총칙 ＜개정 2009.12.31＞"


def test_strips_leading_and_trailing_whitespace():
    assert clean_text("   제15조(세액 계산의 순서)   ") == "제15조(세액 계산의 순서)"


def test_none_and_empty_input_return_empty_string():
    assert clean_text(None) == ""
    assert clean_text("") == ""


def test_real_prec_fragment_from_api():
    raw = "<br/> 소득세법 제27조 제1항, 제3항, 제33조 제1항 제13호, 소득세법 시행령 제55조 제1항 제13호"
    assert clean_text(raw) == "소득세법 제27조 제1항, 제3항, 제33조 제1항 제13호, 소득세법 시행령 제55조 제1항 제13호"
