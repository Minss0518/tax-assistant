from unittest.mock import MagicMock, patch

from tax_law_pipeline import law_api_client


def _fake_response(json_body: dict):
    resp = MagicMock()
    resp.raise_for_status = MagicMock()
    resp.json.return_value = json_body
    return resp


def test_fetch_law_returns_inner_dict():
    # 실제 API 응답 구조 (소득세법, MST=280405)
    body = {
        "법령": {
            "법령키": "001565-20260701-00280405",
            "기본정보": {"법령명_한글": "소득세법"},
            "조문": {
                "조문단위": [
                    {
                        "조문번호": "1",
                        "조문여부": "전문",
                        "조문내용": "            제1장 총칙 <개정 2009.12.31>",
                    },
                    {
                        "조문번호": "15",
                        "조문여부": "조문",
                        "조문제목": "세액 계산의 순서",
                        "조문내용": "제15조(세액 계산의 순서) 거주자의 종합소득 및 퇴직소득에 대한 소득세는...",
                    },
                ]
            },
        }
    }
    with patch("httpx.get", return_value=_fake_response(body)) as mock_get:
        result = law_api_client.fetch_law("280405", oc="test-oc")

    assert result["법령키"] == "001565-20260701-00280405"
    assert len(result["조문"]["조문단위"]) == 2
    assert mock_get.call_args.kwargs["params"]["MST"] == "280405"
    assert mock_get.call_args.kwargs["params"]["target"] == "law"


def test_fetch_prec_returns_none_when_json_detail_unavailable():
    # 실제로 재현되는 실패 응답: 검색 결과에 있는 판례라도 JSON 상세조회가 안 되는 경우가 있음
    body = {"Law": "일치하는 판례가 없습니다.  판례명을 확인하여 주십시오."}
    with patch("httpx.get", return_value=_fake_response(body)):
        result = law_api_client.fetch_prec("622745", oc="test-oc")

    assert result is None


def test_fetch_prec_returns_detail_dict_on_success():
    body = {
        "PrecService": {
            "판시사항": "<br/> 2인의 공동사업자 중...",
            "판결요지": "<br/> 소득세법 제27조 제1항...",
            "참조조문": " 소득세법 제27조 제1항, 제3항...",
            "선고일자": "20260312",
            "법원명": "대법원",
            "사건명": "종합소득세부과처분취소",
            "판례내용": "【원고, 상고인】 ...",
            "사건번호": "2025두35585",
        }
    }
    with patch("httpx.get", return_value=_fake_response(body)) as mock_get:
        result = law_api_client.fetch_prec("618513", oc="test-oc")

    assert result["사건번호"] == "2025두35585"
    assert mock_get.call_args.kwargs["params"]["ID"] == "618513"
    assert mock_get.call_args.kwargs["params"]["target"] == "prec"
    assert "MST" not in mock_get.call_args.kwargs["params"]


def test_fetch_expc_returns_detail_dict_on_success():
    body = {
        "ExpcService": {
            "해석기관코드": "1170000",
            "안건번호": "11-0150",
            "이유": "「소득세법」 제70조에서는...",
            "해석기관명": "법제처",
            "해석일자": "20110504",
            "안건명": " 민원인 - 2인으로부터 근로소득을...",
            "질의요지": "2인으로부터 지급받은 근로소득만이...",
            "회답": "2인으로부터 지급받은 근로소득만이...",
        }
    }
    with patch("httpx.get", return_value=_fake_response(body)) as mock_get:
        result = law_api_client.fetch_expc("313517", oc="test-oc")

    assert result["안건번호"] == "11-0150"
    assert mock_get.call_args.kwargs["params"]["ID"] == "313517"
    assert mock_get.call_args.kwargs["params"]["target"] == "expc"
