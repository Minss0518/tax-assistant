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

// 과세기간: 매년 6월 1일 ~ 다음해 5월 31일
// taxYear = 시작 년도 (예: 2026 → 2026.06.01 ~ 2027.05.31)
// 현재 진행 중인 과세기간의 taxYear:
//   오늘이 6월 이후면 → 올해
//   오늘이 5월 이전이면 → 작년
function getCurrentTaxYear() {
  const today = new Date();
  return today.getMonth() >= 5 ? today.getFullYear() : today.getFullYear() - 1;
}

function getTaxPeriod(taxYear) {
  const today = new Date();
  const startDate = new Date(taxYear, 5, 1); // 해당년도 6월 1일
  const naturalEnd = new Date(taxYear + 1, 4, 31); // 다음해 5월 31일
  const endDate = naturalEnd > today ? today : naturalEnd; // 현재 진행중이면 오늘까지
  return { startDate, endDate };
}

function getMonthlyData(transactions, taxYear) {
  const { startDate, endDate } = getTaxPeriod(taxYear);

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
        month: `${d.getMonth() + 1}월`,
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
  const [selectedTaxYear, setSelectedTaxYear] = useState(getCurrentTaxYear());

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

  const currentTaxYear = getCurrentTaxYear();

  // 거래 데이터에서 과세기간 목록 추출
  // 각 거래의 날짜가 속하는 taxYear 계산 (6월 이후면 해당년도, 이전이면 전년도)
  const availableTaxYears = [...new Set(
    transactions.map((t) => {
      const d = new Date(t.transaction_date);
      return d.getMonth() >= 5 ? d.getFullYear() : d.getFullYear() - 1;
    })
  )].sort((a, b) => b - a);

  // 이번 달 수입/지출 (항상 이번 달 기준)
  const today = new Date();
  const thisMonthTx = transactions.filter((t) => {
    const d = new Date(t.transaction_date);
    return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth();
  });
  const totalIncome = thisMonthTx.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpense = thisMonthTx.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);

  const monthlyData = getMonthlyData(transactions, selectedTaxYear);

  // 선택된 과세기간 레이블
  const { startDate, endDate } = getTaxPeriod(selectedTaxYear);
  const periodLabel = `${startDate.getFullYear()}.06 ~ ${endDate.getFullYear()}.${String(endDate.getMonth() + 1).padStart(2, "0")}`;

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
        selectedTaxYear={selectedTaxYear}
        availableTaxYears={availableTaxYears}
        currentTaxYear={currentTaxYear}
        periodLabel={periodLabel}
        onTaxYearChange={setSelectedTaxYear}
      />
      <div className="dashboard-content" style={{ maxWidth: 720, margin: "0 auto", padding: "20px 16px 40px" }}>
        <TabMenu />
        <DeadlineCard />
        <AIInsightWidget />
      </div>
    </div>
  );
}
