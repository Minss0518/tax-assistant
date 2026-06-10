import { useNavigate } from "react-router-dom";
import useAuthStore from "../../store/authStore";

export default function Navbar() {
  const navigate = useNavigate();
  const { logout } = useAuthStore();

  return (
    <>
      <style>{`
        @media (max-width: 480px) {
          .navbar-inner { padding: 0 12px !important; }
          .navbar-btn-label { display: none; }
          .navbar-btn-short { display: inline !important; }
          .navbar-logo-text { font-size: 13px !important; }
        }
      `}</style>
      <div style={{ background: "#fff", borderBottom: "1px solid #e5e7eb" }}>
        <div className="navbar-inner" style={{ maxWidth: 720, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", height: 52, padding: "0 24px" }}>

          {/* 로고 */}
          <div onClick={() => navigate("/dashboard")} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", flexShrink: 0 }}>
            <div style={{ width: 28, height: 28, background: "#1d4ed8", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
              </svg>
            </div>
            <span className="navbar-logo-text" style={{ fontWeight: 700, fontSize: 15, color: "#111827", letterSpacing: "-0.3px" }}>세무비서</span>
          </div>

          {/* 우측 버튼들 */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button onClick={() => navigate("/pricing")} style={{ fontSize: 12, fontWeight: 600, color: "#1d4ed8", border: "1px solid #bfdbfe", borderRadius: 6, padding: "5px 10px", background: "#eff6ff", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
              <span className="navbar-btn-label">구독 업그레이드</span>
              <span className="navbar-btn-short" style={{ display: "none" }}>업그레이드</span>
            </button>
            <div style={{ width: 1, height: 16, background: "#e5e7eb" }} />
            <button onClick={() => navigate("/my-info")} style={{ fontSize: 12, fontWeight: 600, color: "#1d4ed8", border: "1px solid #bfdbfe", borderRadius: 6, padding: "5px 10px", background: "#eff6ff", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
              내 정보
            </button>
            <button onClick={() => { logout(); navigate("/login"); }} style={{ fontSize: 12, fontWeight: 600, color: "#1d4ed8", border: "1px solid #bfdbfe", borderRadius: 6, padding: "5px 10px", background: "#eff6ff", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
              로그아웃
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
