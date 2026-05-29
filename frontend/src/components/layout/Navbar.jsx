import { useNavigate, useLocation } from "react-router-dom";
import useAuthStore from "../../store/authStore";

const TAB_MENUS = [
  { label: "거래 내역", path: "/transactions" },
  { label: "AI 세무 상담", path: "/chat" },
  { label: "세무사 상담", path: "/consultation" },
  { label: "세금 계산기", path: "/tax-calculator" },
  { label: "일괄 업로드", path: "/upload" },
];

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuthStore();

  return (
    <div>
      {/* 상단 바 */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "0 24px" }}>
        <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", height: 52 }}>
          <div onClick={() => navigate("/dashboard")} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
            <div style={{ width: 28, height: 28, background: "#1d4ed8", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
              </svg>
            </div>
            <span style={{ fontWeight: 700, fontSize: 15, color: "#111827", letterSpacing: "-0.3px" }}>세무비서</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <button
              onClick={() => navigate("/pricing")}
              style={{ fontSize: 12, fontWeight: 600, color: "#1d4ed8", border: "1px solid #bfdbfe", borderRadius: 6, padding: "5px 12px", background: "#eff6ff", cursor: "pointer", fontFamily: "inherit" }}
            >
              Pro 업그레이드
            </button>
            <button
              onClick={() => navigate("/my-info")}
              style={{ fontSize: 13, color: "#6b7280", padding: "6px 10px", borderRadius: 6, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}
            >
              내 정보
            </button>
            <button
              onClick={() => { logout(); navigate("/login"); }}
              style={{ fontSize: 13, color: "#9ca3af", padding: "6px 10px", borderRadius: 6, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}
            >
              로그아웃
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}