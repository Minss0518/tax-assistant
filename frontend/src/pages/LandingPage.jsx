import { useNavigate } from 'react-router-dom';
import { useEffect, useRef } from 'react';

const features = [
  {
    icon: '🤖',
    title: 'AI 세무 상담',
    desc: '종합소득세, 원천징수, 경비 처리까지 세금 관련 모든 질문을 AI가 즉시 답변해드려요.',
    color: 'from-emerald-400 to-teal-400',
    bg: 'bg-emerald-50',
  },
  {
    icon: '📷',
    title: '영수증 OCR',
    desc: '영수증 사진 한 장으로 거래 내역이 자동 입력돼요. 경비 관리가 훨씬 쉬워져요.',
    color: 'from-violet-400 to-purple-400',
    bg: 'bg-violet-50',
  },
  {
    icon: '🧮',
    title: '세금 계산기',
    desc: '연 수입과 경비를 입력하면 예상 납부세액과 환급액을 바로 확인할 수 있어요.',
    color: 'from-orange-400 to-amber-400',
    bg: 'bg-orange-50',
  },
  {
    icon: '📊',
    title: '수입/지출 관리',
    desc: '프리랜서 수입과 지출을 한 곳에서 관리하고 순이익을 실시간으로 파악해요.',
    color: 'from-blue-400 to-cyan-400',
    bg: 'bg-blue-50',
  },
];

const plans = [
  {
    name: 'Free',
    price: '0',
    desc: '가볍게 시작해보세요',
    color: 'border-gray-200',
    badge: '',
    features: [
      'AI 세무 상담 월 10회',
      '거래 내역 관리',
      '세금 계산기',
      '영수증 OCR 월 5회',
    ],
    cta: '무료로 시작하기',
    ctaStyle: 'bg-gray-800 hover:bg-gray-700 text-white',
  },
  {
    name: 'Pro',
    price: '9,900',
    desc: '프리랜서를 위한 모든 기능',
    color: 'border-blue-400 ring-2 ring-blue-100',
    badge: '인기',
    features: [
      'AI 세무 상담 무제한',
      '거래 내역 관리',
      '세금 계산기',
      '영수증 OCR 무제한',
      '신고 기간 알림',
      '월별 세금 리포트',
    ],
    cta: '14일 무료 체험',
    ctaStyle: 'bg-blue-600 hover:bg-blue-700 text-white',
  },
];

