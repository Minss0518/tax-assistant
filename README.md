# 🧾 세무비서 (Tax Assistant)

> 프리랜서 · 크리에이터를 위한 AI 기반 세금 관리 서비스

[![Live Demo](https://img.shields.io/badge/Live%20Demo-tax--assistant--dsyc.onrender.com-blue?style=flat-square)](https://tax-assistant-dsyc.onrender.com)
[![Python](https://img.shields.io/badge/Python-3.11-blue?style=flat-square&logo=python)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-green?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)](https://react.dev)

---

## 📌 프로젝트 소개

세무비서는 프리랜서와 크리에이터가 세금을 쉽게 관리할 수 있도록 돕는 AI 세금 비서 서비스입니다.

복잡한 세무 지식 없이도 AI 챗봇에게 질문하고, 영수증을 찍으면 자동으로 거래가 등록되며, 예상 세액을 즉시 계산할 수 있습니다.

**배포 URL**: https://tax-assistant-dsyc.onrender.com

---

## ✨ 주요 기능

### 🤖 AI 세무 상담 (RAG 챗봇)
- LlamaIndex + ChromaDB 기반 RAG 파이프라인
- 세법 문서를 벡터 DB에 저장 후 질문과 관련된 문서 검색
- GPT-4o-mini 스트리밍 응답 + 법령 출처 표시
- 질문 리라이팅으로 세무 용어 자동 정규화
- 프롬프트 인젝션 방어 처리

### 📊 AI 인사이트 위젯
- 거래 데이터 자동 분석 (카테고리별 지출 비율 바차트)
- 이상값 자동 탐지 (일평균 대비 300% 초과 지출 감지)
- 자연어 질문 기반 실시간 스트리밍 답변
- "지출이 가장 많은 카테고리가 뭐야?" → 즉시 분석

### 📷 영수증 OCR
- GPT-4o-mini Vision으로 영수증 이미지 분석
- 날짜, 금액, 항목 자동 추출 → 거래 내역 자동 입력
- 사용량 제한 (Free 월 3회 / Pro 무제한)

### 💸 거래 내역 관리
- 수입 / 지출 CRUD
- AI 카테고리 자동 분류 (메모 기반)
- CSV / Excel 일괄 업로드 (EUC-KR, 다양한 날짜 형식 지원)
- 수입/지출 탭 필터 + 날짜 범위 필터
- 체크박스 다중 삭제 + 전체 삭제
- 출처 뱃지 표시 (직접입력 / OCR / 업로드)

### 🧮 세금 계산기
- 종합소득세 예상 세액 계산 (2024년 귀속 기준)
- 국민연금 · 건강보험료 자동 계산
- 원천징수 3.3% 자동 반영

### 🔐 인증
- 카카오 / 구글 / 네이버 소셜 로그인 (OAuth 2.0 + JWT)

### 💳 결제 / 구독
- 토스페이먼츠 SDK 연동
- Free / Pro 플랜 구분
- 구독 취소 시 만료일까지 Pro 유지

---

## 🛠 기술 스택

### Backend
| 기술 | 용도 |
|------|------|
| FastAPI | REST API 서버 |
| SQLAlchemy (Async) | ORM |
| PostgreSQL (Supabase) | 데이터베이스 |
| LlamaIndex | RAG 파이프라인 |
| ChromaDB | 벡터 데이터베이스 |
| OpenAI GPT-4o-mini | LLM / Vision / Embedding |
| JWT (python-jose) | 인증 |
| Uvicorn | ASGI 서버 |

### Frontend
| 기술 | 용도 |
|------|------|
| React 18 | UI 프레임워크 |
| Vite | 빌드 툴 |
| Zustand | 전역 상태 관리 |
| Recharts | 차트 라이브러리 |
| Axios | HTTP 클라이언트 |
| TailwindCSS | 스타일링 |

### Infrastructure
| 기술 | 용도 |
|------|------|
| Render | 서버 배포 (백엔드 + 프론트 통합) |
| Supabase | PostgreSQL 호스팅 |
| GitHub Actions | 자동 배포 (push → 자동 빌드) |

---

## 🏗 아키텍처

```
┌─────────────────────────────────────────────────────┐
│                   Client (React)                     │
│  Landing / Dashboard / 거래내역 / 챗봇 / 세금계산기  │
└──────────────────────┬──────────────────────────────┘
                       │ HTTP / Streaming
┌──────────────────────▼──────────────────────────────┐
│                FastAPI (Render)                      │
│                                                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │  Auth Router │  │  Trans Router│  │  AI Routers │ │
│  │  (OAuth/JWT) │  │  (CRUD/Upload│  │  (RAG/OCR)  │ │
│  └─────────────┘  └─────────────┘  └──────┬──────┘ │
└─────────────────────────────────────────── │────────┘
                                             │
              ┌──────────────────────────────┤
              │                              │
┌─────────────▼──────┐          ┌────────────▼──────┐
│  PostgreSQL         │          │  OpenAI API        │
│  (Supabase)         │          │  GPT-4o-mini       │
│  - users            │          │  - Chat Completion │
│  - transactions     │          │  - Vision (OCR)    │
│  - social_accounts  │          │  - Embeddings      │
└─────────────────────┘          └───────────────────┘
                                             │
                                 ┌───────────▼──────────┐
                                 │  ChromaDB             │
                                 │  (세법 벡터 DB)        │
                                 └──────────────────────┘
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
│       │   ├── user.py
│       │   ├── transaction.py
│       │   └── subscription.py
│       ├── routers/             # API 라우터
│       │   ├── auth.py          # 소셜 로그인
│       │   ├── transactions.py  # 거래 CRUD
│       │   ├── upload.py        # CSV/Excel 업로드
│       │   ├── ocr.py           # 영수증 OCR
│       │   ├── chat.py          # AI 챗봇 (RAG)
│       │   ├── ai_insights.py   # AI 인사이트
│       │   ├── tax_calculator.py
│       │   └── payments.py
│       ├── services/
│       │   ├── ocr_service.py   # GPT Vision
│       │   └── category_service.py  # AI 카테고리 분류
│       └── core/
│           ├── security.py      # JWT
│           └── dependencies.py  # 인증 미들웨어
└── frontend/
    └── src/
        ├── pages/
        │   ├── LandingPage.jsx
        │   ├── DashboardPage.jsx
        │   ├── TransactionsPage.jsx
        │   ├── ChatPage.jsx
        │   ├── TaxCalculatorPage.jsx
        │   └── PricingPage.jsx
        ├── components/
        │   └── AIInsightWidget.jsx
        ├── api/
        │   ├── axios.js
        │   └── transactions.js
        └── store/
            └── authStore.js     # Zustand 인증 상태
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

# OpenAI
OPENAI_API_KEY=sk-...
LANGCHAIN_API_KEY=...

# JWT
JWT_SECRET_KEY=...
JWT_ALGORITHM=HS256

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

### 2. 스트리밍 응답 Railway/Render 버퍼링 문제
- **문제**: `StreamingResponse`가 프록시에서 버퍼링되어 한번에 전송됨
- **해결**: `X-Accel-Buffering: no` 헤더 추가 + `stream=True` 방식으로 변경

### 3. CSV/Excel 다양한 인코딩 처리
- **문제**: 한국 은행 내역서의 EUC-KR 인코딩, 다양한 날짜 형식
- **해결**: 멀티 인코딩 폴백 + 13가지 날짜 형식 파서 구현

### 4. 소셜 로그인 콜백 URL 관리
- **문제**: 배포 환경 변경 시 OAuth 콜백 URL 불일치
- **해결**: 환경변수로 REDIRECT_URI 관리, 콘솔별 URL 등록 자동화

---

## 👨‍💻 개발자

**김민준** | AI 애플리케이션 개발자

- GitHub: [@Minss0518](https://github.com/Minss0518)
- 국비지원 IT 훈련과정 수료 (응용개발자 과정)
- LLM / RAG 파이프라인 개발에 집중

---

## 📄 라이선스

MIT License