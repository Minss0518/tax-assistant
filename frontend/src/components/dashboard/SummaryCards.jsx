export default function SummaryCards({ totalIncome, totalExpense }) {
  const fmt = (n) => n?.toLocaleString() ?? "0";

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "16px 20px" }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: "#9ca3af", letterSpacing: "0.8px", textTransform: "uppercase", marginBottom: 8 }}>총 수입</p>
        <p style={{ fontSize: 20, fontWeight: 700, color: "#059669", letterSpacing: "-0.5px" }}>
          +{fmt(totalIncome)}<span style={{ fontSize: 12, fontWeight: 400, color: "#9ca3af", marginLeft: 2 }}>원</span>
        </p>
      </div>
      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "16px 20px" }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: "#9ca3af", letterSpacing: "0.8px", textTransform: "uppercase", marginBottom: 8 }}>총 지출</p>
        <p style={{ fontSize: 20, fontWeight: 700, color: "#dc2626", letterSpacing: "-0.5px" }}>
          -{fmt(totalExpense)}<span style={{ fontSize: 12, fontWeight: 400, color: "#9ca3af", marginLeft: 2 }}>원</span>
        </p>
      </div>
    </div>
  );
}