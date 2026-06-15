import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import useAuthStore from "../store/authStore";
import api from "../api/axios";

import Navbar from "../components/layout/Navbar";
import NetProfitHeader from "../components/dashboard/NetProfitHeader";
import DeadlineCard from "../components/dashboard/DeadlineCard";
import AIInsightWidget from "../components/AIInsightWidget";
import TabMenu from "../components/dashboard/TabMenu";

function getCurrentTaxYear() {
  const today = new Date();
  return today.getMonth() >= 5 ? today.getFullYear() : today.getFullYear() - 1;
}

function getTaxPeriod(taxYear) {
  const today = new Date();
  const startDate = new Date(taxYear, 5, 1);
  const naturalEnd = new Date(taxYear + 1, 4, 31);
  const endDate = naturalEnd > today ? today : naturalEnd;
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
      if (!map[key]) map[key] = { month: `${d.getMonth() + 1}월`, income: 0, expense: 0 };
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
  const [availableTaxYears, setAvailableTaxYears] = useState([]);

  const currentTaxYear = getCurrentTaxYear();

  useEffect(() => {
    if (!token) { navigate("/login"); return; }

    // 이번 달 거래 (순이익 표시용)
    const today = new Date();
    const dateFrom = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;
    api.get(`/transactions/?limit=9999&date_from=${dateFrom}`)
      .then((res) => setTransactions(res.data))
      .catch((e) => console.error(e));

    // 년도 목록 (버튼 표시용)
    api.get('/transactions/years')
      .then((res) => {
        const dbYears = res.data.years;
        // DB 년도를 과세기간 taxYear로 변환 후 중복 제거
        const taxYears = [...new Set(
          dbYears.flatMap((y) => {
            // 해당 년도 6월 이후 데이터 → taxYear = y
            // 해당 년도 1~5월 데이터 → taxYear = y-1
            return [y, y - 1];
          })
        )].filter((y) => {
          // 현재 taxYear보다 미래는 제외
          return y <= currentTaxYear;
        }).sort((a, b) => b - a);
        setAvailableTaxYears(taxYears);
      })
      .catch((e) => console.error(e));

    // 세금 계산 결과
    api.get("/tax-calculator/history")
      .then((res) => {
        if (res.data?.length > 0) {
          const latest = res.data[0];
          setLastTaxResult({
            grossIncome: latest.grossIncome, totalTax: latest.totalTax,
            finalTax: latest.finalTax, isRefund: latest.isRefund,
            refundAmount: latest.refundAmount, calculatedAt: latest.createdAt
          });
        }
      })
      .catch((e) => console.error(e));
  }, [token]);

  // 선택된 과세기간 차트 데이터 (별도 API 호출)
  const [chartTransactions, setChartTransactions] = useState([]);
  useEffect(() => {
    if (!token) return;
    const { startDate, endDate } = getTaxPeriod(selectedTaxYear);
    const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    api.get(`/transactions/?limit=99999&date_from=${fmt(startDate)}&date_to=${fmt(endDate)}`)
      .then((res) => setChartTransactions(res.data))
      .catch((e) => console.error(e));
  }, [token, selectedTaxYear]);

  // 이번 달 수입/지출
  const totalIncome = transactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);

  const monthlyData = getMonthlyData(chartTransactions, selectedTaxYear);

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
