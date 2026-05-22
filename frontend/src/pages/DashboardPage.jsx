import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import { getTransactions } from '../api/transactions';
import api from '../api/axios';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import AIInsightWidget from "../components/AIInsightWidget";

const MONTH_NAMES = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];

const TAX_DEADLINES = [
    { name: '종합소득세 신고', month: 4, day: 31, icon: 'TAX', color: '#b45309', bg: '#fef3c7', border: '#fde68a' },
    { name: '부가세 신고 (1기)', month: 6, day: 25, icon: 'VAT', color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe' },
    { name: '부가세 신고 (2기)', month: 0, day: 25, icon: 'VAT', color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe' },
    { name: '원천세 신고', month: new Date().getMonth(), day: 10, icon: 'WIT', color: '#6d28d9', bg: '#f5f3ff', border: '#ddd6fe' },
    { name: '사업장현황신고', month: 1, day: 10, icon: 'BIZ', color: '#065f46', bg: '#ecfdf5', border: '#a7f3d0' },
];

function getUpcomingDeadlines() {
    const today = new Date();
    return TAX_DEADLINES.map(({ name, month, day, icon, color, bg, border }) => {
        const deadline = new Date(today.getFullYear(), month, day);
        if (deadline < today) deadline.setFullYear(deadline.getFullYear() + 1);
        const dday = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));
        return { name, icon, color, bg, border, dday, date: `${deadline.getMonth() + 1}월 ${deadline.getDate()}일` };
    }).sort((a, b) => a.dday - b.dday).slice(0, 3);
}

