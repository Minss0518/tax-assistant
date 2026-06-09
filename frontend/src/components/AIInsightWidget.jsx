// AIInsightWidget.jsx
// 대시보드에 붙이는 AI 인사이트 위젯
// 사용법: <AIInsightWidget /> — DashboardPage.jsx에 그냥 import해서 넣으면 됨

import { useState, useEffect, useRef } from "react";

const API_BASE = import.meta.env.VITE_API_URL;

// ── 아이콘 SVG ──────────────────────────────────────────────
const SparkleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 2L9.5 9.5 2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5z" />
  </svg>
);
const AlertIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);
const SendIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);
const RefreshIcon = ({ spinning }) => (
  <svg
    width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2"
    style={{ animation: spinning ? "spin 1s linear infinite" : "none" }}
  >
    <polyline points="23 4 23 10 17 10" />
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
  </svg>
);

// 빠른 질문 버튼 목록
const QUICK_QUESTIONS = [
  "지출이 가장 많은 카테고리가 뭐야?",
  "이번 달 절세할 수 있는 방법 있어?",
  "전달 대비 수입 변화가 어때?",
  "비용 처리 가능한 항목이 있어?",
];

// ── 메인 위젯 ────────────────────────────────────────────────
export default function AIInsightWidget() {
  const [summary, setSummary] = useState(null);       // 자동 요약 데이터
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [question, setQuestion] = useState("");        // 자연어 질문 입력
  const [answer, setAnswer] = useState("");            // 스트리밍 답변
  const [loadingAnswer, setLoadingAnswer] = useState(false);
  const [activeTab, setActiveTab] = useState("summary"); // summary | chat
  const [error, setError] = useState(null);
  const answerRef = useRef(null);
  const inputRef = useRef(null);

  // 마운트 시 자동 요약 fetch
  useEffect(() => {
    fetchSummary();
  }, []);

  // 답변 스트리밍 중 자동 스크롤
  useEffect(() => {
    if (answerRef.current) {
      answerRef.current.scrollTop = answerRef.current.scrollHeight;
    }
  }, [answer]);

  // ── 자동 요약 API ─────────────────────────────────────────
  const fetchSummary = async () => {
    setLoadingSummary(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/ai-insights/summary`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("분석 실패");
      const data = await res.json();
      setSummary(data);
    } catch (e) {
      setError("AI 분석을 불러오지 못했습니다.");
    } finally {
      setLoadingSummary(false);
    }
  };

  // ── 자연어 질문 API (스트리밍) ────────────────────────────
  const askQuestion = async (q) => {
    const text = q || question.trim();
    if (!text || loadingAnswer) return;

    setAnswer("");
    setLoadingAnswer(true);
    setActiveTab("chat");
    setQuestion("");

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/ai-insights/question`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ question: text }),
      });

      if (!res.ok) throw new Error("질문 실패");

      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        setAnswer((prev) => prev + decoder.decode(value, { stream: true }));
      }
    } catch (e) {
      setAnswer("❌ 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setLoadingAnswer(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      askQuestion();
    }
  };

  // ── 숫자 포맷 ─────────────────────────────────────────────
  const fmt = (n) => n?.toLocaleString("ko-KR") ?? "0";

  // ── 카테고리 바 차트 ──────────────────────────────────────
  const CategoryBar = ({ name, ratio, amount }) => (
    <div style={{ marginBottom: "10px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
        <span style={{ fontSize: "13px", color: "#374151", fontWeight: 500 }}>{name}</span>
        <span style={{ fontSize: "12px", color: "#6B7280" }}>
          {fmt(amount)}원 ({ratio}%)
        </span>
      </div>
      <div style={{ height: "6px", background: "#F3F4F6", borderRadius: "3px", overflow: "hidden" }}>
        <div
          style={{
            height: "100%",
            width: `${Math.min(ratio, 100)}%`,
            background: ratio > 40 ? "#EF4444" : ratio > 25 ? "#F59E0B" : "#3B82F6",
            borderRadius: "3px",
            transition: "width 0.6s ease",
          }}
        />
      </div>
    </div>
  );

  // ── 렌더 ─────────────────────────────────────────────────
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #E5E7EB",
        borderRadius: "12px",
        overflow: "hidden",
      }}
    >
      {/* 헤더 */}
      <div
        style={{
          padding: "16px 20px",
          borderBottom: "1px solid #E5E7EB",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div
            style={{
              width: "28px", height: "28px", borderRadius: "6px",
              background: "#EFF6FF", display: "flex", alignItems: "center",
              justifyContent: "center", color: "#3B82F6",
            }}
          >
            <SparkleIcon />
          </div>
          <span style={{ fontWeight: 600, fontSize: "14px", color: "#111827" }}>
            AI 인사이트
          </span>
          {summary?.period && (
            <span style={{ fontSize: "11px", color: "#9CA3AF", marginLeft: "2px" }}>
              {summary.period}
            </span>
          )}
        </div>
        <button
          onClick={fetchSummary}
          disabled={loadingSummary}
          style={{
            background: "none", border: "none", cursor: "pointer",
            color: "#6B7280", padding: "4px", borderRadius: "4px",
            display: "flex", alignItems: "center", gap: "4px",
            fontSize: "12px",
          }}
          title="새로고침"
        >
          <RefreshIcon spinning={loadingSummary} />
          새로고침
        </button>
      </div>

      {/* 탭 */}
      <div style={{ display: "flex", borderBottom: "1px solid #E5E7EB" }}>
        {["summary", "chat"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              flex: 1, padding: "10px", border: "none",
              background: "none", cursor: "pointer",
              fontSize: "13px", fontWeight: activeTab === tab ? 600 : 400,
              color: activeTab === tab ? "#3B82F6" : "#6B7280",
              borderBottom: activeTab === tab ? "2px solid #3B82F6" : "2px solid transparent",
              transition: "all 0.15s",
            }}
          >
            {tab === "summary" ? "자동 분석" : "질문하기"}
          </button>
        ))}
      </div>

      <div style={{ padding: "20px" }}>

        {/* ── 자동 분석 탭 ── */}
        {activeTab === "summary" && (
          <>
            {loadingSummary ? (
              <div style={{ textAlign: "center", padding: "32px 0", color: "#9CA3AF" }}>
                <div style={{ marginBottom: "8px" }}>
                  <SparkleIcon />
                </div>
                <p style={{ fontSize: "13px" }}>AI가 거래 데이터를 분석하고 있어요...</p>
              </div>
            ) : error ? (
              <div style={{ color: "#EF4444", fontSize: "13px", textAlign: "center", padding: "20px 0" }}>
                {error}
              </div>
            ) : summary ? (
              <>
                {/* 요약 텍스트 */}
                <div
                  style={{
                    background: "#F0F9FF", border: "1px solid #BAE6FD",
                    borderRadius: "8px", padding: "14px 16px", marginBottom: "16px",
                  }}
                >
                  <p style={{ fontSize: "13px", color: "#0C4A6E", lineHeight: "1.6", margin: 0 }}>
                    {summary.summary}
                  </p>
                  {summary.insight && (
                    <p
                      style={{
                        fontSize: "12px", color: "#0369A1",
                        marginTop: "8px", marginBottom: 0,
                        paddingTop: "8px", borderTop: "1px solid #BAE6FD",
                      }}
                    >
                      {summary.insight}
                    </p>
                  )}
                </div>

                {/* 카테고리 비율 */}
                {summary.category_ratios && Object.keys(summary.category_ratios).length > 0 && (
                  <div style={{ marginBottom: "16px" }}>
                    <p style={{ fontSize: "12px", fontWeight: 600, color: "#6B7280", marginBottom: "10px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      카테고리별 지출
                    </p>
                    {Object.entries(summary.category_ratios)
                      .slice(0, 5)
                      .map(([name, v]) => (
                        <CategoryBar key={name} name={name} ratio={v.ratio} amount={v.amount} />
                      ))}
                  </div>
                )}

                {/* 이상값 */}
                {summary.anomalies?.length > 0 && (
                  <div>
                    <p style={{ fontSize: "12px", fontWeight: 600, color: "#6B7280", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      이상 지출 감지
                    </p>
                    {summary.anomalies.map((a, i) => (
                      <div
                        key={i}
                        style={{
                          display: "flex", alignItems: "flex-start", gap: "8px",
                          background: "#FEF2F2", border: "1px solid #FECACA",
                          borderRadius: "8px", padding: "10px 12px", marginBottom: "8px",
                        }}
                      >
                        <span style={{ color: "#EF4444", marginTop: "1px", flexShrink: 0 }}>
                          <AlertIcon />
                        </span>
                        <div>
                          <p style={{ fontSize: "13px", fontWeight: 500, color: "#991B1B", margin: "0 0 2px" }}>
                            {a.date} — {fmt(a.amount)}원
                            <span style={{ fontWeight: 400, color: "#B91C1C", marginLeft: "6px" }}>
                              (평균 대비 {a.ratio}%)
                            </span>
                          </p>
                          {a.description && (
                            <p style={{ fontSize: "12px", color: "#DC2626", margin: 0 }}>{a.description}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* 빠른 질문 버튼 */}
                <div style={{ marginTop: "16px", paddingTop: "14px", borderTop: "1px solid #F3F4F6" }}>
                  <p style={{ fontSize: "12px", color: "#9CA3AF", marginBottom: "8px" }}>바로 물어보기</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {QUICK_QUESTIONS.map((q) => (
                      <button
                        key={q}
                        onClick={() => askQuestion(q)}
                        style={{
                          background: "#F9FAFB", border: "1px solid #E5E7EB",
                          borderRadius: "20px", padding: "5px 12px",
                          fontSize: "12px", color: "#374151",
                          cursor: "pointer", transition: "all 0.15s",
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.background = "#EFF6FF";
                          e.target.style.borderColor = "#93C5FD";
                          e.target.style.color = "#1D4ED8";
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.background = "#F9FAFB";
                          e.target.style.borderColor = "#E5E7EB";
                          e.target.style.color = "#374151";
                        }}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            ) : null}
          </>
        )}

        {/* ── 질문하기 탭 ── */}
        {activeTab === "chat" && (
          <div>
            {/* 답변 출력창 */}
            <div
              ref={answerRef}
              style={{
                minHeight: "120px", maxHeight: "220px", overflowY: "auto",
                background: "#F9FAFB", border: "1px solid #E5E7EB",
                borderRadius: "8px", padding: "14px 16px", marginBottom: "14px",
                fontSize: "13px", color: "#374151", lineHeight: "1.65",
                whiteSpace: "pre-wrap",
              }}
            >
              {answer || (
                <span style={{ color: "#9CA3AF" }}>
                  거래 데이터를 기반으로 궁금한 점을 물어보세요.<br />
                  예) "이번 달 가장 큰 지출이 뭐야?", "절세할 수 있는 방법 있어?"
                </span>
              )}
              {loadingAnswer && (
                <span
                  style={{
                    display: "inline-block", width: "8px", height: "14px",
                    background: "#3B82F6", borderRadius: "2px",
                    animation: "blink 0.8s step-end infinite", marginLeft: "2px",
                  }}
                />
              )}
            </div>

            {/* 빠른 질문 */}
            {!answer && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "12px" }}>
                {QUICK_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => askQuestion(q)}
                    disabled={loadingAnswer}
                    style={{
                      background: "#F9FAFB", border: "1px solid #E5E7EB",
                      borderRadius: "20px", padding: "5px 12px",
                      fontSize: "12px", color: "#374151",
                      cursor: loadingAnswer ? "not-allowed" : "pointer",
                      opacity: loadingAnswer ? 0.5 : 1,
                    }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            {/* 입력창 */}
            <div
              style={{
                display: "flex", gap: "8px", alignItems: "flex-end",
                border: "1px solid #D1D5DB", borderRadius: "8px",
                padding: "10px 12px", background: "#fff",
                focusWithin: { borderColor: "#3B82F6" },
              }}
            >
              <textarea
                ref={inputRef}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="질문을 입력하세요 (Enter로 전송)"
                rows={1}
                style={{
                  flex: 1, border: "none", outline: "none", resize: "none",
                  fontSize: "13px", color: "#111827", background: "transparent",
                  lineHeight: "1.5",
                }}
              />
              <button
                onClick={() => askQuestion()}
                disabled={!question.trim() || loadingAnswer}
                style={{
                  background: !question.trim() || loadingAnswer ? "#E5E7EB" : "#3B82F6",
                  color: !question.trim() || loadingAnswer ? "#9CA3AF" : "#fff",
                  border: "none", borderRadius: "6px", padding: "6px 10px",
                  cursor: !question.trim() || loadingAnswer ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all 0.15s",
                }}
              >
                <SendIcon />
              </button>
            </div>
            <p style={{ fontSize: "11px", color: "#9CA3AF", marginTop: "6px" }}>
              실제 거래 데이터 기반 · Enter로 전송 · Shift+Enter 줄바꿈
            </p>
          </div>
        )}
      </div>

      {/* CSS 애니메이션 */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes blink { 50% { opacity: 0; } }
      `}</style>
    </div>
  );
}
