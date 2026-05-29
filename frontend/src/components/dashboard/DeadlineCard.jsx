import { useState } from "react";
import { useNavigate } from "react-router-dom";

const TAX_DEADLINES = [
  { name: "종합소득세 신고", month: 4, day: 31, icon: "TAX", color: "#b45309", bg: "#fef3c7", border: "#fde68a" },
  { name: "부가세 신고 (1기)", month: 6, day: 25, icon: "VAT", color: "#1d4ed8", bg: "#eff6ff", border: "#bfdbfe" },
  { name: "부가세 신고 (2기)", month: 0, day: 25, icon: "VAT", color: "#1d4ed8", bg: "#eff6ff", border: "#bfdbfe" },
  { name: "원천세 신고", month: new Date().getMonth(), day: 10, icon: "WIT", color: "#6d28d9", bg: "#f5f3ff", border: "#ddd6fe" },
  { name: "사업장현황신고", month: 1, day: 10, icon: "BIZ", color: "#065f46", bg: "#ecfdf5", border: "#a7f3d0" },
];

function getUpcomingDeadlines() {
  const today = new Date();
  return TAX_DEADLINES.map(({ name, month, day, icon, color, bg, border }) => {
    const deadline = new Date(today.getFullYear(), month, day);
    if (deadline < today) deadline.setFullYear(deadline.getFullYear() + 1);
    const dday = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));
    return { name, icon, color, bg, border, dday, date: `${deadline.getMonth() + 1}월 ${deadline.getDate()}일` };
  }).sort((a, b) => a.dday - b.dday).slice(0, 3);
}

export default function DeadlineCard() {
  const navigate = useNavigate();
  const [deadlineIdx, setDeadlineIdx] = useState(0);
  const upcomingDeadlines = getUpcomingDeadlines();
  const current = upcomingDeadlines[deadlineIdx];

  return (
    <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "16px 20px", marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: "#9ca3af", letterSpacing: "0.8px", textTransform: "uppercase" }}>
          다가오는 신고 기간
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ display: "flex", gap: 5 }}>
            {upcomingDeadlines.map((_, i) => (
              <button
                key={i}
                onClick={() => setDeadlineIdx(i)}
                style={{ width: 6, height: 6, borderRadius: "50%", background: i === deadlineIdx ? "#1d4ed8" : "#e5e7eb", border: "none", padding: 0, cursor: "pointer" }}
              />
            ))}
          </div>
          <button
            onClick={() => navigate("/notifications")}
            style={{ fontSize: 12, color: "#1d4ed8", fontWeight: 600, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}
          >
            전체보기 →
          </button>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 8, background: current.bg, border: `1px solid ${current.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: current.color }}>{current.icon}</span>
          </div>
          <div>
            <p style={{ fontSize: 12, color: "#9ca3af", marginBottom: 3 }}>{current.name}</p>
            <p style={{ fontSize: 15, fontWeight: 600, color: "#111827" }}>{current.date}까지</p>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <p style={{ fontSize: 11, color: "#9ca3af", marginBottom: 3 }}>남은 기간</p>
          <p style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.5px", color: current.dday <= 30 ? "#dc2626" : "#111827" }}>
            D-{current.dday}
          </p>
        </div>
      </div>
    </div>
  );
}