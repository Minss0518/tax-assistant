import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: "10px 14px", fontSize: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>
        <p style={{ fontWeight: 600, color: "#111827", marginBottom: 6 }}>{label}</p>
        {payload.map((p, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: p.color }} />
            <span style={{ color: "#6b7280" }}>{p.name}</span>
            <span style={{ fontWeight: 600, color: "#111827" }}>{p.value.toLocaleString()}원</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function MonthlyChart({ data }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20, marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>월별 수입 · 지출 추이</p>
        <div style={{ display: "flex", gap: 14 }}>
          <span style={{ fontSize: 11, color: "#059669", fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 12, height: 2, background: "#059669", display: "inline-block", borderRadius: 1 }} />수입
          </span>
          <span style={{ fontSize: 11, color: "#dc2626", fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 12, height: 2, background: "#dc2626", display: "inline-block", borderRadius: 1 }} />지출
          </span>
        </div>
      </div>

      {data.length === 0 ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 0" }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5" style={{ marginBottom: 8 }}>
            <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
          </svg>
          <p style={{ fontSize: 13, color: "#9ca3af" }}>거래 내역을 추가하면 차트가 표시됩니다</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={160}>
          <AreaChart data={data} margin={{ top: 5, right: 0, left: -24, bottom: 0 }}>
            <defs>
              <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#059669" stopOpacity={0.1} />
                <stop offset="95%" stopColor="#059669" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#dc2626" stopOpacity={0.08} />
                <stop offset="95%" stopColor="#dc2626" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="2 4" stroke="#f3f4f6" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false}
              tickFormatter={(v) => v >= 10000 ? `${(v / 10000).toFixed(0)}만` : v} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="income" name="수입" stroke="#059669" strokeWidth={1.5} fill="url(#incomeGrad)" dot={false} activeDot={{ r: 4, fill: "#059669" }} />
            <Area type="monotone" dataKey="expense" name="지출" stroke="#dc2626" strokeWidth={1.5} fill="url(#expenseGrad)" dot={false} activeDot={{ r: 4, fill: "#dc2626" }} />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}