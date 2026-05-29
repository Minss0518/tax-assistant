export default function NetProfitHeader({ totalIncome, totalExpense }) {
  const netProfit = totalIncome - totalExpense;
  const fmt = (n) => n?.toLocaleString() ?? "0";
  const today = new Date();

  return (
    <div style={{ background: "#111827", padding: "32px 24px 28px" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <p style={{ fontSize: 11, color: "#6b7280", marginBottom: 6, fontWeight: 500, letterSpacing: "0.8px", textTransform: "uppercase" }}>
          {today.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })} 기준
        </p>
        <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 4 }}>이번 달 순이익</p>
        <p style={{ fontSize: 36, fontWeight: 700, color: "#fff", letterSpacing: "-1px", marginBottom: 10 }}>
          {netProfit >= 0 ? "+" : ""}{fmt(netProfit)}
          <span style={{ fontSize: 18, fontWeight: 400, color: "#6b7280", marginLeft: 4 }}>원</span>
        </p>
        <div style={{ display: "flex", gap: 20 }}>
          <span style={{ fontSize: 13, color: "#6b7280" }}>
            수입 <span style={{ color: "#34d399", fontWeight: 600 }}>+{fmt(totalIncome)}원</span>
          </span>
          <span style={{ fontSize: 13, color: "#374151" }}>·</span>
          <span style={{ fontSize: 13, color: "#6b7280" }}>
            지출 <span style={{ color: "#f87171", fontWeight: 600 }}>-{fmt(totalExpense)}원</span>
          </span>
        </div>
      </div>
    </div>
  );
}