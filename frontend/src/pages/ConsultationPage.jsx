import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

const API = import.meta.env.VITE_API_URL;

export default function ConsultationPage() {
  const [consultations, setConsultations] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [title, setTitle] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [userPlan, setUserPlan] = useState(null);
  const wsRef = useRef(null);
  const bottomRef = useRef(null);
  const navigate = useNavigate();

  const getMyUserId = () => {
    const token = localStorage.getItem("token");
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      return payload.sub;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    // 유저 플랜 조회
    fetch(`${API}/users/me`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    })
      .then((r) => r.json())
      .then((d) => setUserPlan(d.plan))
      .catch(() => {});

    fetchConsultations();
  }, []);

  useEffect(() => {
    if (selected) {
      fetchMessages(selected.id);
      connectWebSocket(selected.id);
      markAsRead(selected.id);
    }
    return () => wsRef.current?.close();
  }, [selected]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchConsultations = async () => {
    const res = await fetch(`${API}/consultations/user/me`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });
    const data = await res.json();
    setConsultations(data);
  };

  const fetchMessages = async (id) => {
    const res = await fetch(`${API}/consultations/${id}/messages`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });
    const data = await res.json();
    setMessages(data);
  };

  const markAsRead = async (id) => {
    await fetch(`${API}/consultations/${id}/messages/read?reader_type=user`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });
  };

  const connectWebSocket = (id) => {
    wsRef.current?.close();
    const wsUrl = API.replace("https://", "wss://").replace("http://", "ws://");
    const ws = new WebSocket(`${wsUrl}/ws/consultation/${id}`);
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.type === "message") {
        setMessages((prev) => [...prev, msg]);
      }
    };
    wsRef.current = ws;
  };

  const createConsultation = async () => {
    if (!title.trim()) return;
    const res = await fetch(`${API}/consultations/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify({ title }),
    });
    const data = await res.json();
    setConsultations((prev) => [data, ...prev]);
    setTitle("");
    setShowForm(false);
    setSelected(data);
  };

  const deleteConsultation = async (id) => {
    if (!confirm("상담을 삭제하시겠습니까?")) return;
    await fetch(`${API}/consultations/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });
    setConsultations((prev) => prev.filter((c) => c.id !== id));
    if (selected?.id === id) setSelected(null);
  };

  const sendMessage = async () => {
    if (!input.trim() || !selected) return;
    const msg = {
      content: input,
      sender_type: "user",
      sender_id: getMyUserId(),
      created_at: new Date().toISOString(),
    };
    wsRef.current?.send(JSON.stringify(msg));
    await fetch(`${API}/consultations/${selected.id}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify({ ...msg }),
    });
    setInput("");
  };

  const statusLabel = (s) =>
    s === "waiting" ? "⏳ 대기중" : s === "active" ? "💬 상담중" : "✅ 완료";

  return (
    <div style={{ padding: "0 80px", maxWidth: 1100, margin: "0 auto", fontFamily: "sans-serif" }}>
      {/* 뒤로가기 + 페이지 제목 */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "20px 0 16px" }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "8px 14px", background: "#374151", color: "white",
            border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 500,
          }}
        >
          ← 뒤로
        </button>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>세무사 상담</h2>
      </div>

      {/* Premium 아닐 때 업그레이드 유도 배너 */}
      {userPlan !== null && userPlan !== "premium" && (
        <div style={{
          background: "linear-gradient(135deg, #7c3aed, #a855f7)",
          borderRadius: 12, padding: "16px 20px", marginBottom: 16,
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <div>
            <p style={{ color: "white", fontWeight: 700, fontSize: 15, margin: 0 }}>👑 세무사 상담은 Premium 전용 기능이에요</p>
            <p style={{ color: "rgba(255,255,255,0.8)", fontSize: 13, margin: "4px 0 0" }}>월 29,900원으로 세무사와 직접 상담할 수 있어요 (월 5회)</p>
          </div>
          <button
            onClick={() => navigate("/pricing")}
            style={{
              background: "white", color: "#7c3aed", fontWeight: 700,
              fontSize: 13, padding: "8px 16px", borderRadius: 8, border: "none",
              cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
            }}
          >
            업그레이드 →
          </button>
        </div>
      )}

      {/* 상담 본문 영역 */}
      <div style={{ display: "flex", height: "calc(100vh - 160px)", border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden" }}>
        {/* 왼쪽 상담 목록 */}
        <div style={{ width: 220, borderRight: "1px solid #e5e7eb", overflowY: "auto", background: "#f9fafb", flexShrink: 0 }}>
          <div style={{ padding: "16px", borderBottom: "1px solid #e5e7eb" }}>
            <button
              onClick={() => setShowForm(true)}
              style={{ width: "100%", padding: "10px", background: "#3b82f6", color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: "bold" }}
            >
              + 상담 신청
            </button>
          </div>

          {showForm && (
            <div style={{ padding: 16, background: "white", borderBottom: "1px solid #e5e7eb" }}>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="상담 제목 입력"
                style={{ width: "100%", padding: 8, border: "1px solid #d1d5db", borderRadius: 6, marginBottom: 8, boxSizing: "border-box" }}
              />
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={createConsultation} style={{ flex: 1, padding: 8, background: "#3b82f6", color: "white", border: "none", borderRadius: 6, cursor: "pointer" }}>신청</button>
                <button onClick={() => setShowForm(false)} style={{ flex: 1, padding: 8, background: "#e5e7eb", border: "none", borderRadius: 6, cursor: "pointer" }}>취소</button>
              </div>
            </div>
          )}

          {consultations.map((c) => (
            <div
              key={c.id}
              style={{
                padding: "14px 16px",
                background: selected?.id === c.id ? "#eff6ff" : "white",
                borderBottom: "1px solid #f3f4f6",
                borderLeft: selected?.id === c.id ? "3px solid #3b82f6" : "3px solid transparent",
              }}
            >
              <div onClick={() => setSelected(c)} style={{ cursor: "pointer" }}>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{c.title}</div>
                <div style={{ fontSize: 12, color: "#6b7280", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>{statusLabel(c.status)}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteConsultation(c.id); }}
                    style={{ fontSize: 11, color: "#ef4444", background: "none", border: "none", cursor: "pointer", padding: "2px 6px" }}
                  >
                    삭제
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 오른쪽 채팅 */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          {selected ? (
            <>
              <div style={{ padding: "16px 20px", borderBottom: "1px solid #e5e7eb", fontWeight: "bold", fontSize: 16 }}>
                {selected.title} <span style={{ fontSize: 13, color: "#6b7280", fontWeight: "normal" }}>{statusLabel(selected.status)}</span>
              </div>

              <div style={{ flex: 1, overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
                {messages.map((m, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: m.sender_type === "user" ? "flex-end" : "flex-start" }}>
                    {m.sender_type === "advisor" && (
                      <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#3b82f6", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, marginRight: 8, flexShrink: 0 }}>세</div>
                    )}
                    <div style={{
                      maxWidth: "60%", padding: "10px 14px",
                      borderRadius: m.sender_type === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                      background: m.sender_type === "user" ? "#3b82f6" : "#f3f4f6",
                      color: m.sender_type === "user" ? "white" : "#111827",
                      fontSize: 14,
                    }}>
                      {m.content}
                      <div style={{ fontSize: 11, marginTop: 4, opacity: 0.7, textAlign: "right" }}>
                        {new Date(m.created_at).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>

              <div style={{ padding: "12px 16px", borderTop: "1px solid #e5e7eb", display: "flex", gap: 8 }}>
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  placeholder={selected.status === "closed" ? "종료된 상담입니다" : "메시지를 입력하세요..."}
                  disabled={selected.status === "closed"}
                  style={{ flex: 1, padding: "10px 14px", border: "1px solid #d1d5db", borderRadius: 24, outline: "none", fontSize: 14 }}
                />
                <button
                  onClick={sendMessage}
                  disabled={selected.status === "closed"}
                  style={{ padding: "10px 20px", background: "#3b82f6", color: "white", border: "none", borderRadius: 24, cursor: "pointer", fontWeight: "bold" }}
                >전송</button>
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af", fontSize: 15 }}>
              상담을 선택하거나 새 상담을 신청하세요
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