function getMonthlyData(transactions) {
    const map = {};
    transactions.forEach((t) => {
        const d = new Date(t.transaction_date);
        const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`;
        if (!map[key]) map[key] = { month: MONTH_NAMES[d.getMonth()], income: 0, expense: 0 };
        if (t.type === 'income') map[key].income += t.amount;
        else map[key].expense += t.amount;
    });
    return Object.entries(map)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-6)
        .map(([, v]) => v);
}

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px 14px', fontSize: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
                <p style={{ fontWeight: 600, color: '#111827', marginBottom: 6 }}>{label}</p>
                {payload.map((p, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: p.color }} />
                        <span style={{ color: '#6b7280' }}>{p.name}</span>
                        <span style={{ fontWeight: 600, color: '#111827' }}>{p.value.toLocaleString()}원</span>
                    </div>
                ))}
            </div>
        );
    }
    return null;
};

const MenuIcon = ({ type }) => {
    const icons = {
        transactions: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
            </svg>
        ),
        chat: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
        ),
        calculator: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="10" x2="10" y2="10"/><line x1="14" y1="10" x2="16" y2="10"/><line x1="8" y1="14" x2="10" y2="14"/><line x1="14" y1="14" x2="16" y2="14"/><line x1="8" y1="18" x2="10" y2="18"/><line x1="14" y1="18" x2="16" y2="18"/>
            </svg>
        ),
        upload: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
        ),
    };
    return icons[type] || null;
};

export default function DashboardPage() {
    const navigate = useNavigate();
    const { token, logout } = useAuthStore();
    const [transactions, setTransactions] = useState([]);
    const [lastTaxResult, setLastTaxResult] = useState(null);
    const [deadlineIdx, setDeadlineIdx] = useState(0);

    const upcomingDeadlines = getUpcomingDeadlines();
    const currentDeadline = upcomingDeadlines[deadlineIdx];

    useEffect(() => {
        if (!token) { navigate('/login'); return; }
        getTransactions().then((res) => setTransactions(res.data));
        api.get('/tax-calculator/history')
            .then((res) => {
                if (res.data && res.data.length > 0) {
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
            .catch((e) => console.error('세금 계산 결과 불러오기 실패:', e));
    }, [token]);

    const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const netProfit = totalIncome - totalExpense;
    const monthlyData = getMonthlyData(transactions);
    const fmt = (n) => n?.toLocaleString() ?? '0';
    const today = new Date();

    const menus = [
        { icon: 'transactions', label: '거래 내역', sub: '수입 · 지출 관리', path: '/transactions', accent: '#1d4ed8' },
        { icon: 'chat', label: 'AI 세무 상담', sub: '세금 질문하기', path: '/chat', accent: '#065f46' },
        { icon: 'calculator', label: '세금 계산기', sub: '예상 세액 계산', path: '/tax-calculator', accent: '#6d28d9' },
        { icon: 'upload', label: '일괄 업로드', sub: 'CSV / Excel', path: '/upload', accent: '#b45309' },
    ];

    return (
        <div style={{ minHeight: '100vh', background: '#f8f9fa', fontFamily: "'Pretendard', -apple-system, sans-serif" }}>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Pretendard:wght@400;500;600;700&display=swap');
                * { box-sizing: border-box; margin: 0; padding: 0; }
                @keyframes slideDown {
                    from { opacity: 0; transform: translateY(-8px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(12px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .anim-1 { animation: slideDown 0.4s ease forwards; }
                .anim-2 { animation: fadeIn 0.4s ease 0.05s both; }
                .anim-3 { animation: fadeIn 0.4s ease 0.1s both; }
                .anim-4 { animation: fadeIn 0.4s ease 0.15s both; }
                .anim-5 { animation: fadeIn 0.4s ease 0.2s both; }
                .anim-6 { animation: fadeIn 0.4s ease 0.25s both; }
                .menu-btn:hover { background: #f8fafc !important; border-color: #94a3b8 !important; }
                .menu-btn:active { transform: scale(0.98); }
                .txn-row:last-child { border-bottom: none !important; }
                .deadline-dot { cursor: pointer; transition: all 0.2s; border: none; }
                .nav-btn { background: none; border: none; cursor: pointer; font-family: inherit; transition: color 0.15s; }
                .card { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; }
                .upgrade-btn:hover { background: #1d4ed8 !important; color: #fff !important; border-color: #1d4ed8 !important; }
                .tax-card:hover { border-color: #6d28d9 !important; }
            `}</style>

            {/* 상단 네비게이션 */}
            <div className="anim-1" style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '0 24px' }}>
                <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: 56 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 28, height: 28, background: '#1d4ed8', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
                            </svg>
                        </div>
                        <span style={{ fontWeight: 700, fontSize: 15, color: '#111827', letterSpacing: '-0.3px' }}>세무비서</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <button className="nav-btn upgrade-btn" onClick={() => navigate('/pricing')}
                            style={{ fontSize: 12, fontWeight: 600, color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: 6, padding: '5px 12px', background: '#eff6ff', transition: 'all 0.15s' }}>
                            Pro 업그레이드
                        </button>
                        <button className="nav-btn" onClick={() => navigate('/my-info')}
                            style={{ fontSize: 13, color: '#6b7280', padding: '6px 10px', borderRadius: 6 }}>
                            내 정보
                        </button>
                        <button className="nav-btn" onClick={() => { logout(); navigate('/login'); }}
                            style={{ fontSize: 13, color: '#9ca3af', padding: '6px 10px', borderRadius: 6 }}>
                            로그아웃
                        </button>
                    </div>
                </div>
            </div>

            {/* 순이익 헤더 */}
            <div style={{ background: '#111827', padding: '32px 24px 28px' }}>
                <div style={{ maxWidth: 720, margin: '0 auto' }}>
                    <p style={{ fontSize: 11, color: '#6b7280', marginBottom: 6, fontWeight: 500, letterSpacing: '0.8px', textTransform: 'uppercase' }}>
                        {today.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })} 기준
                    </p>
                    <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>이번 달 순이익</p>
                    <p style={{ fontSize: 36, fontWeight: 700, color: '#fff', letterSpacing: '-1px', marginBottom: 10 }}>
                        {netProfit >= 0 ? '+' : ''}{fmt(netProfit)}<span style={{ fontSize: 18, fontWeight: 400, color: '#6b7280', marginLeft: 4 }}>원</span>
                    </p>
                    <div style={{ display: 'flex', gap: 20 }}>
                        <span style={{ fontSize: 13, color: '#6b7280' }}>
                            수입 <span style={{ color: '#34d399', fontWeight: 600 }}>+{fmt(totalIncome)}원</span>
                        </span>
                        <span style={{ fontSize: 13, color: '#374151' }}>·</span>
                        <span style={{ fontSize: 13, color: '#6b7280' }}>
                            지출 <span style={{ color: '#f87171', fontWeight: 600 }}>-{fmt(totalExpense)}원</span>
                        </span>
                    </div>
                </div>
            </div>

            <div style={{ maxWidth: 720, margin: '0 auto', padding: '20px 16px 40px' }}>

                {/* 신고 D-day */}
                <div className="anim-2 card" style={{ padding: '16px 20px', marginBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', letterSpacing: '0.8px', textTransform: 'uppercase' }}>다가오는 신고 기간</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ display: 'flex', gap: 5 }}>
                                {upcomingDeadlines.map((_, i) => (
                                    <button key={i} className="deadline-dot" onClick={() => setDeadlineIdx(i)}
                                        style={{ width: 6, height: 6, borderRadius: '50%', background: i === deadlineIdx ? '#1d4ed8' : '#e5e7eb', padding: 0 }} />
                                ))}
                            </div>
                            <button onClick={() => navigate('/notifications')}
                                style={{ fontSize: 12, color: '#1d4ed8', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                                전체보기 →
                            </button>
                        </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ width: 40, height: 40, borderRadius: 8, background: currentDeadline.bg, border: `1px solid ${currentDeadline.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <span style={{ fontSize: 10, fontWeight: 700, color: currentDeadline.color }}>{currentDeadline.icon}</span>
                            </div>
                            <div>
                                <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: 3 }}>{currentDeadline.name}</p>
                                <p style={{ fontSize: 15, fontWeight: 600, color: '#111827' }}>{currentDeadline.date}까지</p>
                            </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <p style={{ fontSize: 11, color: '#9ca3af', marginBottom: 3 }}>남은 기간</p>
                            <p style={{ fontSize: 26, fontWeight: 700, color: currentDeadline.dday <= 30 ? '#dc2626' : '#111827', letterSpacing: '-0.5px' }}>
                                D-{currentDeadline.dday}
                            </p>
                        </div>
                    </div>
                </div>

                {/* 수입/지출 */}
                <div className="anim-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                    <div className="card" style={{ padding: '16px 20px' }}>
                        <p style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: 8 }}>총 수입</p>
                        <p style={{ fontSize: 20, fontWeight: 700, color: '#059669', letterSpacing: '-0.5px' }}>
                            +{fmt(totalIncome)}<span style={{ fontSize: 12, fontWeight: 400, color: '#9ca3af', marginLeft: 2 }}>원</span>
                        </p>
                    </div>
                    <div className="card" style={{ padding: '16px 20px' }}>
                        <p style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: 8 }}>총 지출</p>
                        <p style={{ fontSize: 20, fontWeight: 700, color: '#dc2626', letterSpacing: '-0.5px' }}>
                            -{fmt(totalExpense)}<span style={{ fontSize: 12, fontWeight: 400, color: '#9ca3af', marginLeft: 2 }}>원</span>
                        </p>
                    </div>
                </div>

                {/* 월별 차트 */}
                <div className="anim-3 card" style={{ padding: '20px', marginBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <p style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>월별 수입 · 지출 추이</p>
                        <div style={{ display: 'flex', gap: 14 }}>
                            <span style={{ fontSize: 11, color: '#059669', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
                                <span style={{ width: 12, height: 2, background: '#059669', display: 'inline-block', borderRadius: 1 }}></span>수입
                            </span>
                            <span style={{ fontSize: 11, color: '#dc2626', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
                                <span style={{ width: 12, height: 2, background: '#dc2626', display: 'inline-block', borderRadius: 1 }}></span>지출
                            </span>
                        </div>
                    </div>
                    {monthlyData.length === 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 0' }}>
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5" style={{ marginBottom: 8 }}>
                                <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
                            </svg>
                            <p style={{ fontSize: 13, color: '#9ca3af' }}>거래 내역을 추가하면 차트가 표시됩니다</p>
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height={160}>
                            <AreaChart data={monthlyData} margin={{ top: 5, right: 0, left: -24, bottom: 0 }}>
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
                                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false}
                                    tickFormatter={(v) => v >= 10000 ? `${(v / 10000).toFixed(0)}만` : v} />
                                <Tooltip content={<CustomTooltip />} />
                                <Area type="monotone" dataKey="income" name="수입" stroke="#059669" strokeWidth={1.5} fill="url(#incomeGrad)" dot={false} activeDot={{ r: 4, fill: '#059669' }} />
                                <Area type="monotone" dataKey="expense" name="지출" stroke="#dc2626" strokeWidth={1.5} fill="url(#expenseGrad)" dot={false} activeDot={{ r: 4, fill: '#dc2626' }} />
                            </AreaChart>
                        </ResponsiveContainer>
                    )}
                </div>

                {/* 메뉴 */}
                <div className="anim-4" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                    {menus.map((m, i) => (
                        <button key={i} className="menu-btn" onClick={() => navigate(m.path)}
                            style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '16px 18px', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s', display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <div style={{ width: 34, height: 34, borderRadius: 8, background: `${m.accent}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: m.accent }}>
                                <MenuIcon type={m.icon} />
                            </div>
                            <div>
                                <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 2 }}>{m.label}</p>
                                <p style={{ fontSize: 11, color: '#9ca3af' }}>{m.sub}</p>
                            </div>
                        </button>
                    ))}
                </div>

                {/* 세금 계산 결과 */}
                <div className="anim-5" style={{ marginBottom: 14 }}>
                    {lastTaxResult ? (
                        <div className="card tax-card" onClick={() => navigate('/tax-calculator')}
                            style={{ padding: '20px', cursor: 'pointer', transition: 'border-color 0.15s' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                                <p style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>세금 계산 결과</p>
                                <span style={{ fontSize: 11, color: '#9ca3af' }}>{lastTaxResult.calculatedAt}</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ fontSize: 13, color: '#6b7280' }}>연 수입</span>
                                    <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{fmt(lastTaxResult.grossIncome)}원</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ fontSize: 13, color: '#6b7280' }}>예상 납부세액</span>
                                    <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{fmt(lastTaxResult.totalTax)}원</span>
                                </div>
                            </div>
                            <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <p style={{ fontSize: 11, color: '#9ca3af', marginBottom: 3 }}>
                                        {lastTaxResult.isRefund ? '예상 환급세액' : '예상 추가납부세액'}
                                    </p>
                                    <p style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.5px', color: lastTaxResult.isRefund ? '#059669' : '#dc2626' }}>
                                        {lastTaxResult.isRefund ? fmt(lastTaxResult.refundAmount) : fmt(lastTaxResult.finalTax)}원
                                    </p>
                                </div>
                                <span style={{ fontSize: 12, color: '#6d28d9', fontWeight: 600 }}>다시 계산하기 →</span>
                            </div>
                        </div>
                    ) : (
                        <div className="card tax-card" onClick={() => navigate('/tax-calculator')}
                            style={{ padding: '20px', cursor: 'pointer', borderStyle: 'dashed', transition: 'border-color 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div>
                                <p style={{ fontSize: 14, fontWeight: 600, color: '#111827', marginBottom: 4 }}>종합소득세 예상 세액 계산</p>
                                <p style={{ fontSize: 12, color: '#9ca3af' }}>수입 기준으로 예상 세금을 미리 확인하세요</p>
                            </div>
                            <span style={{ fontSize: 13, color: '#6d28d9', fontWeight: 600, whiteSpace: 'nowrap', marginLeft: 16 }}>계산하기 →</span>
                        </div>
                    )}
                </div>

                {/* 최근 거래 내역 */}
                <div className="anim-6 card" style={{ padding: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <p style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>최근 거래 내역</p>
                        <button onClick={() => navigate('/transactions')}
                            style={{ fontSize: 12, color: '#1d4ed8', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                            전체보기 →
                        </button>
                    </div>
                    {transactions.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '28px 0' }}>
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5" style={{ margin: '0 auto 8px', display: 'block' }}>
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
                            </svg>
                            <p style={{ fontSize: 13, color: '#9ca3af' }}>거래 내역이 없습니다</p>
                        </div>
                    ) : (
                        <div>
                            {transactions.slice(0, 5).map((t) => (
                                <div key={t.id} className="txn-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 0', borderBottom: '1px solid #f9fafb' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <div style={{ width: 32, height: 32, borderRadius: 8, background: t.type === 'income' ? '#f0fdf4' : '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={t.type === 'income' ? '#059669' : '#dc2626'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                {t.type === 'income'
                                                    ? <><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></>
                                                    : <><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></>
                                                }
                                            </svg>
                                        </div>
                                        <div>
                                            <p style={{ fontSize: 13, fontWeight: 500, color: '#111827', marginBottom: 1 }}>{t.memo || '메모 없음'}</p>
                                            <p style={{ fontSize: 11, color: '#9ca3af' }}>{t.transaction_date}</p>
                                        </div>
                                    </div>
                                    <span style={{ fontSize: 14, fontWeight: 700, color: t.type === 'income' ? '#059669' : '#dc2626', letterSpacing: '-0.3px', flexShrink: 0 }}>
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
