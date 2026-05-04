import { useNavigate } from 'react-router-dom';

const BackButton = ({ onClick }) => (
  <button onClick={onClick}
    className="flex items-center gap-1.5 bg-gray-600 hover:bg-gray-700 active:scale-95 text-white text-sm font-semibold px-4 py-2 rounded-full shadow-md transition">
    ← 뒤로
  </button>
);

const TAX_DEADLINES = [
  {
    name: '종합소득세 신고',
    month: 4, day: 31,
    icon: '📋',
    color: 'from-amber-400 to-orange-400',
    bg: 'bg-amber-50',
    border: 'border-amber-100',
    desc: '프리랜서/사업자 전년도 소득에 대한 종합소득세 신고',
    tip: '경비 처리 가능한 항목을 미리 정리해두세요.',
  },
  {
    name: '부가세 신고 (1기)',
    month: 6, day: 25,
    icon: '🧾',
    color: 'from-blue-400 to-cyan-400',
    bg: 'bg-blue-50',
    border: 'border-blue-100',
    desc: '1~6월 부가가치세 확정신고 (일반과세자)',
    tip: '세금계산서 발행 내역을 꼼꼼히 확인하세요.',
  },
  {
    name: '부가세 신고 (2기)',
    month: 0, day: 25,
    icon: '🧾',
    color: 'from-blue-400 to-cyan-400',
    bg: 'bg-blue-50',
    border: 'border-blue-100',
    desc: '7~12월 부가가치세 확정신고 (일반과세자)',
    tip: '세금계산서 발행 내역을 꼼꼼히 확인하세요.',
  },
  {
    name: '부가세 예정신고 (1기)',
    month: 3, day: 25,
    icon: '🧾',
    color: 'from-cyan-400 to-teal-400',
    bg: 'bg-cyan-50',
    border: 'border-cyan-100',
    desc: '1~3월 부가가치세 예정신고',
    tip: '간이과세자는 해당 없어요.',
  },
  {
    name: '부가세 예정신고 (2기)',
    month: 9, day: 25,
    icon: '🧾',
    color: 'from-cyan-400 to-teal-400',
    bg: 'bg-cyan-50',
    border: 'border-cyan-100',
    desc: '7~9월 부가가치세 예정신고',
    tip: '간이과세자는 해당 없어요.',
  },
  {
    name: '원천세 신고',
    month: new Date().getMonth(), day: 10,
    icon: '💼',
    color: 'from-violet-400 to-purple-400',
    bg: 'bg-violet-50',
    border: 'border-violet-100',
    desc: '매월 10일 — 전월 급여/용역 원천징수 신고',
    tip: '3.3% 원천징수한 금액을 납부해야 해요.',
  },
  {
    name: '사업장현황신고',
    month: 1, day: 10,
    icon: '🏢',
    color: 'from-emerald-400 to-teal-400',
    bg: 'bg-emerald-50',
    border: 'border-emerald-100',
    desc: '면세사업자 전년도 수입금액 신고',
    tip: '학원, 병원, 농업 등 면세사업자에 해당해요.',
  },
];

function getDeadlineInfo(month, day) {
  const today = new Date();
  const deadline = new Date(today.getFullYear(), month, day);
  if (deadline < today) deadline.setFullYear(deadline.getFullYear() + 1);
  const dday = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));
  return {
    dday,
    date: `${deadline.getFullYear()}년 ${deadline.getMonth() + 1}월 ${deadline.getDate()}일`,
    urgent: dday <= 30,
  };
}

export default function NotificationsPage() {
  const navigate = useNavigate();

  const deadlines = TAX_DEADLINES.map(d => ({
    ...d,
    ...getDeadlineInfo(d.month, d.day),
  })).sort((a, b) => a.dday - b.dday);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <BackButton onClick={() => navigate('/dashboard')} />
          <h1 className="text-xl font-bold text-gray-800">📅 신고 기간 알림</h1>
        </div>

        <div className="bg-blue-50 border border-blue-100 rounded-2xl px-5 py-4 mb-6">
          <p className="text-sm font-semibold text-blue-700 mb-1">📌 신고 기간 안내</p>
          <p className="text-xs text-blue-500 leading-relaxed">
            프리랜서·사업자에게 해당하는 주요 세금 신고 일정이에요.<br />
            30일 이내 마감은 빨간색으로 표시돼요.
          </p>
        </div>

        <div className="flex flex-col gap-4">
          {deadlines.map((d, i) => (
            <div key={i} className={`bg-white rounded-2xl border ${d.border} p-5`}>
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${d.color} flex items-center justify-center text-2xl flex-shrink-0`}>
                    {d.icon}
                  </div>
                  <div>
                    <p className="font-bold text-gray-800">{d.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{d.date}까지</p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={`text-2xl font-extrabold ${d.urgent ? 'text-red-500' : 'text-orange-400'}`}>
                    D-{d.dday}
                  </p>
                  {d.urgent && (
                    <span className="text-xs bg-red-100 text-red-500 font-semibold px-2 py-0.5 rounded-full">
                      마감 임박
                    </span>
                  )}
                </div>
              </div>
              <div className={`mt-4 ${d.bg} rounded-xl px-4 py-3`}>
                <p className="text-xs text-gray-600 mb-1">{d.desc}</p>
                <p className="text-xs text-gray-400">💡 {d.tip}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}