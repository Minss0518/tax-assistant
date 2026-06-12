import { useState } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ background: "#1f2937", border: "1px solid #374151", borderRadius: 8, padding: "10px 14px", fontSize: 12 }}>
        <p style={{ fontWeight: 600, color: "#fff", marginBottom: 6 }}>{label}</p>
        {payload.map((p, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: p.color }} />
            <span style={{ color: "#9ca3af" }}>{p.name}</span>
            <span style={{ fontWeight: 600, color: "#fff" }}>{p.value.toLocaleString()}원</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const Chart = ({ data, height }) => (
  <ResponsiveContainer width="100%" height={height}>
    <AreaChart data={data} margin={{ top: 5, right: 0, left: 10, bottom: 0 }}>
      <defs>
        <linearGradient id="incomeGradDark" x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor="#34d399" stopOpacity={0.3} />
          <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
        </linearGradient>
        <linearGradient id="expenseGradDark" x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor="#f87171" stopOpacity={0.2} />
          <stop offset="95%" stopColor="#f87171" stopOpacity={0} />
        </linearGradient>
      </defs>
      <CartesianGrid strokeDasharray="2 4" stroke="#374151" vertical={false} />
      <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
      <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false}
        tickFormatter={(v) => {
          if (v >= 100000000) return `${(v / 100000000).toFixed(1)}억`;
          if (v >= 10000) return `${(v / 10000).toFixed(0)}만`;
          return v;
        }} />
      <Tooltip content={<CustomTooltip />} />
      <Area type="monotone" dataKey="income" name="수입" stroke="#34d399" strokeWidth={1.5} fill="url(#incomeGradDark)" dot={false} activeDot={{ r: 4, fill: "#34d399" }} />
      <Area type="monotone" dataKey="expense" name="지출" stroke="#f87171" strokeWidth={1.5} fill="url(#expenseGradDark)" dot={false} activeDot={{ r: 4, fill: "#f87171" }} />
    </AreaChart>
  </ResponsiveContainer>
);

