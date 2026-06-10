import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import axios from "../api/axios";

export default function PaymentSuccessPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState("결제 처리 중...");

  useEffect(() => {
    const confirm = async () => {
      const paymentKey = searchParams.get("paymentKey");
      const orderId = searchParams.get("orderId");
      const amount = Number(searchParams.get("amount"));
      try {
        await axios.post("/payments/confirm", { paymentKey, orderId, amount });
        setStatus("결제 완료! 🎉");
        setTimeout(() => navigate("/dashboard"), 2000);
      } catch {
        setStatus("결제 승인 중 오류가 발생했어요. 고객센터에 문의해 주세요.");
      }
    };
    confirm();
  }, []);

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: 24, textAlign: "center" }}>
      <div style={{ fontSize: 48 }}>💳</div>
      <p style={{ fontSize: 20, fontWeight: 600, color: "#111827" }}>{status}</p>
      {status.includes("오류") && (
        <button onClick={() => navigate("/pricing")} style={{ marginTop: 16, padding: "10px 24px", background: "#3b82f6", color: "white", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
          요금제 페이지로 돌아가기
        </button>
      )}
    </div>
  );
}
