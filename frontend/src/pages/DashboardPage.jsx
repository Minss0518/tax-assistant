import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import useAuthStore from "../store/authStore";
import { getTransactions } from "../api/transactions";
import api from "../api/axios";

import Navbar from "../components/layout/Navbar";
import NetProfitHeader from "../components/dashboard/NetProfitHeader";
import DeadlineCard from "../components/dashboard/DeadlineCard";
import AIInsightWidget from "../components/AIInsightWidget";
import TabMenu from "../components/dashboard/TabMenu";


const MONTH_NAMES = ["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"];

function getMonthlyData(transactions) {
  const map = {};
  transactions.forEach((t) => {
    const d = new Date(t.transaction_date);
    const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}`;
    if (!map[key]) map[key] = { month: MONTH_NAMES[d.getMonth()], income: 0, expense: 0 };
    if (t.type === "income") map[key].income += t.amount;
    else map[key].expense += t.amount;
  });
  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([, v]) => v);
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { token } = useAuthStore();
  const [transactions, setTransactions] = useState([]);
  const [lastTaxResult, setLastTaxResult] = useState(null);

  useEffect(() => {
    if (!token) { navigate("/login"); return; }
    getTransactions().then((res) => setTransactions(res.data));
    api.get("/tax-calculator/history")
      .then((res) => {
        if (res.data?.length > 0) {
          const latest = res.data[0];
          setLastTaxResult({
            grossIncome: latest.grossIncome,
            totalTax: latest.totalTax,
            finalTax: latest.finalTax,
            isRefund: latest.isRefund,
            refundAmount: latest.refundAmount,
            calculatedAt: latest.createdAt,
          });
        }
      })
      .catch((e) => console.error("세금 계산 결과 불러오기 실패:", e));
  }, [token]);

  const totalIncome = transactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const monthlyData = getMonthlyData(transactions);

  return (
    <div style={{ minHeight: "100vh", background: "#f8f9fa", fontFamily: "'Pretendard', -apple-system, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Pretendard:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
      `}</style>

      <Navbar />
      <NetProfitHeader totalIncome={totalIncome} totalExpense={totalExpense} monthlyData={monthlyData} lastTaxResult={lastTaxResult} />

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "20px 16px 40px" }}>
        <TabMenu />
        <DeadlineCard />
        <AIInsightWidget />
      </div>
    </div>
  );
}