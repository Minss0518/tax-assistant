import { useNavigate, useLocation } from "react-router-dom";

const TAB_MENUS = [
  { label: "거래 내역", path: "/transactions" },
  { label: "AI 세무 상담", path: "/chat" },
  { label: "세무사 상담", path: "/consultation" },
  { label: "세금 계산기", path: "/tax-calculator" },
  { label: "일괄 업로드", path: "/upload" },
];

export default function TabMenu() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div style={{ background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "0 24px", marginBottom: 14 }}>
      <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", gap: 0, overflowX: "auto" }}>
        {TAB_MENUS.map((m) => {
          const isActive = location.pathname === m.path;
          return (
            <button
              key={m.path}
              onClick={() => navigate(m.path)}
              style={{
                padding: "12px 16px",
                fontSize: 13,
                fontWeight: isActive ? 600 : 400,
                color: isActive ? "#1d4ed8" : "#6b7280",
                background: "none",
                border: "none",
                borderBottom: isActive ? "2px solid #1d4ed8" : "2px solid transparent",
                cursor: "pointer",
                fontFamily: "inherit",
                whiteSpace: "nowrap",
                transition: "all 0.15s",
              }}
            >
              {m.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}