import { useState, useEffect, useRef } from "react";

const API = import.meta.env.VITE_API_URL;

export default function AdvisorPage() {
  const [consultations, setConsultations] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [advisorId, setAdvisorId] = useState(null);
  const [selectedYear, setSelectedYear] = useState("전체");
  const [selectedMonth, setSelectedMonth] = useState("전체");
  const wsRef = useRef(null);
  const bottomRef = useRef(null);
  const token = localStorage.getItem("advisor_token");

  useEffect(() => { fetchMe(); fetchConsultations(); }, []);

  useEffect(() => {
    if (selected) { fetchMessages(selected.id); connectWebSocket(selected.id); markAsRead(selected.id); }
    return () => wsRef.current?.close();
  }, [selected]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const fetchMe = async () => {
    const res = await fetch(`${API}/advisor/me`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    setAdvisorId(data.id);
  };

  const fetchConsultations = async () => {
    const res = await fetch(`${API}/consultations/advisor/list`, { headers: { Authorization: `Bearer ${token}` } });
    setConsultations(await res.json());
  };

  const fetchMessages = async (id) => {
    const res = await fetch(`${API}/consultations/${id}/messages`, { headers: { Authorization: `Bearer ${token}` } });
    setMessages(await res.json());
  };

  const markAsRead = async (id) => {
    await fetch(`${API}/consultations/${id}/messages/read?reader_type=advisor`, { method: "PATCH", headers: { Authorization: `Bearer ${token}` } });
  };

  const connectWebSocket = (id) => {
    wsRef.current?.close();
    const wsUrl = API.replace("https://", "wss://").replace("http://", "ws://");
    const ws = new WebSocket(`${wsUrl}/ws/consultation/${id}`);
    ws.onmessage = (e) => { const msg = JSON.parse(e.data); if (msg.type === "message") setMessages((prev) => [...prev, msg]); };
    wsRef.current = ws;
  };

  const assign = async (id) => {
    await fetch(`${API}/consultations/${id}/assign`, { method: "PATCH", headers: { Authorization: `Bearer ${token}` } });
    fetchConsultations();
    setSelected((prev) => prev ? { ...prev, status: "active" } : prev);
  };

  const close = async (id) => {
    await fetch(`${API}/consultations/${id}/close`, { method: "PATCH", headers: { Authorization: `Bearer ${token}` } });
    fetchConsultations();
    setSelected((prev) => prev ? { ...prev, status: "closed" } : prev);
  };

  const deleteConsultation = async (id) => {
    if (!confirm("이 상담을 삭제하시겠습니까?")) return;
    await fetch(`${API}/consultations/advisor/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    setConsultations((prev) => prev.filter((c) => c.id !== id));
    if (selected?.id === id) setSelected(null);
  };

  const sendMessage = async () => {
    if (!input.trim() || !selected || !advisorId) return;
    const msg = { content: input, sender_type: "advisor", sender_id: advisorId, created_at: new Date().toISOString() };
    wsRef.current?.send(JSON.stringify(msg));
    await fetch(`${API}/consultations/${selected.id}/messages`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(msg) });
    setInput("");
  };

  const statusLabel = (s) => s === "waiting" ? "⏳ 대기중" : s === "active" ? "💬 상담중" : "✅ 완료";

  // 년도 목록
  const years = ["전체", ...Array.from(new Set(
    consultations.map((c) => String(new Date(c.updated_at).getFullYear()))
  )).sort((a, b) => b - a)];

  // 선택된 년도의 월 목록
  const months = selectedYear === "전체" ? [] : [
    "전체",
    ...Array.from(new Set(
      consultations
        .filter((c) => String(new Date(c.updated_at).getFullYear()) === selectedYear)
        .map((c) => String(new Date(c.updated_at).getMonth() + 1))
    )).sort((a, b) => a - b).map((m) => `${m}월`)
  ];

  // 필터링
  const filteredConsultations = consultations.filter((c) => {
    const d = new Date(c.updated_at);
    if (selectedYear !== "전체" && String(d.getFullYear()) !== selectedYear) return false;
    if (selectedYear !== "전체" && selectedMonth !== "전체") {
      if (`${d.getMonth() + 1}월` !== selectedMonth) return false;
    }
    return true;
  });

  const handleYearSelect = (year) => {
    setSelectedYear(year);
    setSelectedMonth("전체");
  };

  const btnStyle = (active) => ({
    padding: "5px 10px", fontSize: 11, fontWeight: 600, whiteSpace: "nowrap",
    borderRadius: 20, border: "1px solid", cursor: "pointer", fontFamily: "inherit",
    background: active ? "#1d4ed8" : "#fff",
    color: active ? "#fff" : "#6b7280",
    borderColor: active ? "#1d4ed8" : "#e5e7eb",
  });

  return (
    <div style={{ padding: "0 clamp(12px, 3vw, 50px)", maxWidth: 1100, margin: "0 auto", fontFamily: "sans-serif" }}>
      <style>{`
        @media (max-width: 640px) {
          .advisor-body { flex-direction: column !important; height: auto !important; }
          .advisor-sidebar { width: 100% !important; height: 300px !important; border-right: none !important; border-bottom: 1px solid #e5e7eb !important; }
          .advisor-chat { height: 400px !important; }
          .advisor-title { font-size: 18px !important; }
        }
      `}</style>

      <div style={{ padding: "20px 0 16px" }}>
        <h2 className="advisor-title" style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>세무사 상담 관리</h2>
      </div>

      <div className="advisor-body" style={{ display: "flex", height: "calc(100vh - 100px)", border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden" }}>

        {/* 왼쪽 목록 */}
        <div className="advisor-sidebar" style={{ width: 220, borderRight: "1px solid #e5e7eb", overflowY: "auto", background: "#f9fafb", display: "flex", flexDirection: "column", flexShrink: 0 }}>
          <div style={{ padding: "16px", borderBottom: "1px solid #e5e7eb", fontWeight: "bold", fontSize: 15, flexShrink: 0 }}>
            상담 목록
            <button onClick={fetchConsultations} style={{ float: "right", background: "none", border: "none", cursor: "pointer", fontSize: 15 }}>🔄</button>
          </div>

          {/* 년도 필터 */}
          <div style={{ padding: "8px 12px", borderBottom: "1px solid #e5e7eb", flexShrink: 0 }}>
            <p style={{ fontSize: 10, color: "#9ca3af", fontWeight: 600, marginBottom: 6, letterSpacing: "0.5px" }}>년도</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              {years.map((y) => (
                <button key={y} onClick={() => handleYearSelect(y)} style={btnStyle(selectedYear === y)}>{y}</button>
              ))}
            </div>
          </div>

          {/* 월 필터 (년도 선택 시에만 표시) */}
          {selectedYear !== "전체" && (
            <div style={{ padding: "8px 12px", borderBottom: "1px solid #e5e7eb", flexShrink: 0 }}>
              <p style={{ fontSize: 10, color: "#9ca3af", fontWeight: 600, marginBottom: 6, letterSpacing: "0.5px" }}>월</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {months.map((m) => (
                  <button key={m} onClick={() => setSelectedMonth(m)} style={btnStyle(selectedMonth === m)}>{m}</button>
                ))}
              </div>
            </div>
          )}

          {/* 상담 목록 */}
          <div style={{ overflowY: "auto", flex: 1 }}>
            {filteredConsultations.length === 0 ? (
              <div style={{ padding: 24, textAlign: "center", color: "#9ca3af", fontSize: 13 }}>상담 없음</div>
            ) : (
              filteredConsultations.map((c) => (
                <div key={c.id} style={{ padding: "14px 16px", background: selected?.id === c.id ? "#eff6ff" : "white", borderBottom: "1px solid #f3f4f6", borderLeft: selected?.id === c.id ? "3px solid #3b82f6" : "3px solid transparent" }}>
                  <div onClick={() => setSelected(c)} style={{ cursor: "pointer" }}>
                    <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{c.title}</div>
                    <div style={{ fontSize: 12, color: "#6b7280", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span>{statusLabel(c.status)}</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span>{new Date(c.updated_at).toLocaleDateString("ko-KR")}</span>
                        <button onClick={(e) => { e.stopPropagation(); deleteConsultation(c.id); }} style={{ fontSize: 11, color: "#ef4444", background: "none", border: "none", cursor: "pointer" }}>삭제</button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 오른쪽 채팅 */}
        <div className="advisor-chat" style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {selected ? (
            <>
              <div style={{ padding: "14px 20px", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, flexWrap: "wrap", gap: 8 }}>
                <div>
                  <span style={{ fontWeight: "bold", fontSize: 16 }}>{selected.title}</span>
                  <span style={{ fontSize: 13, color: "#6b7280", marginLeft: 10 }}>{statusLabel(selected.status)}</span>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  {selected.status === "waiting" && <button onClick={() => assign(selected.id)} style={{ padding: "6px 14px", background: "#3b82f6", color: "white", border: "none", borderRadius: 6, cursor: "pointer" }}>상담 수락</button>}
                  {selected.status === "active" && <button onClick={() => close(selected.id)} style={{ padding: "6px 14px", background: "#ef4444", color: "white", border: "none", borderRadius: 6, cursor: "pointer" }}>상담 종료</button>}
                </div>
              </div>
              <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
                {messages.map((m, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: m.sender_type === "advisor" ? "flex-end" : "flex-start" }}>
                    {m.sender_type === "user" && <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#e5e7eb", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, marginRight: 8, flexShrink: 0 }}>유</div>}
                    <div style={{ maxWidth: "75%", padding: "10px 14px", borderRadius: m.sender_type === "advisor" ? "18px 18px 4px 18px" : "18px 18px 18px 4px", background: m.sender_type === "advisor" ? "#3b82f6" : "#f3f4f6", color: m.sender_type === "advisor" ? "white" : "#111827", fontSize: 14 }}>
                      {m.content}
                      <div style={{ fontSize: 11, marginTop: 4, opacity: 0.7, textAlign: "right" }}>{new Date(m.created_at).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}</div>
                    </div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>
              <div style={{ padding: "12px 16px", borderTop: "1px solid #e5e7eb", display: "flex", gap: 8, flexShrink: 0 }}>
                <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendMessage()} placeholder={selected.status !== "active" ? "상담 수락 후 메시지를 보낼 수 있습니다" : "메시지 입력..."} disabled={selected.status !== "active"} style={{ flex: 1, padding: "10px 14px", border: "1px solid #d1d5db", borderRadius: 24, outline: "none", fontSize: 14 }} />
                <button onClick={sendMessage} disabled={selected.status !== "active"} style={{ padding: "10px 20px", background: "#3b82f6", color: "white", border: "none", borderRadius: 24, cursor: "pointer", fontWeight: "bold", whiteSpace: "nowrap" }}>전송</button>
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af" }}>상담을 선택하세요</div>
          )}
        </div>
      </div>
    </div>
  );
}
