import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import { getTransactions } from '../api/transactions';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

const MONTH_NAMES = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];

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
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 px-4 py-3 text-xs">
                <p className="font-bold text-gray-700 mb-2">{label}</p>
                {payload.map((p, i) => (
                    <div key={i} className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
                        <span className="text-gray-500">{p.name}:</span>
                        <span className="font-bold" style={{ color: p.color }}>{p.value.toLocaleString()}원</span>
                    </div>
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
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (!token) { navigate('/login'); return; }
        getTransactions().then((res) => setTransactions(res.data));
        const saved = localStorage.getItem('lastTaxResult');
        if (saved) setLastTaxResult(JSON.parse(saved));
        setTimeout(() => setVisible(true), 50);
    }, [token]);

    const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const netProfit = totalIncome - totalExpense;
    const monthlyData = getMonthlyData(transactions);
    const fmt = (n) => n?.toLocaleString() ?? '0';

    const today = new Date();
    const taxDday = (() => {
        const deadline = new Date(today.getFullYear(), 4, 31);
        if (today > deadline) deadline.setFullYear(deadline.getFullYear() + 1);
        return Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));
    })();

    const menus = [
        { icon: '📊', label: '거래 내역', sub: '수입/지출 관리', path: '/transactions', from: 'from-blue-500', to: 'to-cyan-400', shadow: 'shadow-blue-200' },
        { icon: '🤖', label: 'AI 세무 상담', sub: '세금 질문하기', path: '/chat', from: 'from-emerald-500', to: 'to-teal-400', shadow: 'shadow-emerald-200' },
        { icon: '🧮', label: '세금 계산기', sub: '예상 세액 계산', path: '/tax-calculator', from: 'from-violet-500', to: 'to-purple-400', shadow: 'shadow-violet-200' },
    ];

    return (
        <div className="min-h-screen bg-gray-50 overflow-x-hidden">
            <style>{`
                @keyframes fadeUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .fade-up { animation: fadeUp 0.5s ease forwards; opacity: 0; }
                .delay-1 { animation-delay: 0.05s; }
                .delay-2 { animation-delay: 0.1s; }
                .delay-3 { animation-delay: 0.15s; }
                .delay-4 { animation-delay: 0.2s; }
                .delay-5 { animation-delay: 0.25s; }
                .delay-6 { animation-delay: 0.3s; }
            `}</style>

            {/* 상단 헤더 — 그라디언트 배경 */}
            <div className="relative bg-gradient-to-br from-blue-600 via-blue-500 to-violet-500 px-6 pt-10 pb-20 overflow-hidden">
                {/* 배경 장식 */}
                <div className="absolute top-[-40px] right-[-40px] w-64 h-64 rounded-full bg-white/10 blur-2xl" />
                <div className="absolute bottom-[-20px] left-[-20px] w-48 h-48 rounded-full bg-violet-400/20 blur-xl" />

                <div className="relative max-w-2xl mx-auto">
                    {/* 날짜 + 버튼 */}
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <p className="text-blue-200 text-xs mb-1">
                                {today.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })}
                            </p>
                            <h1 className="text-white text-2xl font-extrabold">💼 AI 세무 비서</h1>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                            <div className="flex gap-3">
                                <button onClick={() => navigate('/my-info')}
                                    className="text-sm text-white/80 hover:text-white transition font-medium">
                                    👤 내 정보
                                </button>
                                <button onClick={() => { logout(); navigate('/login'); }}
                                    className="text-sm text-white/60 hover:text-white transition">
                                    로그아웃
                                </button>
                            </div>
                            <button onClick={() => navigate('/pricing')}
                                className="text-xs bg-white/20 hover:bg-white/30 text-white font-semibold px-3 py-1.5 rounded-full transition backdrop-blur-sm border border-white/20">
                                ✨ Pro 업그레이드
                            </button>
                        </div>
                    </div>

                    {/* 순이익 큰 숫자 */}
                    <div className={`fade-up delay-1`}>
                        <p className="text-blue-200 text-sm mb-1">이번 달 순이익</p>
                        <p className={`text-4xl font-extrabold text-white mb-1`}>
                            {netProfit >= 0 ? '+' : ''}{fmt(netProfit)}원
                        </p>
                        <p className="text-blue-200 text-xs">
                            수입 +{fmt(totalIncome)}원 · 지출 -{fmt(totalExpense)}원
                        </p>
                    </div>
                </div>
            </div>

            <div className="max-w-2xl mx-auto px-4 -mt-12 pb-10">

                {/* 종소세 D-day 카드 */}
                <div className={`fade-up delay-2 bg-white rounded-2xl shadow-lg border border-orange-100 p-4 mb-5 flex justify-between items-center`}>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-400 flex items-center justify-center text-xl">
                            📅
                        </div>
                        <div>
                            <p className="text-xs text-gray-400">종합소득세 신고 마감</p>
                            <p className="font-bold text-gray-800">5월 31일까지</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-gray-400">남은 기간</p>
                        <p className="text-2xl font-extrabold text-orange-500">D-{taxDday}</p>
                    </div>
                </div>

                {/* 수입/지출 카드 2개 */}
                <div className={`fade-up delay-2 grid grid-cols-2 gap-3 mb-5`}>
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-sm">💚</div>
                            <p className="text-xs text-gray-400 font-medium">총 수입</p>
                        </div>
                        <p className="text-xl font-extrabold text-emerald-500">+{fmt(totalIncome)}<span className="text-sm font-normal text-gray-400">원</span></p>
                    </div>
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center text-sm">❤️</div>
                            <p className="text-xs text-gray-400 font-medium">총 지출</p>
                        </div>
                        <p className="text-xl font-extrabold text-rose-500">-{fmt(totalExpense)}<span className="text-sm font-normal text-gray-400">원</span></p>
                    </div>
                </div>

                {/* 월별 차트 */}
                <div className={`fade-up delay-3 bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-5`}>
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="font-bold text-gray-800">📈 월별 추이</h2>
                    </div>
                    {monthlyData.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 text-gray-300">
                            <p className="text-4xl mb-2">📊</p>
                            <p className="text-sm">거래 내역을 추가하면 차트가 표시돼요</p>
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height={180}>
                            <AreaChart data={monthlyData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#fb7185" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="#fb7185" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false}
                                    tickFormatter={(v) => v >= 10000 ? `${(v / 10000).toFixed(0)}만` : v} />
                                <Tooltip content={<CustomTooltip />} />
                                <Area type="monotone" dataKey="income" name="수입" stroke="#10b981" strokeWidth={2} fill="url(#incomeGrad)" />
                                <Area type="monotone" dataKey="expense" name="지출" stroke="#fb7185" strokeWidth={2} fill="url(#expenseGrad)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    )}
                </div>

                {/* 메뉴 3개 */}
                <div className={`fade-up delay-4 grid grid-cols-3 gap-3 mb-5`}>
                    {menus.map((m, i) => (
                        <button key={i} onClick={() => navigate(m.path)}
                            className={`bg-gradient-to-br ${m.from} ${m.to} text-white rounded-2xl p-4 text-left transition shadow-md ${m.shadow} hover:scale-105 active:scale-95`}
                            style={{ transition: 'transform 0.15s ease' }}>
                            <div className="text-2xl mb-2">{m.icon}</div>
                            <p className="font-bold text-sm leading-tight">{m.label}</p>
                            <p className="text-white/70 text-xs mt-0.5">{m.sub}</p>
                        </button>
                    ))}
                </div>

                {/* 세금 계산 결과 위젯 */}
                <div className={`fade-up delay-5`}>
                    {lastTaxResult ? (
                        <div onClick={() => navigate('/tax-calculator')}
                            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-5 cursor-pointer hover:border-violet-200 hover:shadow-md transition">
                            <div className="flex justify-between items-center mb-4">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center text-sm">🧮</div>
                                    <h2 className="font-bold text-gray-800">세금 계산 결과</h2>
                                </div>
                                <span className="text-xs text-gray-400">{lastTaxResult.calculatedAt}</span>
                            </div>
                            <div className="flex justify-between text-sm mb-2">
                                <span className="text-gray-400">연 수입</span>
                                <span className="font-semibold text-gray-700">{fmt(lastTaxResult.grossIncome)}원</span>
                            </div>
                            <div className="flex justify-between text-sm mb-4">
                                <span className="text-gray-400">예상 납부세액</span>
                                <span className="font-semibold text-gray-700">{fmt(lastTaxResult.totalTax)}원</span>
                            </div>
                            <div className={`rounded-xl px-4 py-3 text-center ${lastTaxResult.isRefund ? 'bg-emerald-50' : 'bg-rose-50'}`}>
                                <p className="text-xs text-gray-400 mb-1">
                                    {lastTaxResult.isRefund ? '🎉 예상 환급' : '⚠️ 예상 추가납부'}
                                </p>
                                <p className={`font-extrabold text-xl ${lastTaxResult.isRefund ? 'text-emerald-500' : 'text-rose-500'}`}>
                                    {lastTaxResult.isRefund ? fmt(lastTaxResult.refundAmount) : fmt(lastTaxResult.finalTax)}원
                                </p>
                            </div>
                            <p className="text-xs text-violet-400 text-center mt-3">탭하여 다시 계산하기 →</p>
                        </div>
                    ) : (
                        <div onClick={() => navigate('/tax-calculator')}
                            className="bg-white rounded-2xl border-2 border-dashed border-violet-200 p-6 mb-5 cursor-pointer hover:border-violet-400 hover:bg-violet-50 transition text-center">
                            <div className="text-3xl mb-2">🧮</div>
                            <p className="text-sm font-bold text-violet-600">종합소득세 예상 세액 계산하기</p>
                            <p className="text-xs text-gray-400 mt-1">내 수입 기준으로 세금을 미리 확인해요</p>
                        </div>
                    )}
                </div>

                {/* 최근 거래 내역 */}
                <div className={`fade-up delay-6 bg-white rounded-2xl shadow-sm border border-gray-100 p-5`}>
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-sm">📋</div>
                            <h2 className="font-bold text-gray-800">최근 거래 내역</h2>
                        </div>
                        <button onClick={() => navigate('/transactions')}
                            className="text-xs text-blue-500 hover:text-blue-700 font-semibold bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition">
                            전체보기 →
                        </button>
                    </div>
                    {transactions.length === 0 ? (
                        <div className="text-center py-8">
                            <p className="text-3xl mb-2">📭</p>
                            <p className="text-gray-400 text-sm">거래 내역이 없어요</p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-3">
                            {transactions.slice(0, 5).map((t) => (
                                <div key={t.id} className="flex justify-between items-center py-2.5 border-b border-gray-50 last:border-0">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm ${t.type === 'income' ? 'bg-emerald-50' : 'bg-rose-50'}`}>
                                            {t.type === 'income' ? '📈' : '📉'}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-700">{t.memo || '-'}</p>
                                            <p className="text-xs text-gray-400">{t.transaction_date}</p>
                                        </div>
                                    </div>
                                    <span className={`font-bold text-sm ${t.type === 'income' ? 'text-emerald-500' : 'text-rose-500'}`}>
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
