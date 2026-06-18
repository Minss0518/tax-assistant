# 🧾 세무비서 (Tax Assistant)

> 프리랜서 · 크리에이터를 위한 AI 기반 세금 관리 서비스

[![Live Demo](https://img.shields.io/badge/Live%20Demo-tax--assistant--dsyc.onrender.com-blue?style=flat-square)](https://tax-assistant-dsyc.onrender.com)
[![Python](https://img.shields.io/badge/Python-3.11-blue?style=flat-square&logo=python)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-green?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)](https://react.dev)

---

## 📌 프로젝트 소개

세무비서는 프리랜서와 크리에이터가 세금을 쉽게 관리할 수 있도록 돕는 AI 세금 비서 서비스입니다.

복잡한 세무 지식 없이도 AI 챗봇에게 질문하고, 영수증을 찍으면 자동으로 거래가 등록되며, 예상 세액을 즉시 계산할 수 있습니다. 복잡한 세금 문제는 전문 세무사와 실시간 채팅으로 직접 상담할 수 있습니다.

**배포 URL**: https://tax-assistant-dsyc.onrender.com

---

## 🎯 기획 배경 및 시장 분석

### 문제 인식
프리랜서·크리에이터는 매년 5월 종합소득세 신고를 혼자 해결해야 하지만
세무 지식이 없고, 세무사 상담 비용은 부담스러운 구조입니다.

- 국내 프리랜서·N잡러 종합소득세 신고 대상자 약 550만명
- 세무사 상담 평균 비용 15만원~ (신입 프리랜서에겐 높은 진입장벽)
- 기존 AI 플랫폼은 "신고 자동화"에 집중, 평소 세무 관리 도구 부재

### 기존 서비스의 한계

| 서비스 | 한계 |
|---|---|
| 삼쩜삼 | 홈택스 스크래핑 의존 → 2025년 국세청 서버 차단·규제 리스크 |
| SSEM | 종소세 셀프신고 가능하지만 평소 거래관리·챗봇·세무사 연결 없음 |
| 세무특공대 | AI 기장 자동화 강점이지만 법인·창업자 타겟 (프리랜서 제외) |
| 찾아줘세무사 | 세무사 즉시 매칭 가능하지만 거래관리·AI 챗봇 없음 |

### 세무비서의 차별점
기존 서비스들이 "신고 시즌에만 쓰는 앱"이라면,
세무비서는 **365일 쓰는 AI 세무 비서**를 목표로 합니다.

```
평소 (365일)
→ 거래내역 관리 + OCR 영수증 등록
→ AI 챗봇으로 세무 궁금증 즉시 해결
→ 실시간 세액 확인

신고 시즌 (5월)
→ 누적된 거래 데이터 기반 세금 계산
→ 복잡한 케이스는 세무사 실시간 채팅 연결
```

**핵심 차별화 3가지**
1. **스크래핑 없는 구조** → 홈택스 의존 없음, 규제 리스크 없음
2. **AI 챗봇 + 거래관리 + 세무사 채팅 원스톱** → 시장에 없는 조합
3. **프리랜서·크리에이터 전용** → 타겟 명확, 기존 서비스와 직접 경쟁 없음

---

## ✨ 주요 기능

### 📊 대시보드
- 순이익 + 월별 수입/지출 차트 + 세금 계산 결과를 하나의 헤더에 통합
- **종합소득세 과세기간 기준 차트** (매년 6월 1일 ~ 다음해 5월 31일)
- **년도 선택 버튼** — 현재 과세기간 / 전년도 / 전전년도 전환 가능
- 차트 클릭 시 확대 모달 표시
- Y축 억단위 자동 전환 (만 → 억)
- 탭 메뉴 (거래내역 / AI세무상담 / 세무사상담 / 세금계산기 / 일괄업로드)
- 세금 신고 D-day 카드

### 🤖 AI 세무 상담 (RAG 챗봇)
- LlamaIndex + ChromaDB 기반 RAG 파이프라인
- 세법 문서를 벡터 DB에 저장 후 질문과 관련된 문서 **검색(retriever)**
- 검색된 context를 OpenAI API에 직접 전달하여 답변 생성 (query engine 미사용)
- RAG 문서에 관련 내용이 없어도 세무 질문이면 일반 세무 지식으로 반드시 답변
- GPT-4o-mini 스트리밍 응답 + 법령 출처 표시
- 질문 리라이팅으로 세무 용어 자동 정규화 (예: 종소세 → 종합소득세)
- system/user role 분리로 지시사항이 강하게 적용되는 프롬프트 구조
- 프롬프트 인젝션 방어 처리
- 사용량 제한 (Free 월 5회 / Pro 무제한)

### 💬 세무사 실시간 채팅 상담 (Premium 전용)
- WebSocket 기반 실시간 양방향 채팅
- 비동기 상담 지원 (유저는 언제든 메시지 전송, 세무사는 업무 시간에 답변)
- 상담 상태 관리 (대기중 → 상담중 → 완료)
- 세무사 전용 대시보드 — **년도/월 2단계 필터로 상담 내역 관리**
- 유저/세무사 독립적 상담 삭제 (상대방 데이터 유지)
- 관리자가 세무사 계정 직접 생성 (JWT 인증)
- Premium 플랜 전용 기능 (비Premium 접근 시 업그레이드 유도 모달)

### 📊 AI 인사이트 위젯
- 거래 집계 데이터 + 최근 10건 샘플 기반 분석 (컨텍스트 최적화)
- 카테고리별 지출 비율 바차트 자동 생성
- 이상 지출 자동 탐지 (일평균 대비 500% 초과 지출 감지)
- 자연어 질문 기반 실시간 스트리밍 답변
- AI 세무 챗봇과 동일한 GPT-4o-mini 사용, 단 context가 세법 문서가 아닌 해당 유저의 실제 거래 데이터

### 📷 영수증 OCR
- GPT-4o-mini Vision으로 영수증 이미지 분석
- 날짜, 금액, 항목 자동 추출 → 거래 내역 자동 입력
- OCR 이미지 Supabase Storage 저장 → 거래내역에서 영수증 원본 확인 가능
- 사용량 제한 (Free 월 3회 / Pro 무제한)

### 💸 거래 내역 관리
- 수입 / 지출 CRUD
- AI 카테고리 자동 분류 (로컬 키워드 분류, API 호출 없음)
- CSV / Excel 일괄 업로드 (EUC-KR, 다양한 날짜 형식 지원)
- **무한스크롤 페이지네이션** — 50건씩 순차 로딩 (만건 이상 데이터도 빠르게 렌더링)
- **벌크 INSERT 최적화** — income/expense 분리 + 500건 청크 처리 → 만건 기준 수십 초 처리
- **메모 / 카테고리 검색** — 별도 검색 버튼으로 키워드 필터링
- 수입/지출 탭 필터 + 날짜 범위 필터
- 체크박스 다중 삭제 + **전체 삭제 API** (단건 반복 호출 → 단일 DELETE 쿼리로 최적화)
- 출처 뱃지 표시 (직접입력 / OCR / 파일업로드)
- 영수증 이미지 확인 버튼 + 모달 (OCR 등록 거래)

### 🧮 세금 계산기
- 종합소득세 예상 세액 계산 (2024년 귀속 기준)
- 국민연금 · 건강보험료 자동 계산
- 원천징수 3.3% 자동 반영

### 🔐 인증
- 카카오 / 구글 / 네이버 소셜 로그인 (OAuth 2.0 + JWT)
- 세무사 전용 이메일 + 비밀번호 로그인 (bcrypt 암호화)
- 닉네임 편집 + 프로필 이미지 업로드 (Supabase Storage)

### 💳 결제 / 구독
- 토스페이먼츠 SDK 연동
- **Free / Pro / Premium 3단계 플랜**
  - Free: AI 상담 월 5회, OCR 월 3회
  - Pro: AI 상담 무제한, OCR 무제한, 신고 기간 알림, 월별 세금 리포트 (9,900원/월)
  - Premium: Pro 기능 전체 + 세무사 직접 상담 월 5회 (29,900원/월)
- 구독 취소 시 만료일까지 플랜 유지

### 📱 반응형 UI
- 전 페이지 모바일 대응 (480px 기준 미디어쿼리)
- 모바일에서 요금제 카드 1열 전환, 네비 버튼 축약
- 세무사 상담 페이지 모바일 세로 레이아웃 전환

---

## 🛠 기술 스택

### Backend
| 기술 | 용도 |
|------|------|
| FastAPI | REST API 서버 |
| WebSocket | 실시간 채팅 |
| SQLAlchemy (Async) | ORM |
| PostgreSQL (Supabase) | 데이터베이스 |
| Supabase Storage | 영수증 이미지 / 프로필 이미지 저장 |
| LlamaIndex | RAG 문서 검색 (retriever 전용) |
| ChromaDB | 벡터 데이터베이스 |
| OpenAI GPT-4o-mini | LLM / Vision / Embedding |
| httpx | Supabase Storage 직접 호출 |
| JWT (python-jose) | 인증 |
| bcrypt | 세무사 비밀번호 암호화 |
| Uvicorn | ASGI 서버 |

### Frontend
| 기술 | 용도 |
|------|------|
| React 18 | UI 프레임워크 |
| Vite | 빌드 툴 |
| Zustand | 전역 상태 관리 |
| Recharts | 차트 라이브러리 |
| Axios | HTTP 클라이언트 |
| WebSocket API | 실시간 채팅 |
| IntersectionObserver | 무한스크롤 감지 |

### Infrastructure
| 기술 | 용도 |
|------|------|
| Render | 서버 배포 (백엔드 + 프론트 통합) |
| Supabase | PostgreSQL + Storage 호스팅 |
| UptimeRobot | Render Free 티어 슬립 방지 (5분 간격 ping) |
| GitHub Actions | 자동 배포 (push → 자동 빌드) |

---

## 🏗 아키텍처

```
┌─────────────────────────────────────────────────────────────┐
│                      Client (React)                          │
│  Landing / Dashboard / 거래내역 / 챗봇 / 세금계산기 / 상담   │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTP / Streaming / WebSocket
┌──────────────────────▼──────────────────────────────────────┐
│                   FastAPI (Render)                           │
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │  Auth Router │  │  Trans Router│  │  Consultation Router│ │
│  │  (OAuth/JWT) │  │  (CRUD/Upload│  │  (WebSocket/Chat)   │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
│  ┌─────────────┐  ┌─────────────┐                           │
│  │  AI Routers │  │Advisor Router│                           │
│  │  (RAG/OCR)  │  │  (JWT Auth) │                           │
│  └──────┬──────┘  └─────────────┘                           │
└─────────│───────────────────────────────────────────────────┘
          │
┌─────────▼──────────┐          ┌───────────────────┐
│  PostgreSQL         │          │  OpenAI API        │
│  (Supabase)         │          │  GPT-4o-mini       │
│  - users            │          │  - Chat Completion │
│  - transactions     │          │  - Vision (OCR)    │
│  - consultations    │          │  - Embeddings      │
│  - messages         │          └───────────────────┘
│  - tax_advisors     │                    │
└─────────────────────┘          ┌─────────▼──────────┐
                                 │  ChromaDB           │
┌────────────────────┐           │  (세법 벡터 DB)      │
│  Supabase Storage  │           └────────────────────┘
│  - receipts 버킷   │
│  - profiles 버킷   │
│  (영수증/프로필)    │
└────────────────────┘
```

---

## 📁 프로젝트 구조

```
tax-assistant/
├── backend/
│   └── app/
│       ├── main.py              # FastAPI 앱 진입점
│       ├── database.py          # DB 연결 설정
│       ├── config.py            # 환경변수 설정
│       ├── models/              # SQLAlchemy 모델
│       │   ├── user.py          # nickname, profile_image 컬럼 포함
│       │   ├── transaction.py   # receipt_image_url 컬럼 포함
│       │   ├── consultation.py  # 상담/메시지/세무사 모델
│       │   └── subscription.py
│       ├── routers/             # API 라우터
│       │   ├── auth.py          # 소셜 로그인
│       │   ├── advisor_auth.py  # 세무사 인증
│       │   ├── consultations.py # 상담 CRUD + Premium 체크
│       │   ├── websocket.py     # 실시간 채팅
│       │   ├── transactions.py  # 거래 CRUD + 페이지네이션 + 검색 + /years API
│       │   ├── upload.py        # CSV/Excel 업로드 (로컬 분류 + 청크 벌크 INSERT)
│       │   ├── ocr.py           # 영수증 OCR + Supabase Storage 업로드
│       │   ├── chat.py          # AI 챗봇 (RAG)
│       │   ├── ai_insights.py   # AI 인사이트 (집계 컨텍스트 최적화)
│       │   ├── tax_calculator.py
│       │   ├── payments.py
│       │   └── users.py         # 닉네임/프로필 이미지 수정
│       ├── services/
│       │   ├── ocr_service.py
│       │   └── category_service.py
│       └── core/
│           ├── security.py
│           ├── dependencies.py
│           └── limits.py        # Free/Pro/Premium 사용량 제한 미들웨어
└── frontend/
    └── src/
        ├── pages/
        │   ├── LandingPage.jsx          # 대시보드 미리보기 + 반응형
        │   ├── DashboardPage.jsx        # 과세기간 차트 + 년도 선택
        │   ├── TransactionsPage.jsx     # 무한스크롤 + 검색 + 전체삭제
        │   ├── ChatPage.jsx
        │   ├── ConsultationPage.jsx     # 유저 상담 페이지
        │   ├── AdvisorPage.jsx          # 세무사 대시보드 (년도/월 2단계 필터)
        │   ├── AdvisorLoginPage.jsx
        │   ├── TaxCalculatorPage.jsx
        │   ├── PricingPage.jsx          # Free/Pro/Premium 3단계
        │   ├── MyInfoPage.jsx           # 닉네임/프로필 이미지 편집
        │   ├── NotificationsPage.jsx    # 세금 신고 일정 D-day
        │   ├── PaymentSuccessPage.jsx
        │   └── PaymentFailPage.jsx
        ├── components/
        │   ├── layout/
        │   │   └── Navbar.jsx
        │   ├── dashboard/
        │   │   ├── NetProfitHeader.jsx  # 순이익 + 차트 + 년도 선택 버튼
        │   │   ├── DeadlineCard.jsx
        │   │   └── TabMenu.jsx          # Premium 체크 모달 포함
        │   └── AIInsightWidget.jsx
        ├── api/
        │   ├── axios.js
        │   └── transactions.js
        └── store/
            └── authStore.js
```

---

## 🚀 로컬 실행 방법

### 사전 요구사항
- Python 3.11+
- Node.js 18+
- PostgreSQL (또는 Supabase 계정)
- OpenAI API Key

### 백엔드 실행

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# .env 파일 생성
cp .env.example .env
# .env에 API 키 입력

uvicorn app.main:app --reload
```

### 프론트엔드 실행

```bash
cd frontend
npm install

# .env 파일 생성
echo "VITE_API_URL=http://localhost:8000" > .env

npm run dev
```

---

## 🔑 환경변수

```env
# Database
DATABASE_URL=postgresql+asyncpg://...

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key

# OpenAI
OPENAI_API_KEY=sk-...

# JWT
JWT_SECRET_KEY=...
JWT_ALGORITHM=HS256
SECRET_KEY=...

# Kakao OAuth
KAKAO_CLIENT_ID=...
KAKAO_REDIRECT_URI=...

# Google OAuth
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=...

# Naver OAuth
NAVER_CLIENT_ID=...
NAVER_CLIENT_SECRET=...
NAVER_REDIRECT_URI=...
```

---

## 📈 기술적 도전과 해결

### 1. RAG 파이프라인 최적화
- **문제**: 세법 문서가 길어 LLM 컨텍스트 초과
- **해결**: 청크 사이즈 실험 (512/1024/2048) 후 RAGAS로 평가 → 1024 최적값 확인

### 2. 스트리밍 응답 Render 버퍼링 문제
- **문제**: `StreamingResponse`가 프록시에서 버퍼링되어 한번에 전송됨
- **해결**: `X-Accel-Buffering: no` 헤더 추가 + `stream=True` 방식으로 변경

### 3. CSV/Excel 다양한 인코딩 처리
- **문제**: 한국 은행 내역서의 EUC-KR 인코딩, 다양한 날짜 형식
- **해결**: 멀티 인코딩 폴백 + 13가지 날짜 형식 파서 구현

### 4. 대용량 파일 업로드 성능 최적화
- **문제**: 거래 분류를 위해 건당 OpenAI API 호출 → 1,000건 업로드 시 수분 소요
- **해결**: OpenAI API 제거 → 로컬 키워드 기반 분류 + income/expense 분리 후 500건 청크 벌크 INSERT → 만건 기준 수십 초로 단축

### 5. Supabase Storage 패키지 충돌
- **문제**: `supabase` Python 패키지가 `httpx` 버전 충돌 발생
- **해결**: supabase 패키지 제거 → `httpx`로 Supabase Storage REST API 직접 호출

### 6. WebSocket 실시간 채팅 구현
- **문제**: 세무사가 오프라인일 때 메시지 처리 방식
- **해결**: 비동기 채팅 구조 설계 (유저는 언제든 메시지 전송, DB 저장 후 세무사 업무시간에 확인) + 양쪽 온라인 시 자동으로 실시간 채팅으로 전환

### 7. PostgreSQL Enum 타입 충돌
- **문제**: SQLAlchemy Enum과 PostgreSQL Enum 타입명 불일치
- **해결**: `SAEnum(ConsultationStatus, name="consultation_status")`로 명시적 타입명 지정

### 8. 만건 이상 거래내역 렌더링 성능
- **문제**: 전체 데이터를 한 번에 가져와 프론트에서 필터링 → 3만건 이상 시 렉
- **해결**: 백엔드 페이지네이션 API (`?page=1&limit=50`) + `IntersectionObserver` 무한스크롤로 50건씩 순차 로딩

### 9. 대시보드 차트 데이터 과부하
- **문제**: 전체 거래 데이터를 가져와 차트 집계 → 만건 이상 시 대시보드 로딩 느림
- **해결**: `/transactions/years` API로 보유 년도만 조회 + 선택된 과세기간 범위만 별도 API 호출 → 필요한 데이터만 로딩

### 10. 소셜 로그인 콜백 URL 관리
- **문제**: 배포 환경 변경 시 OAuth 콜백 URL 불일치
- **해결**: 환경변수로 REDIRECT_URI 관리, 콘솔별 URL 등록

### 11. RAG query engine이 세무 질문을 오거절하는 문제
- **문제**: LlamaIndex `query_engine`이 벡터 DB에서 관련 문서를 찾지 못하면 내부 응답 로직이 개입해 시스템 프롬프트의 거절 규칙을 잘못 적용 → "절세 방법", "종합소득세" 같은 핵심 세무 질문도 거절 응답 출력
- **1차 시도**: 시스템 프롬프트에 "절세는 거절하지 말 것" 명시 → 프롬프트 안에 거절 예시 문구 자체가 남아있어 LLM이 해당 패턴을 그대로 학습하여 실패
- **근본 해결**: LlamaIndex를 **retriever 전용**으로 분리 (문서 검색만 담당) + OpenAI API 직접 호출로 답변 생성 분리 → LlamaIndex 내부 응답 로직 완전 우회. 프롬프트에서 거절 문구 완전 제거 후 `system` / `user` role을 명시적으로 분리하여 지시사항 적용 강도 향상. 거절은 Python 코드(`is_tax_related`)만 담당하도록 역할 명확화

---

## 👨‍💻 개발자

**김민준** | AI 애플리케이션 개발자

- GitHub: [@Minss0518](https://github.com/Minss0518)
- 국비지원 IT 훈련과정 수료 (응용개발자 과정)
- LLM / RAG 파이프라인 개발 집중
- 관심 분야: LLM 서비스 개발, RAG 최적화, AI 애플리케이션

> 이 프로젝트는 시장조사 → 기획 → 개발 → 배포 → 고도화까지 혼자 전 과정을 진행한 프로젝트입니다.

---

## 📄 라이선스

MIT License