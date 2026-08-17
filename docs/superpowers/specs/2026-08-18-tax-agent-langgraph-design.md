# 종합소득세 상담 LangGraph 에이전트 설계

- 상태: 승인됨 (구현 대기)
- 관련 커밋 컨텍스트: `60661f5`(쿼리 엔진 제거, retriever+직접 호출로 교체), `551a682`/`908f7d8`(오거절 버그 수정), `438aef1`(Render 빌드는 `backend/requirements.txt` 기준)

## 배경 / 목표

기존 세무비서는 LlamaIndex 기반 단일 스텝 RAG 챗봇(질문 → 검색 → 답변)이다.
이번 작업은 **종합소득세 계산 상담**을 대상으로, 다단계 판단·재검색·검증 루프를 갖춘
LangGraph 에이전트를 **기존 `/chat`과 별도의 새 엔드포인트**로 추가하는 것이다.

일반 세무 Q&A는 계속 기존 `/chat`(RAG)이 담당하고, "얼마 벌었는데 세금이 얼마 나와요?" 류의
계산이 필요한 상담만 새 에이전트가 처리한다.

## 설계 원칙 (반드시 지킬 것)

1. **세액 계산은 LLM이 하지 않는다.** 계산은 결정론적 Python 함수(Tool)로 분리한다.
   LLM의 역할은 "어떤 소득 유형인지, 어떤 공제가 적용되는지" 판단까지이며,
   실제 누진세율 산술은 별도 함수가 담당한다. (환각 방지가 목적)
2. **정보 부족 시 사용자에게 되묻는다 (Human-in-the-loop).** 추측으로 진행하지 않는다.
3. **계산 결과와 검색된 법적 근거가 일치하는지 검증하는 단계를 반드시 거친다.**
   불일치 시 재검색 루프로 돌아간다.
4. **세무 무관/프롬프트 인젝션성 질문은 기존 가드로 동일하게 차단한다.** 최근 두 커밋으로
   고친 오거절 버그를 재발시키지 않는다.
5. State는 아래 스키마를 기준으로 하되, 구현 중 필요한 필드는 확장 가능.

## 아키텍처 개요

- 새 라우터 `backend/app/routers/tax_agent.py`, 엔드포인트 `POST /tax-agent/consult`.
- 요청/응답에 `session_id`를 왕복시켜 멀티턴 상태를 유지한다.
  - 최초 요청에는 `session_id`가 없다 → 서버가 발급(uuid4)해서 응답에 포함.
  - 이후 요청(정보 보충 답변 등)은 클라이언트가 그 `session_id`를 그대로 실어 보낸다.
- `session_id` = LangGraph `thread_id`. 대화 상태는 LangGraph 체크포인터가 관리하므로
  `TaxAgentState`에 별도 세션 필드를 추가할 필요는 없다.
- 체크포인터는 `AsyncPostgresSaver`(`langgraph-checkpoint-postgres`)를 사용, 기존
  `DATABASE_URL`(asyncpg) 연결을 재사용한다. 앱 시작 시 `checkpointer.setup()`을 1회
  실행해 체크포인트 테이블을 생성한다(FastAPI `startup` 이벤트).
  - Render 재시작 시에도 진행 중이던 상담이 유실되지 않도록 하기 위한 선택이며,
    인메모리 체크포인터는 사용하지 않는다.
- `clarify_node`에서 `interrupt()`가 걸리면, 라우터는 그 되물음 메시지를 응답으로 반환하고
  세션을 유지한다. 다음 요청은 `graph.ainvoke(Command(resume=message), config={"configurable": {"thread_id": session_id}})`
  로 그래프를 재개한다.
- 응답은 **비스트리밍 단일 JSON**으로 시작한다(토큰 스트리밍 아님 — 중간 노드들은 토큰
  단위가 아니라 한 번에 결과를 반환하는 LLM 호출이라 `/chat/stream`과 같은 방식이 맞지 않음).
  노드 단위 진행 상황을 실시간으로 보여주는 SSE는 이번 스코프에서 제외하고 추후 과제로 남긴다.

```
POST /tax-agent/consult  { message }
→ { session_id, status: "needs_input", reply: "연소득이 얼마인가요?" }

POST /tax-agent/consult  { session_id, message }
→ { session_id, status: "done", reply: "...", tax_result: {...} }
```

