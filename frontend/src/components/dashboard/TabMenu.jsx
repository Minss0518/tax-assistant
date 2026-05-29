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
    <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "10px 12px", marginBottom: 14 }}>
      <div style={{ display: "flex", gap: 6 }}>
        {TAB_MENUS.map((m) => {
          const isActive = location.pathname === m.path;
          return (
            <button
              key={m.path}
              onClick={() => navigate(m.path)}
              style={{
                flex: 1,
                padding: "8px 4px",
                fontSize: 12,
                fontWeight: 600,
                color: isActive ? "#fff" : "#6b7280",
                background: isActive ? "#1d4ed8" : "#f3f4f6",
                border: "none",
                borderRadius: 8,
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