const reviews = [
  { name: '김민준', job: '유튜브 크리에이터', text: '세금 신고 때마다 헷갈렸는데 AI한테 물어보니까 너무 편해요. 경비 처리 방법도 꼼꼼히 알려줘서 작년보다 환급 많이 받았어요 🎉', avatar: '🎬' },
  { name: '이수진', job: '프리랜서 디자이너', text: '영수증 찍으면 자동으로 입력되는 게 진짜 신기해요. 예전엔 엑셀로 일일이 입력했는데 이제 그럴 필요가 없어졌어요.', avatar: '🎨' },
  { name: '박성호', job: '개발자 프리랜서', text: '세금 계산기로 미리 계산해보고 절세 준비했어요. 단순한 앱인데 실제로 많이 도움됐습니다.', avatar: '💻' },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const observerRef = useRef(null);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => entries.forEach(e => {
        if (e.isIntersecting) e.target.classList.add('animate-in');
      }),
      { threshold: 0.1 }
    );
    document.querySelectorAll('.reveal').forEach(el => observerRef.current.observe(el));
    return () => observerRef.current?.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-white font-sans overflow-x-hidden">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Pretendard:wght@400;600;700;800&display=swap');
        * { font-family: 'Pretendard', -apple-system, sans-serif; }
        .reveal { opacity: 0; transform: translateY(24px); transition: opacity 0.6s ease, transform 0.6s ease; }
        .reveal.animate-in { opacity: 1; transform: translateY(0); }
        .reveal-delay-1 { transition-delay: 0.1s; }
        .reveal-delay-2 { transition-delay: 0.2s; }
        .reveal-delay-3 { transition-delay: 0.3s; }
        .blob { border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%; }
        .gradient-text {
          background: linear-gradient(135deg, #3b82f6, #8b5cf6, #06b6d4);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
      `}</style>

      {/* 네비게이션 */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-2xl">💼</span>
            <span className="font-bold text-gray-900 text-lg">세무비서</span>
          </div>
          <div className="flex gap-3">
            <button onClick={() => navigate('/login')}
              className="text-sm text-gray-600 hover:text-gray-900 px-4 py-2 rounded-xl transition font-semibold">
              로그인
            </button>
            <button onClick={() => navigate('/login')}
              className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl transition font-semibold">
              무료 시작
            </button>
          </div>
        </div>
      </nav>

      {/* 히어로 섹션 */}
      <section className="relative pt-32 pb-24 px-6 overflow-hidden">
        {/* 배경 블롭 */}
        <div className="absolute top-16 right-[-100px] w-96 h-96 bg-blue-100 blob opacity-60 animate-pulse" style={{ animationDuration: '4s' }} />
        <div className="absolute bottom-0 left-[-80px] w-72 h-72 bg-violet-100 blob opacity-50 animate-pulse" style={{ animationDuration: '6s' }} />
        <div className="absolute top-40 left-1/2 w-64 h-64 bg-emerald-100 blob opacity-40 animate-pulse" style={{ animationDuration: '5s' }} />

        <div className="relative max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-full px-4 py-2 mb-6 text-sm text-blue-600 font-semibold">
            <span>✨</span> 프리랜서 · 크리에이터를 위한 세금 관리
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold text-gray-900 mb-6 leading-tight">
            세금 걱정은 이제<br />
            <span className="gradient-text">AI한테 맡기세요</span>
          </h1>
          <p className="text-lg text-gray-500 mb-10 leading-relaxed max-w-xl mx-auto">
            AI 세무 상담부터 영수증 자동 인식, 예상 세액 계산까지.<br />
            프리랜서와 크리에이터를 위한 스마트 세금 비서예요.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={() => navigate('/login')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-2xl font-bold text-lg transition shadow-lg shadow-blue-200 hover:shadow-xl hover:-translate-y-0.5 transform">
              무료로 시작하기 →
            </button>
            <button onClick={() => document.getElementById('features').scrollIntoView({ behavior: 'smooth' })}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-8 py-4 rounded-2xl font-bold text-lg transition">
              기능 살펴보기
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-4">신용카드 없이 · 14일 무료체험</p>
        </div>

        {/* 대시보드 미리보기 카드 */}
        <div className="relative max-w-2xl mx-auto mt-16">
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 p-6 reveal">
            <div className="flex justify-between items-center mb-5">
              <div>
                <h3 className="font-bold text-gray-800">💼 AI 세무 비서</h3>
                <p className="text-xs text-gray-400">안녕하세요! 오늘도 스마트하게 관리해요.</p>
              </div>
              <span className="text-xs bg-green-100 text-green-600 px-3 py-1 rounded-full font-semibold">Pro 플랜</span>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-5">
              {[
                { label: '총 수입', value: '+4,800,000원', color: 'text-green-500' },
                { label: '총 지출', value: '-1,200,000원', color: 'text-red-400' },
                { label: '순이익', value: '3,600,000원', color: 'text-blue-500' },
              ].map((c, i) => (
                <div key={i} className="bg-gray-50 rounded-2xl p-4">
                  <p className="text-xs text-gray-400 mb-1">{c.label}</p>
                  <p className={`font-bold text-sm ${c.color}`}>{c.value}</p>
                </div>
              ))}
            </div>
            <div className="bg-blue-50 rounded-2xl p-4 flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white text-xs flex-shrink-0">AI</div>
              <div>
                <p className="text-sm text-gray-700">프리랜서 경비 처리 가능한 항목을 알려드릴게요! 노트북, 소프트웨어 구독, 업무용 교통비, 통신비 일부가 포함돼요 💡</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 기능 섹션 */}
      <section id="features" className="py-24 px-6 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16 reveal">
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4">
              세금 관리의 모든 것
            </h2>
            <p className="text-gray-500 text-lg">복잡한 세금, 이제 하나의 앱으로 해결하세요</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {features.map((f, i) => (
              <div key={i} className={`reveal reveal-delay-${i % 3 + 1} ${f.bg} rounded-3xl p-7 border border-white`}>
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${f.color} flex items-center justify-center text-2xl mb-5 shadow-lg`}>
                  {f.icon}
                </div>
                <h3 className="font-bold text-gray-900 text-lg mb-2">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 후기 섹션 */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16 reveal">
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4">
              실제 사용자 후기
            </h2>
            <p className="text-gray-500 text-lg">이미 많은 프리랜서가 세금 걱정을 덜었어요</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {reviews.map((r, i) => (
              <div key={i} className={`reveal reveal-delay-${i + 1} bg-gray-50 rounded-3xl p-6 border border-gray-100`}>
                <p className="text-gray-600 text-sm leading-relaxed mb-5">"{r.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-xl">
                    {r.avatar}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">{r.name}</p>
                    <p className="text-xs text-gray-400">{r.job}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 요금제 섹션 */}
      <section id="pricing" className="py-24 px-6 bg-gray-50">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16 reveal">
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4">
              심플한 요금제
            </h2>
            <p className="text-gray-500 text-lg">필요한 만큼만, 부담 없이 시작하세요</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {plans.map((plan, i) => (
              <div key={i} className={`reveal reveal-delay-${i + 1} bg-white rounded-3xl p-8 border-2 ${plan.color} relative`}>
                {plan.badge && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-bold px-4 py-1 rounded-full">
                    {plan.badge}
                  </span>
                )}
                <div className="mb-6">
                  <h3 className="font-bold text-gray-900 text-xl mb-1">{plan.name}</h3>
                  <p className="text-gray-400 text-sm mb-4">{plan.desc}</p>
                  <div className="flex items-end gap-1">
                    <span className="text-4xl font-extrabold text-gray-900">{plan.price}</span>
                    <span className="text-gray-400 mb-1">원 / 월</span>
                  </div>
                </div>
                <ul className="flex flex-col gap-3 mb-8">
                  {plan.features.map((feat, j) => (
                    <li key={j} className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="text-emerald-500 font-bold">✓</span> {feat}
                    </li>
                  ))}
                </ul>
                <button onClick={() => navigate('/login')}
                  className={`w-full py-3 rounded-2xl font-bold text-sm transition ${plan.ctaStyle}`}>
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 최종 CTA */}
      <section className="py-24 px-6 bg-gradient-to-br from-blue-600 via-blue-500 to-violet-500">
        <div className="max-w-2xl mx-auto text-center reveal">
          <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4">
            지금 바로 세금 걱정을 줄여보세요
          </h2>
          <p className="text-blue-100 text-lg mb-8">
            14일 무료체험 · 언제든 취소 가능 · 신용카드 불필요
          </p>
          <button onClick={() => navigate('/login')}
            className="bg-white hover:bg-gray-50 text-blue-600 px-10 py-4 rounded-2xl font-bold text-lg transition shadow-xl hover:-translate-y-0.5 transform">
            무료로 시작하기 →
          </button>
        </div>
      </section>

      {/* 푸터 */}
      <footer className="py-8 px-6 bg-gray-900 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <span className="text-xl">💼</span>
          <span className="font-bold text-white">세무비서</span>
        </div>
        <p className="text-gray-500 text-xs">© 2025 세무비서. 본 서비스는 참고용이며 실제 세무 신고는 전문가와 상담하세요.</p>
      </footer>
    </div>
  );
}
