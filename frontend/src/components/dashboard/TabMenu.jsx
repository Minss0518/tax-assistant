import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

const API = import.meta.env.VITE_API_URL;

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
  const [userPlan, setUserPlan] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetch(`${API}/users/me`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    })
      .then((r) => r.json())
      .then((d) => setUserPlan(d.plan))
      .catch(() => {});
  }, []);

  const handleClick = (m) => {
    if (m.path === "/consultation" && userPlan !== "premium") {
      setShowModal(true);
      return;
    }
    navigate(m.path);
  };

  return (
    <>
      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "10px 12px", marginBottom: 14 }}>
        <div style={{ display: "flex", gap: 6 }}>
          {TAB_MENUS.map((m) => {
            const isActive = location.pathname === m.path;
            return (
              <button
                key={m.path}
                onClick={() => handleClick(m)}
                style={{
                  flex: 1,
                  padding: "8px 4px",
                  fontSize: 12,
                  fontWeight: 600,
                  color: isActive ? "#fff" : "#1d4ed8",
                  background: isActive ? "#1d4ed8" : "#eff6ff",
                  border: "1px solid #bfdbfe",
                  borderRadius: 6,
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

      {/* 플랜 안내 모달 */}
      {showModal && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: "0 16px" }}
          onClick={() => setShowModal(false)}
        >
          <div
            style={{ background: "white", borderRadius: 24, padding: 32, maxWidth: 360, width: "100%", textAlign: "center", boxShadow: "0 25px 50px rgba(0,0,0,0.2)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: 48, marginBottom: 16 }}>👑</div>
            <h3 style={{ fontWeight: 700, fontSize: 18, color: "#111827", marginBottom: 8 }}>Premium 전용 기능</h3>
            <p style={{ color: "#6b7280", fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
              세무사 상담은 Premium 구독자만 사용할 수 있습니다.<br />요금제 구매 페이지로 이동하겠습니까?
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => setShowModal(false)}
                style={{ flex: 1, padding: "12px 0", borderRadius: 12, border: "1px solid #e5e7eb", background: "white", color: "#6b7280", fontWeight: 600, fontSize: 14, cursor: "pointer" }}
              >
                취소
              </button>
              <button
                onClick={() => { setShowModal(false); navigate("/pricing"); }}
                style={{ flex: 1, padding: "12px 0", borderRadius: 12, border: "none", background: "#7c3aed", color: "white", fontWeight: 600, fontSize: 14, cursor: "pointer" }}
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
