import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import { getTransactions } from '../api/transactions';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

const MONTH_NAMES = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];

function getMonthlyData(transactions) {
    const map = {};
    transactions.forEach((t) => {
        const d = new Date(t.transaction_date);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        if (!map[key]) map[key] = { month: MONTH_NAMES[d.getMonth()], income: 0, expense: 0 };
        if (t.type === 'income') map[key].income += t.amount;
        else map[key].expense += t.amount;
    });
    return Object.values(map).slice(-6);
}

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 px-4 py-3 text-xs">
                <p className="font-bold text-gray-700 mb-1">{label}</p>
                {payload.map((p, i) => (
                    <p key={i} style={{ color: p.color }} className="font-semibold">
                        {p.name}: {p.value.toLocaleString()}원
                    </p>
                ))}
            </div>
        );
    }
    return null;
};

export default function DashboardPage() {
    const navigate = useNavigate();
    const { token, logout } = useAuthStore();
    const [transactions, setTransactions] = useState([]);
    const [lastTaxResult, setLastTaxResult] = useState(null);

    useEffect(() => {
        if (!token) { navigate('/login'); return; }
        getTransactions().then((res) => setTransactions(res.data));
        const saved = localStorage.getItem('lastTaxResult');
        if (saved) setLastTaxResult(JSON.parse(saved));
    }, [token]);

    const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const monthlyData = getMonthlyData(transactions);
    const fmt = (n) => n?.toLocaleString() ?? '0';

    const today = new Date();
    const taxDday = (() => {
        const deadline = new Date(today.getFullYear(), 4, 31);
        if (today > deadline) deadline.setFullYear(deadline.getFullYear() + 1);
        return Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));
    })();

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-2xl mx-auto px-4 py-8">

                {/* 헤더 */}
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <p className="text-xs text-gray-400 mb-0.5">
                            {today.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}
                        </p>
                        <h1 className="text-2xl font-bold text-gray-800">💼 AI 세무 비서</h1>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                        <button onClick={() => { logout(); navigate('/login'); }}
                            className="text-sm text-gray-400 hover:text-red-500 transition">
                            로그아웃
                        </button>
                        <button onClick={() => navigate('/pricing')}
                            className="text-xs bg-gradient-to-r from-blue-500 to-violet-500 text-white font-semibold px-3 py-1.5 rounded-full hover:opacity-90 transition shadow-sm">
                            ✨ Pro 업그레이드
                        </button>
                    </div>
                </div>

                {/* 종소세 D-day 배너 */}
                <div className="bg-gradient-to-r from-amber-400 to-orange-400 rounded-2xl px-5 py-4 mb-6 flex justify-between items-center shadow-md shadow-orange-100">
                    <div>
                        <p className="text-white text-xs font-semibold opacity-80">📅 종합소득세 신고 마감</p>
                        <p className="text-white font-bold text-lg mt-0.5">5월 31일까지</p>
                    </div>
                    <div className="bg-white/20 rounded-xl px-4 py-2 text-center">
                        <p className="text-white text-xs opacity-80">남은 기간</p>
                        <p className="text-white font-extrabold text-2xl">D-{taxDday}</p>
                    </div>
                </div>

                {/* 수입/지출/순이익 카드 */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                    <div className="bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl p-4 shadow-md shadow-emerald-100">
                        <p className="text-emerald-100 text-xs mb-1">총 수입</p>
                        <p className="text-white font-bold text-lg leading-tight">
                            +{fmt(totalIncome)}<span className="text-sm font-normal">원</span>
                        </p>
                    </div>
                    <div className="bg-gradient-to-br from-rose-400 to-pink-500 rounded-2xl p-4 shadow-md shadow-rose-100">
                        <p className="text-rose-100 text-xs mb-1">총 지출</p>
                        <p className="text-white font-bold text-lg leading-tight">
                            -{fmt(totalExpense)}<span className="text-sm font-normal">원</span>
                        </p>
                    </div>
                    <div className="bg-gradient-to-br from-blue-500 to-indigo-500 rounded-2xl p-4 shadow-md shadow-blue-100">
                        <p className="text-blue-100 text-xs mb-1">순이익</p>
                        <p className="text-white font-bold text-lg leading-tight">
                            {fmt(totalIncome - totalExpense)}<span className="text-sm font-normal">원</span>
                        </p>
                    </div>
                </div>

                {/* 월별 차트 */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6">
                    <h2 className="font-bold text-gray-700 mb-4">📈 월별 수입 / 지출</h2>
                    {monthlyData.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-gray-300">
                            <p className="text-4xl mb-2">📊</p>
                            <p className="text-sm">거래 내역을 추가하면 차트가 표시돼요</p>
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={monthlyData} barCategoryGap="30%">
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false}
                                    tickFormatter={(v) => v >= 10000 ? `${(v / 10000).toFixed(0)}만` : v} />
                                <Tooltip content={<CustomTooltip />} />
                                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                                <Bar dataKey="income" name="수입" fill="#34d399" radius={[6, 6, 0, 0]} />
                                <Bar dataKey="expense" name="지출" fill="#fb7185" radius={[6, 6, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>

                {/* 메뉴 버튼 */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                    <button onClick={() => navigate('/transactions')}
                        className="bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-2xl p-5 text-left transition shadow-md shadow-blue-100">
                        <div className="text-2xl mb-2">📊</div>
                        <p className="font-bold text-sm">거래 내역</p>
                        <p className="text-blue-200 text-xs mt-0.5">수입/지출 관리</p>
                    </button>
                    <button onClick={() => navigate('/chat')}
                        className="bg-gradient-to-br from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-2xl p-5 text-left transition shadow-md shadow-emerald-100">
                        <div className="text-2xl mb-2">🤖</div>
                        <p className="font-bold text-sm">AI 세무 상담</p>
                        <p className="text-emerald-200 text-xs mt-0.5">세금 질문하기</p>
                    </button>
                    <button onClick={() => navigate('/tax-calculator')}
                        className="bg-gradient-to-br from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white rounded-2xl p-5 text-left transition shadow-md shadow-violet-100">
                        <div className="text-2xl mb-2">🧮</div>
                        <p className="font-bold text-sm">세금 계산기</p>
                        <p className="text-violet-200 text-xs mt-0.5">예상 세액 계산</p>
                    </button>
                </div>

                {/* 세금 계산 결과 위젯 */}
                {lastTaxResult ? (
                    <div onClick={() => navigate('/tax-calculator')}
                        className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-2xl border border-violet-100 p-5 mb-6 cursor-pointer hover:border-violet-300 transition">
                        <div className="flex justify-between items-center mb-3">
                            <h2 className="font-bold text-gray-700">🧮 마지막 세금 계산 결과</h2>
                            <span className="text-xs text-gray-400">{lastTaxResult.calculatedAt}</span>
                        </div>
                        <div className="flex justify-between text-sm mb-2">
                            <span className="text-gray-500">연 수입</span>
                            <span className="font-semibold text-gray-700">{fmt(lastTaxResult.grossIncome)}원</span>
                        </div>
                        <div className="flex justify-between text-sm mb-3">
                            <span className="text-gray-500">예상 납부세액</span>
                            <span className="font-semibold text-gray-700">{fmt(lastTaxResult.totalTax)}원</span>
                        </div>
                        <div className={`rounded-xl px-4 py-3 text-center ${lastTaxResult.isRefund ? 'bg-green-50' : 'bg-red-50'}`}>
                            <p className="text-xs text-gray-400 mb-0.5">
                                {lastTaxResult.isRefund ? '🎉 예상 환급' : '⚠️ 예상 추가납부'}
                            </p>
                            <p className={`font-bold text-xl ${lastTaxResult.isRefund ? 'text-green-500' : 'text-red-500'}`}>
                                {lastTaxResult.isRefund ? fmt(lastTaxResult.refundAmount) : fmt(lastTaxResult.finalTax)}원
                            </p>
                        </div>
                        <p className="text-xs text-violet-400 text-center mt-3">탭하여 다시 계산하기 →</p>
                    </div>
                ) : (
                    <div onClick={() => navigate('/tax-calculator')}
                        className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-2xl border border-dashed border-violet-200 p-5 mb-6 cursor-pointer hover:border-violet-400 transition text-center">
                        <div className="text-3xl mb-2">🧮</div>
                        <p className="text-sm font-semibold text-violet-500">종합소득세 예상 세액 계산하기</p>
                        <p className="text-xs text-gray-400 mt-1">내 수입 기준으로 세금을 미리 확인해요</p>
                    </div>
                )}

                {/* 최근 거래 내역 */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="font-bold text-gray-700">최근 거래 내역</h2>
                        <button onClick={() => navigate('/transactions')}
                            className="text-xs text-blue-500 hover:text-blue-700 font-semibold">
                            전체보기 →
                        </button>
                    </div>
                    {transactions.length === 0 ? (
                        <p className="text-gray-400 text-sm text-center py-4">거래 내역이 없어요</p>
                    ) : (
                        <div className="flex flex-col gap-3">
                            {transactions.slice(0, 5).map((t) => (
                                <div key={t.id} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                                    <div className="flex items-center gap-2">
                                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${t.type === 'income' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-500'}`}>
                                            {t.type === 'income' ? '수입' : '지출'}
                                        </span>
                                        <div>
                                            <p className="text-sm text-gray-700">{t.memo || '-'}</p>
                                            <p className="text-xs text-gray-400">{t.transaction_date}</p>
                                        </div>
                                    </div>
                                    <span className={`font-bold text-sm ${t.type === 'income' ? 'text-emerald-500' : 'text-rose-400'}`}>
                                        {t.type === 'income' ? '+' : '-'}{fmt(t.amount)}원
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