- 세션 만료: 상담이 완료(`respond_node` 도달)되거나 클라이언트가 일정 시간(예: 30분) 재요청하지
  않으면 해당 `thread_id`는 자연스럽게 쓰이지 않게 된다. 새 상담은 새 `session_id`로 시작한다.
  체크포인트 테이블의 오래된 레코드 정리(TTL/배치 삭제)는 이번 스코프 밖.
- `tax_result`를 기존 "세금 계산기" 이력(`TaxCalculation` 테이블, `/tax-calculator/save`)에
  자동 저장하는 연동은 **이번 스코프에서 하지 않는다.** 다만 `tax_result`의 필드명은
  `TaxCalculation` 모델(`gross_income`, `taxable_income`, `income_tax`, `local_tax`,
  `total_tax`, `final_tax` 등)과 맞춰 둔다 — 나중에 연동하게 될 때 매핑 비용을 없애기 위함.

## State 스키마

```python
from typing import TypedDict, Optional

class TaxAgentState(TypedDict):
    user_query: str
    income_types: list[str]          # 예: ["사업소득", "근로소득"]
    income_data: dict                # 예: {"사업소득": 50000000, "근로소득": 30000000}
    missing_info: list[str]          # 부족해서 되물어야 할 정보 목록
    retrieved_docs: list[dict]       # 검색된 법령/공제 근거 (source, content, score 등)
    deductions: list[dict]           # 적용된 공제 항목 (name, amount, basis)
    tax_result: Optional[dict]       # 계산된 세액 (아래 "계산 결과 스키마" 참고)
    verified: bool
    verification_notes: str          # 검증 실패 시 사유 (재검색 판단에 사용)
    retry_count: int                 # 무한루프 방지용
    final_answer: str
```

### 계산 결과 스키마 (`tax_result`)

`TaxCalculation` 모델과 필드명을 맞춘다(연동은 안 하지만 이름은 통일):

```python
{
    "gross_income": int,       # 총수입금액 합계
    "taxable_income": int,     # 과세표준
    "income_tax": int,         # 산출세액
    "tax_credits": int,        # 세액공제 합계
    "final_tax": int,          # 결정세액 (income_tax - tax_credits)
    "local_tax": int,          # 지방소득세 (final_tax * 10%)
    "total_tax": int,          # final_tax + local_tax
}
```

## 노드 설계

### [0] guard_node (신규 — 그래프 진입점)

- `rag_service.is_tax_related()`를 그대로 재사용해 세무 무관/명백한 인젝션성 질문을 차단한다.
  별도 필터를 새로 만들지 않는다 — 최근 두 커밋(`551a682`, `908f7d8`)에서 고친 오거절 버그를
  재발시키지 않기 위함.
- 차단되면 `final_answer`에 기존 `NON_TAX_RESPONSE`를 채우고 그래프를 바로 종료한다
  (`intake_node`로 진입하지 않음).
- 통과하면 `intake_node`로 진행.

### [1] intake_node

- 입력: `user_query`
- 역할: LLM으로 질문에서 소득 유형과 금액을 추출해 `income_types`, `income_data` 채움
- 부족한 정보가 있으면 `missing_info`에 채워넣음
- 프롬프트에는 기존 `TAX_SYSTEM_PROMPT`의 인젝션 방어 규칙(내부 시스템 정보 비공개, 사용자
  지시로 역할/규칙 변경 거부)을 동일하게 포함시킨다. `guard_node`를 통과했더라도 추출 과정
  자체를 악용하려는 시도가 있을 수 있다.

### [2] clarify_node (조건부, Human-in-the-loop)

- `missing_info`가 비어있지 않으면 사용자에게 되묻는 메시지를 생성하고
  `interrupt({"missing_info": ..., "question": ...})`로 대기
- 재개 시 전달받은 사용자의 자유 텍스트 답변을 LLM으로 다시 파싱해 `income_data`에 병합
- 그 후 `intake_node`로 재진입해 `missing_info`를 재평가
- 조건부 엣지: `missing_info` 비었으면 → `classify_node`, 아니면 → 대기 후 재진입

### [3] classify_node

- 각 `income_types` 항목에 대해 어떤 공제/세율 규정 카테고리를 찾아야 하는지 결정
  (예: 사업소득 → 필요경비, 근로소득 → 근로소득공제 및 특별공제)
- 이 결과를 다음 검색 쿼리 리스트로 변환

