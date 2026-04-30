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
      } catch (e) {
        setStatus("결제 승인 중 오류가 발생했어요. 고객센터에 문의해 주세요.");
      }
    };
    confirm();
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <div className="text-4xl">💳</div>
      <p className="text-xl font-semibold">{status}</p>
      {status.includes("오류") && (
        <button
          onClick={() => navigate("/pricing")}
          className="mt-4 px-6 py-2 bg-blue-500 text-white rounded-lg"
        >
          요금제 페이지로 돌아가기
        </button>
      )}
    </div>
  );
}