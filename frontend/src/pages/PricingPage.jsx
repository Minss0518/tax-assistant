import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const plans = [
  {
    name: 'Free',
    price: '0',
    desc: '가볍게 시작해보세요',
    color: 'border-gray-200',
    current: true,
    features: [
      { text: 'AI 세무 상담 월 10회', included: true },
      { text: '거래 내역 관리', included: true },
      { text: '세금 계산기', included: true },
      { text: '영수증 OCR 월 5회', included: true },
      { text: '신고 기간 알림', included: false },
      { text: '월별 세금 리포트', included: false },
    ],
    cta: '현재 플랜',
    ctaStyle: 'bg-gray-100 text-gray-400 cursor-not-allowed',
  },
  {
    name: 'Pro',
    price: '9,900',
    desc: '프리랜서를 위한 모든 기능',
    color: 'border-blue-400 ring-2 ring-blue-100',
    badge: '추천',
    current: false,
    features: [
      { text: 'AI 세무 상담 무제한', included: true },
      { text: '거래 내역 관리', included: true },
      { text: '세금 계산기', included: true },
      { text: '영수증 OCR 무제한', included: true },
      { text: '신고 기간 알림', included: true },
      { text: '월별 세금 리포트', included: true },
    ],
    cta: 'Pro 시작하기',
    ctaStyle: 'bg-blue-600 hover:bg-blue-700 text-white',
  },
];

const faqs = [
  { q: '언제든지 취소할 수 있나요?', a: '네, 언제든지 취소 가능해요. 취소해도 결제 기간이 끝날 때까지 Pro 기능을 사용할 수 있어요.' },
  { q: '결제 수단은 무엇을 지원하나요?', a: '신용카드, 체크카드, 카카오페이, 네이버페이를 지원할 예정이에요.' },
  { q: 'Pro 플랜으로 업그레이드하면 바로 적용되나요?', a: '네, 결제 완료 즉시 모든 Pro 기능이 활성화돼요.' },
];

export default function PricingPage() {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">

        {/* 헤더 */}
        <div className="flex items-center gap-3 mb-8">
          <button onClick={() => navigate('/dashboard')}
            className="text-gray-400 hover:text-gray-600 transition">← 뒤로</button>
          <h1 className="text-xl font-bold text-gray-800">💳 요금제</h1>
        </div>

        {/* 현재 플랜 뱃지 */}
        <div className="bg-blue-50 border border-blue-100 rounded-2xl px-5 py-4 mb-6 flex items-center gap-3">
          <span className="text-2xl">📋</span>
          <div>
            <p className="text-sm font-semibold text-blue-700">현재 Free 플랜 사용 중</p>
            <p className="text-xs text-blue-400">Pro로 업그레이드하면 모든 기능을 무제한으로 사용할 수 있어요</p>
          </div>
        </div>

        {/* 요금제 카드 */}
        <div className="flex flex-col gap-4 mb-8">
          {plans.map((plan, i) => (
            <div key={i} className={`bg-white rounded-2xl border-2 ${plan.color} p-6 relative`}>
              {plan.badge && (
                <span className="absolute -top-3 left-6 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                  {plan.badge}
                </span>
              )}
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">{plan.name}</h3>
                  <p className="text-gray-400 text-xs mt-0.5">{plan.desc}</p>
                </div>
                <div className="text-right">
                  <span className="text-3xl font-extrabold text-gray-900">{plan.price}</span>
                  <span className="text-gray-400 text-sm">원/월</span>
                </div>
              </div>

              <ul className="flex flex-col gap-2 mb-5">
                {plan.features.map((f, j) => (
                  <li key={j} className="flex items-center gap-2 text-sm">
                    <span className={f.included ? 'text-emerald-500' : 'text-gray-200'}>
                      {f.included ? '✓' : '✗'}
                    </span>
                    <span className={f.included ? 'text-gray-600' : 'text-gray-300'}>{f.text}</span>
                  </li>
                ))}
              </ul>

              <button
                disabled={plan.current}
                onClick={() => !plan.current && setShowModal(true)}
                className={`w-full py-3 rounded-xl font-bold text-sm transition ${plan.ctaStyle}`}
              >
                {plan.cta}
              </button>
            </div>
          ))}
        </div>

        {/* FAQ */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
          <h2 className="font-bold text-gray-700 mb-4">자주 묻는 질문</h2>
          <div className="flex flex-col gap-2">
            {faqs.map((faq, i) => (
              <div key={i} className="border border-gray-100 rounded-xl overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex justify-between items-center px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition text-left"
                >
                  {faq.q}
                  <span className={`text-gray-400 transition-transform ${openFaq === i ? 'rotate-180' : ''}`}>▼</span>
                </button>
                {openFaq === i && (
                  <div className="px-4 pb-3 text-sm text-gray-500 leading-relaxed border-t border-gray-50">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-gray-400 text-center">
          결제 관련 문의는 support@semubisheo.com으로 연락해주세요
        </p>
      </div>

      {/* 준비 중 모달 */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4"
          onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl"
            onClick={(e) => e.stopPropagation()}>
            <div className="text-5xl mb-4">🚀</div>
            <h3 className="font-bold text-gray-900 text-xl mb-2">결제 준비 중이에요!</h3>
            <p className="text-gray-500 text-sm mb-6 leading-relaxed">
              Pro 플랜 결제 기능을 열심히 준비하고 있어요.<br />
              출시되면 가장 먼저 알려드릴게요!
            </p>
            <button onClick={() => setShowModal(false)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold text-sm transition">
              확인
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
