import { useNavigate } from "react-router-dom";

export default function TaxResultCard({ lastTaxResult }) {
  const navigate = useNavigate();
  const fmt = (n) => n?.toLocaleString() ?? "0";

  if (lastTaxResult) {
    return (
      <div
        onClick={() => navigate("/tax-calculator")}
        style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20, cursor: "pointer", marginBottom: 14, transition: "border-color 0.15s" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>세금 계산 결과</p>
          <span style={{ fontSize: 11, color: "#9ca3af" }}>{lastTaxResult.calculatedAt}</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: 13, color: "#6b7280" }}>연 수입</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{fmt(lastTaxResult.grossIncome)}원</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: 13, color: "#6b7280" }}>예상 납부세액</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{fmt(lastTaxResult.totalTax)}원</span>
          </div>
        </div>
        <div style={{ borderTop: "1px solid #f3f4f6", paddingTop: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <p style={{ fontSize: 11, color: "#9ca3af", marginBottom: 3 }}>
              {lastTaxResult.isRefund ? "예상 환급세액" : "예상 추가납부세액"}
            </p>
            <p style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.5px", color: lastTaxResult.isRefund ? "#059669" : "#dc2626" }}>
              {lastTaxResult.isRefund ? fmt(lastTaxResult.refundAmount) : fmt(lastTaxResult.finalTax)}원
            </p>
          </div>
          <span style={{ fontSize: 12, color: "#6d28d9", fontWeight: 600 }}>다시 계산하기 →</span>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={() => navigate("/tax-calculator")}
      style={{ background: "#fff", border: "1px dashed #e5e7eb", borderRadius: 12, padding: 20, cursor: "pointer", marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "space-between" }}
    >
      <div>
        <p style={{ fontSize: 14, fontWeight: 600, color: "#111827", marginBottom: 4 }}>종합소득세 예상 세액 계산</p>
        <p style={{ fontSize: 12, color: "#9ca3af" }}>수입 기준으로 예상 세금을 미리 확인하세요</p>
      </div>
      <span style={{ fontSize: 13, color: "#6d28d9", fontWeight: 600, whiteSpace: "nowrap", marginLeft: 16 }}>계산하기 →</span>
    </div>
  );
}