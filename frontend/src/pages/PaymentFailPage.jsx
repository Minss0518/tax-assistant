import { useNavigate } from "react-router-dom";

export default function PaymentFailPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <div className="text-4xl">❌</div>
      <p className="text-xl font-semibold">결제가 취소됐어요.</p>
      <button
        onClick={() => navigate("/pricing")}
        className="mt-4 px-6 py-2 bg-blue-500 text-white rounded-lg"
      >
        요금제 페이지로 돌아가기
      </button>
    </div>
  );
}