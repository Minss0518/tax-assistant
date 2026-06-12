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

function getMonthlyData(transactions, selectedYear) {
  const today = new Date();
  const currentYear = today.getFullYear();

  let startDate, endDate;
  if (selectedYear === currentYear) {
    // 현재 년도: 1년 전 ~ 오늘
    startDate = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
    endDate = today;
  } else {
    // 과거 년도: 해당 년도 1월 1일 ~ 12월 31일
    startDate = new Date(selectedYear, 0, 1);
    endDate = new Date(selectedYear, 11, 31);
  }

  const map = {};
  transactions
    .filter((t) => {
      const d = new Date(t.transaction_date);
      return d >= startDate && d <= endDate;
    })
    .forEach((t) => {
      const d = new Date(t.transaction_date);
      const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}`;
      if (!map[key]) map[key] = {
        month: `${String(d.getMonth() + 1).padStart(2, "0")}월`,
        income: 0,
        expense: 0,
      };
      if (t.type === "income") map[key].income += t.amount;
      else map[key].expense += t.amount;
    });

  return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v);
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { token } = useAuthStore();
  const [transactions, setTransactions] = useState([]);
  const [lastTaxResult, setLastTaxResult] = useState(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    if (!token) { navigate("/login"); return; }
    getTransactions().then((res) => setTransactions(res.data));
    api.get("/tax-calculator/history")
      .then((res) => {
        if (res.data?.length > 0) {
          const latest = res.data[0];
          setLastTaxResult({ grossIncome: latest.grossIncome, totalTax: latest.totalTax, finalTax: latest.finalTax, isRefund: latest.isRefund, refundAmount: latest.refundAmount, calculatedAt: latest.createdAt });
        }
      })
      .catch((e) => console.error("세금 계산 결과 불러오기 실패:", e));
  }, [token]);

  // 거래 데이터에서 존재하는 년도 목록 추출
  const availableYears = [...new Set(
    transactions.map((t) => new Date(t.transaction_date).getFullYear())
  )].sort((a, b) => b - a);

  const currentYear = new Date().getFullYear();

  // 이번 달 수입/지출 (selectedYear 관계없이 항상 이번 달)
  const thisMonth = new Date().getMonth();
  const thisYear = new Date().getFullYear();
  const thisMonthTx = transactions.filter((t) => {
    const d = new Date(t.transaction_date);
    return d.getFullYear() === thisYear && d.getMonth() === thisMonth;
  });
  const totalIncome = thisMonthTx.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpense = thisMonthTx.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);

  const monthlyData = getMonthlyData(transactions, selectedYear);

  return (
    <div style={{ minHeight: "100vh", background: "#f8f9fa", fontFamily: "'Pretendard', -apple-system, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Pretendard:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @media (max-width: 480px) {
          .dashboard-content { padding: 14px 10px 40px !important; }
        }
      `}</style>
      <Navbar />
      <NetProfitHeader
        totalIncome={totalIncome}
        totalExpense={totalExpense}
        monthlyData={monthlyData}
        lastTaxResult={lastTaxResult}
        selectedYear={selectedYear}
        availableYears={availableYears}
        currentYear={currentYear}
        onYearChange={setSelectedYear}
      />
      <div className="dashboard-content" style={{ maxWidth: 720, margin: "0 auto", padding: "20px 16px 40px" }}>
        <TabMenu />
        <DeadlineCard />
        <AIInsightWidget />
      </div>
    </div>
  );
}