export default function NetProfitHeader({
  totalIncome, totalExpense, monthlyData = [], lastTaxResult,
  selectedTaxYear, availableTaxYears = [], currentTaxYear, periodLabel, onTaxYearChange,
}) {
  const [showModal, setShowModal] = useState(false);
  const netProfit = totalIncome - totalExpense;
  const fmt = (n) => n?.toLocaleString() ?? "0";
  const today = new Date();

  return (
    <>
      <style>{`
        @media (max-width: 640px) {
          .header-top { flex-direction: column !important; gap: 16px !important; }
          .tax-result-box { min-width: 0 !important; width: 100% !important; }
          .net-profit-num { font-size: 28px !important; }
          .year-selector { flex-wrap: wrap !important; }
        }
      `}</style>
      <div style={{ background: "#111827", padding: "24px 16px 20px" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <div className="header-top" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>

            {/* 왼쪽: 순이익 */}
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 11, color: "#fff", marginBottom: 4, fontWeight: 500, letterSpacing: "0.8px", textTransform: "uppercase" }}>
                {today.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })} 기준
              </p>
              <p style={{ fontSize: 13, color: "#fff", marginBottom: 4 }}>이번 달 순이익</p>
              <p className="net-profit-num" style={{ fontSize: 36, fontWeight: 700, color: "#fff", letterSpacing: "-1px", marginBottom: 8 }}>
                {netProfit >= 0 ? "+" : ""}{fmt(netProfit)}
                <span style={{ fontSize: 18, fontWeight: 400, color: "#fff", marginLeft: 4 }}>원</span>
              </p>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <span style={{ fontSize: 13, color: "#fff" }}>
                  수입 <span style={{ color: "#34d399", fontWeight: 600 }}>+{fmt(totalIncome)}원</span>
                </span>
                <span style={{ fontSize: 13, color: "#fff" }}>·</span>
                <span style={{ fontSize: 13, color: "#fff" }}>
                  지출 <span style={{ color: "#f87171", fontWeight: 600 }}>-{fmt(totalExpense)}원</span>
                </span>
              </div>
            </div>

            {/* 오른쪽: 세금 계산 결과 */}
            {lastTaxResult && (
              <div className="tax-result-box" style={{
                background: "#1f2937", border: "1px solid #374151", borderRadius: 12,
                padding: "14px 16px", minWidth: 180, cursor: "pointer",
                transition: "border-color 0.15s", marginLeft: 16,
              }}>
                <p style={{ fontSize: 11, color: "#fff", marginBottom: 10, fontWeight: 600, letterSpacing: "0.5px" }}>세금 계산 결과</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <span style={{ fontSize: 11, color: "#fff" }}>연 수입</span>
                    <span style={{ fontSize: 11, color: "#fff", fontWeight: 600 }}>{fmt(lastTaxResult.grossIncome)}원</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <span style={{ fontSize: 11, color: "#fff" }}>납부세액</span>
                    <span style={{ fontSize: 11, color: "#fff", fontWeight: 600 }}>{fmt(lastTaxResult.totalTax)}원</span>
                  </div>
                </div>
                <div style={{ borderTop: "1px solid #374151", paddingTop: 8 }}>
                  <p style={{ fontSize: 10, color: "#fff", marginBottom: 3 }}>
                    {lastTaxResult.isRefund ? "예상 환급" : "추가납부"}
                  </p>
                  <p style={{ fontSize: 18, fontWeight: 700, color: lastTaxResult.isRefund ? "#34d399" : "#f87171", letterSpacing: "-0.5px" }}>
                    {lastTaxResult.isRefund ? fmt(lastTaxResult.refundAmount) : fmt(lastTaxResult.finalTax)}원
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* 차트 */}
          {monthlyData.length > 0 ? (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, flexWrap: "wrap", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <p style={{ fontSize: 12, color: "#fff" }}>월별 수입 · 지출 추이</p>
                  {/* 과세기간 선택 버튼 */}
                  <div className="year-selector" style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {availableTaxYears.map((y) => (
                      <button
                        key={y}
                        onClick={() => onTaxYearChange(y)}
                        style={{
                          fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 12,
                          border: "1px solid",
                          background: selectedTaxYear === y ? "#fff" : "transparent",
                          color: selectedTaxYear === y ? "#111827" : "#9ca3af",
                          borderColor: selectedTaxYear === y ? "#fff" : "#374151",
                          cursor: "pointer", fontFamily: "inherit",
                        }}
                      >
                        {y === currentTaxYear ? `${y}년~` : `${y}년`}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ display: "flex", gap: 10 }}>
                    <span style={{ fontSize: 11, color: "#34d399", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                      <span style={{ width: 10, height: 2, background: "#34d399", display: "inline-block", borderRadius: 1 }} />수입
                    </span>
                    <span style={{ fontSize: 11, color: "#f87171", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                      <span style={{ width: 10, height: 2, background: "#f87171", display: "inline-block", borderRadius: 1 }} />지출
                    </span>
                  </div>
                  <span onClick={() => setShowModal(true)} style={{ fontSize: 11, color: "#fff", background: "#1f2937", padding: "2px 8px", borderRadius: 4, cursor: "pointer" }}>
                    확대 ↗
                  </span>
                </div>
              </div>
              <Chart data={monthlyData} height={100} />
            </div>
          ) : (
            <p style={{ fontSize: 12, color: "#fff" }}>거래 내역을 추가하면 차트가 표시됩니다</p>
          )}
        </div>
      </div>

      {/* 확대 모달 */}
      {showModal && (
        <div onClick={() => setShowModal(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#111827", borderRadius: 16, padding: 24, width: "100%", maxWidth: 720 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <p style={{ fontSize: 15, fontWeight: 600, color: "#fff" }}>월별 수입 · 지출 추이</p>
                <span style={{ fontSize: 12, color: "#9ca3af" }}>{periodLabel}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ display: "flex", gap: 14 }}>
                  <span style={{ fontSize: 12, color: "#34d399", fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}>
                    <span style={{ width: 12, height: 2, background: "#34d399", display: "inline-block", borderRadius: 1 }} />수입
                  </span>
                  <span style={{ fontSize: 12, color: "#f87171", fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}>
                    <span style={{ width: 12, height: 2, background: "#f87171", display: "inline-block", borderRadius: 1 }} />지출
                  </span>
                </div>
                <button onClick={() => setShowModal(false)} style={{ background: "#374151", border: "none", color: "#9ca3af", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 13 }}>✕</button>
              </div>
            </div>
            <Chart data={monthlyData} height={300} />
          </div>
        </div>
      )}
    </>
  );
}