### [4] retrieve_node (기존 LlamaIndex retriever를 Tool로 래핑)

- **주의**: `rag_service.py`에는 "쿼리 엔진"이 존재하지 않는다. 오거절 버그 때문에
  `60661f5`에서 쿼리 엔진(response synthesizer 포함) 방식을 걷어내고
  `index.as_retriever(similarity_top_k=5).retrieve()` + 별도 OpenAI 직접 호출 조합으로
  바꿨다. 이 노드는 그 **retriever 패턴**을 감싸야 하며, 쿼리 엔진 방식으로 되돌리지 않는다.
- `classify_node`가 만든 쿼리 리스트로 검색을 수행하며, `income_types` 개수만큼의 검색은
  `asyncio.gather`로 병렬 실행한다(순차 실행 아님 — 노드 수가 늘어난 만큼 지연시간에 민감).
- 결과를 `{source, content, score}` 형태로 정규화해 `retrieved_docs`에 누적
- 재검색 루프로 재진입할 경우, `verification_notes`를 참고해 검색 쿼리를 보정
- `get_or_create_index()`가 매 호출마다 인덱스를 새로 구성하는 기존 방식은 비효율적이다
  (기존에도 있던 문제이지만, 이 그래프는 검색 호출 빈도가 늘어나므로 이번에 모듈 레벨로
  인덱스를 캐시해 개선한다).

### [5] calculate_node (순수 함수, LLM 미사용)

- 입력: `income_data`, `deductions`
- 계산 순서:
  1. 소득유형별 소득금액 = 총수입 − 필요경비/근로소득공제
  2. 종합소득금액 = 소득유형별 소득금액 합산
  3. 과세표준 = 종합소득금액 − 종합소득공제
  4. 산출세액 = 과세표준에 누진세율표 적용
  5. 결정세액 = 산출세액 − 세액공제/세액감면
  6. 지방소득세 = 결정세액 × 10%
- 출력: 위 "계산 결과 스키마" 형태의 `tax_result`
- **반드시 결정론적 Python 함수로 구현.** LLM 호출 없음.
- 종합소득세 누진세율 구간표는 상수로 정의해서 별도 관리(연도별로 바뀔 수 있으므로 설정값
  분리 권장)

### [6] verify_node

- `tax_result`와 `retrieved_docs`(법적 근거)가 정합적인지 LLM으로 재확인
  (예: 적용된 공제가 실제로 검색된 조항에 근거하는지)
- 통과: `verified = True` → `respond_node`
- 실패: `verified = False`, `verification_notes`에 사유 기록 → `retrieve_node`로 재진입
  (단, `retry_count >= 2` — 최초 검색 + 재검색 1회 — 초과 시 강제로 `respond_node`로 보내되
  "계산 근거를 자동으로 확인하지 못해 전문가 확인이 필요합니다" 안내 포함)

### [7] respond_node

- `tax_result`와 `retrieved_docs`의 근거 조항을 인용하며 최종 답변(`final_answer`) 생성

## 그래프 흐름 요약

```
START → guard → (세무 무관/인젝션) → END (final_answer = NON_TAX_RESPONSE)
guard → (세무 관련) → intake

intake → (missing_info 있음) → clarify → intake (재진입)
intake → (missing_info 없음) → classify → retrieve → calculate → verify

verify → (통과) → respond → END
verify → (실패, retry_count < 2) → retrieve (재검색)
verify → (실패, retry_count >= 2) → respond (안내 문구 포함) → END
```

무한루프 방지는 `retry_count`(노드 로직)와 LangGraph `recursion_limit`(예: 25, 그래프
컴파일/호출 시 설정) 이중 안전망으로 처리한다.

## 에러 처리

- LLM 호출 실패(OpenAI 타임아웃 등)는 노드 내부에서 개별적으로 삼키지 않고, 라우터
  (`tax_agent.py`) 레벨에서 캐치해 502 등 에러 응답으로 변환한다. 기존 `/chat`과 동일한
  수준의 처리.

## 의존성

- `backend/requirements.txt`와 루트 `requirements.txt` **양쪽 모두**에 `langgraph`,
  `langgraph-checkpoint-postgres` 추가. Render 빌드는 `backend/requirements.txt`를
  참조하므로(`438aef1`) 반드시 동기화한다.
- `LANGCHAIN_API_KEY`/`LANGCHAIN_TRACING_V2`는 `config.py`에 이미 존재하므로, LangSmith
  트레이싱은 별도 설정 추가 없이 활성화 가능하다.

