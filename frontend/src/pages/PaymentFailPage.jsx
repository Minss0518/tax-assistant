import { useNavigate } from "react-router-dom";

export default function PaymentFailPage() {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: 24, textAlign: "center" }}>
      <div style={{ fontSize: 48 }}>❌</div>
      <p style={{ fontSize: 20, fontWeight: 600, color: "#111827" }}>결제가 취소됐어요.</p>
      <button onClick={() => navigate("/pricing")} style={{ marginTop: 16, padding: "10px 24px", background: "#3b82f6", color: "white", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
        요금제 페이지로 돌아가기
      </button>
    </div>
  );
}
