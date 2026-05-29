import { useNavigate } from "react-router-dom";

const MenuIcon = ({ type }) => {
  const icons = {
    transactions: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
      </svg>
    ),
    chat: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    ),
    calculator: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="10" x2="10" y2="10"/><line x1="14" y1="10" x2="16" y2="10"/><line x1="8" y1="14" x2="10" y2="14"/><line x1="14" y1="14" x2="16" y2="14"/><line x1="8" y1="18" x2="10" y2="18"/><line x1="14" y1="18" x2="16" y2="18"/>
      </svg>
    ),
    upload: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
      </svg>
    ),
    consultation: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
  };
  return icons[type] || null;
};

const MENUS = [
  { icon: "transactions", label: "거래 내역", sub: "수입 · 지출 관리", path: "/transactions", accent: "#1d4ed8" },
  { icon: "chat", label: "AI 세무 상담", sub: "세금 질문하기", path: "/chat", accent: "#065f46" },
  { icon: "calculator", label: "세금 계산기", sub: "예상 세액 계산", path: "/tax-calculator", accent: "#6d28d9" },
  { icon: "upload", label: "일괄 업로드", sub: "CSV / Excel", path: "/upload", accent: "#b45309" },
  { icon: "consultation", label: "세무사 상담", sub: "전문가와 직접 상담", path: "/consultation", accent: "#0891b2" },
];

export default function MenuGrid() {
  const navigate = useNavigate();

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
      {MENUS.map((m, i) => (
        <button
          key={i}
          onClick={() => navigate(m.path)}
          style={{
            background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10,
            padding: "16px 18px", textAlign: "left", cursor: "pointer",
            fontFamily: "inherit", transition: "all 0.15s",
            display: "flex", flexDirection: "column", gap: 10,
            gridColumn: i === MENUS.length - 1 && MENUS.length % 2 !== 0 ? "span 2" : "auto",
          }}
        >
          <div style={{ width: 34, height: 34, borderRadius: 8, background: `${m.accent}14`, display: "flex", alignItems: "center", justifyContent: "center", color: m.accent }}>
            <MenuIcon type={m.icon} />
          </div>
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: "#111827", marginBottom: 2 }}>{m.label}</p>
            <p style={{ fontSize: 11, color: "#9ca3af" }}>{m.sub}</p>
          </div>
        </button>
      ))}
    </div>
  );
}