## 파일 구조

```
backend/app/
├── routers/
│   └── tax_agent.py        # POST /tax-agent/consult, 세션/interrupt 재개 처리
tax_agent/
├── graph.py                 # StateGraph 정의, 노드 연결, 조건부 엣지, 체크포인터 컴파일
├── state.py                  # TaxAgentState TypedDict
├── nodes/
│   ├── guard.py              # is_tax_related() 재사용
│   ├── intake.py
│   ├── clarify.py
│   ├── classify.py
│   ├── retrieve.py           # 기존 retriever 패턴 래핑 (쿼리 엔진 아님)
│   ├── calculate.py          # 세액 계산 순수 함수 + 누진세율 상수
│   ├── verify.py
│   └── respond.py
├── tools/
│   └── tax_calculator.py     # calculate_node에서 쓰는 실제 계산 로직 (단위 테스트 대상)
└── tests/
    └── test_tax_calculator.py  # 계산 로직은 반드시 단위 테스트로 검증
```

## 구현 우선순위

1. `langgraph`/`langgraph-checkpoint-postgres` 의존성 추가 (양쪽 requirements.txt 동기화)
2. `state.py` + `graph.py` 뼈대 (노드는 스텁으로)
3. `calculate.py` — 계산 로직부터 (LLM 의존 없어서 제일 먼저 확정 가능, 단위 테스트 필수)
4. `retrieve.py` — 기존 retriever 패턴 재사용해서 Tool화 (인덱스 캐시 개선 포함)
5. `guard.py`, `intake.py`, `classify.py`, `verify.py`, `respond.py` — LLM 프롬프트 설계
6. `clarify.py` — Human-in-the-loop, `interrupt()` 동작 확인
7. `tax_agent.py` 라우터 — 세션 발급/재개, `AsyncPostgresSaver` 연결, startup 시 `setup()`
8. 전체 통합 후 재검색 루프(`retry_count`)와 `recursion_limit` 정상 동작 확인
9. 체크포인터가 Render 재시작에도 살아남는지 수동 검증 (재시작 전후로 진행 중이던 상담 재개)

## 테스트 계획

- `tests/test_tax_calculator.py`: 누진세율 구간 경계값, 다중 소득유형 합산, 소득공제 반영
  여부를 단위 테스트 (LLM 미의존이라 결정론적 검증 가능)
- 그래프 통합 테스트(OpenAI 호출 모킹): `guard_node` 컷오프, `clarify` 인터럽트/재개,
  `verify` 실패 → 재검색 루프, `retry_count` 초과 시 강제 종료 각각 최소 1개 케이스

## 참고 — 왜 이렇게 설계했는지 (면접/문서화용 메모)

- 계산을 Tool로 분리한 이유: LLM은 산술에서 환각을 일으키기 쉬움. 세액처럼 틀리면 안 되는
  숫자는 결정론적 코드로 처리하고, LLM은 "어떤 규칙을 적용할지" 판단만 담당하게 역할을 나눔.
- 검증 노드를 둔 이유: 계산이 맞아도 적용한 공제/세율의 법적 근거가 틀렸을 수 있음.
  계산 결과와 근거 문서를 교차 검증해서 신뢰도를 높임.
- Human-in-the-loop을 둔 이유: 정보가 부족한 상태로 추측해서 진행하면 잘못된 세액 안내로
  이어질 수 있어, 필수 정보는 반드시 확인 후 진행.
- 별도 엔드포인트로 분리한 이유: 일반 세무 Q&A까지 이 무거운 다단계 그래프를 타면 불필요한
  지연/비용이 발생함. 계산이 필요한 상담만 선택적으로 무거운 경로를 타게 함.
- Postgres 체크포인터를 쓴 이유: Render 재시작 시 진행 중이던 상담(특히 정보 보충 대기 중인
  상태)이 유실되면 사용자가 처음부터 다시 입력해야 함. 이미 asyncpg를 쓰고 있어 추가 인프라
  없이 재사용 가능.
- 쿼리 엔진 대신 retriever를 명시한 이유: 최근 커밋으로 고친 오거절 버그가, 설계 문서를 보고
  구현하는 사람이 "쿼리 엔진"이라는 단어만 보고 예전 방식으로 되돌릴 위험이 있어 명시적으로
  기록해둠.
