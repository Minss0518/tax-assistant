import { useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';

const features = [
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
    title: 'AI 세무 상담',
    desc: '종합소득세, 원천징수, 경비 처리까지 세금 관련 질문을 AI가 즉시 답변합니다. 법령 근거와 함께 정확한 정보를 제공합니다.',
    accent: '#1d4ed8',
    bg: '#eff6ff',
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    title: '세무사 직접 상담',
    desc: '복잡한 세금 문제는 전문 세무사와 직접 채팅으로 상담하세요. 언제든 질문을 남기면 업무 시간에 답변을 받을 수 있습니다.',
    accent: '#0891b2',
    bg: '#ecfeff',
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
    title: '수입 · 지출 관리',
    desc: '프리랜서 수입과 지출을 한 곳에서 관리하고 순이익을 실시간으로 파악합니다. 카테고리 자동 분류로 세금 신고가 편해집니다.',
    accent: '#b45309',
    bg: '#fef3c7',
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
      </svg>
    ),
    title: '일괄 업로드',
    desc: 'CSV, Excel 파일로 거래 내역을 한 번에 업로드할 수 있습니다. 기존 가계부나 은행 내역서 데이터를 바로 가져올 수 있습니다.',
    accent: '#0e7490',
    bg: '#ecfeff',
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
      </svg>
    ),
    title: '영수증 OCR',
    desc: '영수증 사진 한 장으로 거래 내역이 자동 입력됩니다. 날짜, 금액, 항목을 자동으로 인식해 경비 관리가 간편해집니다.',
    accent: '#6d28d9',
    bg: '#f5f3ff',
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="2" width="16" height="20" rx="2" /><line x1="8" y1="6" x2="16" y2="6" /><line x1="8" y1="10" x2="10" y2="10" /><line x1="14" y1="10" x2="16" y2="10" /><line x1="8" y1="14" x2="10" y2="14" /><line x1="14" y1="14" x2="16" y2="14" />
      </svg>
    ),
    title: '세금 계산기',
    desc: '연 수입과 경비를 입력하면 예상 납부세액과 환급액을 즉시 확인할 수 있습니다. 국민연금·건강보험료도 자동 계산됩니다.',
    accent: '#065f46',
    bg: '#ecfdf5',
  },
];

const plans = [
  {
    name: 'Free',
    price: '0',
    desc: '가볍게 시작해보세요',
    highlight: false,
    highlightPremium: false,
    badgeColor: null,
    features: [
      'AI 세무 상담 월 5회',
      '거래 내역 관리',
      '세금 계산기',
      '영수증 OCR 월 3회',
      'CSV / Excel 일괄 업로드',
    ],
    cta: '무료로 시작하기',
  },
  {
    name: 'Pro',
    price: '9,900',
    desc: '프리랜서를 위한 모든 기능',
    highlight: true,
    highlightPremium: false,
    badgeColor: '#1d4ed8',
    features: [
      'AI 세무 상담 무제한',
      '거래 내역 관리',
      '세금 계산기',
      '영수증 OCR 무제한',
      'CSV / Excel 일괄 업로드',
      '신고 기간 알림',
      '월별 세금 리포트',
    ],
    cta: '14일 무료 체험',
  },
  {
    name: 'Premium',
    price: '29,900',
    desc: '세무사와 직접 상담까지',
    highlight: false,
    highlightPremium: true,
    badgeColor: '#7c3aed',
    features: [
      '세무사 직접 상담 무제한',
      'AI 세무 상담 무제한',
      '거래 내역 관리',
      '세금 계산기',
      '영수증 OCR 무제한',
      'CSV / Excel 일괄 업로드',
      '신고 기간 알림',
      '월별 세금 리포트',
    ],
    cta: 'Premium 시작하기',
  },
];

const reviews = [
  { name: '김민준', job: '유튜브 크리에이터', text: '세금 신고 때마다 헷갈렸는데 AI한테 물어보니까 너무 편해요. 경비 처리 방법도 꼼꼼히 알려줘서 작년보다 환급 많이 받았어요.', initials: 'KM' },
  { name: '이수진', job: '프리랜서 디자이너', text: '영수증 찍으면 자동으로 입력되는 게 진짜 신기해요. 예전엔 엑셀로 일일이 입력했는데 이제 그럴 필요가 없어졌어요.', initials: 'LS' },
  { name: '박성호', job: '개발자 프리랜서', text: '세금 계산기로 미리 계산해보고 절세 준비했어요. 단순한 앱인데 실제로 많이 도움됐습니다.', initials: 'PS' },
];

const stats = [
  { value: '3.3%', label: '원천징수 자동 계산' },
  { value: '3종', label: '소셜 로그인 지원' },
  { value: '즉시', label: 'AI 세무 답변' },
  { value: '세무사 상담', label: 'Premium 전용' },
  { value: '무료', label: '14일 체험' },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const observerRef = useRef(null);
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => entries.forEach(e => {
        if (e.isIntersecting) e.target.classList.add('visible');
      }),
      { threshold: 0.08 }
    );
    document.querySelectorAll('.reveal').forEach(el => observerRef.current.observe(el));

    const handleScroll = () => setShowTop(window.scrollY > 400);
    window.addEventListener('scroll', handleScroll);

    return () => {
      observerRef.current?.disconnect();
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  return (
    <div style={{ minHeight: '100vh', background: '#fff', fontFamily: "'Pretendard', -apple-system, sans-serif", color: '#111827' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Pretendard:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .reveal { opacity: 0; transform: translateY(20px); transition: opacity 0.55s ease, transform 0.55s ease; }
        .reveal.visible { opacity: 1; transform: translateY(0); }
        .d1 { transition-delay: 0.05s; }
        .d2 { transition-delay: 0.12s; }
        .d3 { transition-delay: 0.19s; }
        .nav-link { background: none; border: none; cursor: pointer; font-family: inherit; font-size: 14px; color: #6b7280; padding: 6px 10px; border-radius: 6px; transition: color 0.15s; }
        .nav-link:hover { color: #111827; }
        .feature-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px; transition: border-color 0.2s, box-shadow 0.2s; }
        .feature-card:hover { border-color: #9ca3af; box-shadow: 0 4px 16px rgba(0,0,0,0.06); }
        .plan-card { background: #fff; border-radius: 14px; padding: 28px; }
        .review-card { background: #f9fafb; border: 1px solid #f3f4f6; border-radius: 12px; padding: 24px; }
        .stat-item { text-align: center; padding: 20px 12px; border-right: 1px solid #e5e7eb; }
        .stat-item:last-child { border-right: none; }
        .scroll-top-btn { position: fixed; bottom: 28px; right: 24px; width: 44px; height: 44px; background: #111827; color: #fff; border: none; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.2); transition: all 0.2s; z-index: 100; }
        .scroll-top-btn:hover { background: #1d4ed8; transform: translateY(-2px); }
      `}</style>

      {showTop && (
        <button className="scroll-top-btn" onClick={scrollToTop} title="위로가기">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="18 15 12 9 6 15" />
          </svg>
        </button>
      )}

      {/* 네비게이션 */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)', borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto', padding: '0 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: 56 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, background: '#1d4ed8', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
              </svg>
            </div>
            <span style={{ fontWeight: 700, fontSize: 15, color: '#111827', letterSpacing: '-0.3px' }}>세무비서</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button className="nav-link" onClick={() => document.getElementById('features').scrollIntoView({ behavior: 'smooth' })}>기능</button>
            <button className="nav-link" onClick={() => document.getElementById('pricing').scrollIntoView({ behavior: 'smooth' })}>요금제</button>
            <button onClick={() => navigate('/login')}
              style={{ background: '#111827', color: '#fff', border: 'none', borderRadius: 7, padding: '7px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', marginLeft: 8 }}>
              시작하기
            </button>
          </div>
        </div>
      </nav>

      {/* 히어로 */}
      <section style={{ paddingTop: 120, paddingBottom: 80, paddingLeft: 24, paddingRight: 24 }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <div className="reveal" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 100, padding: '5px 14px', marginBottom: 28 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#1d4ed8' }}></div>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#1d4ed8', letterSpacing: '0.3px' }}>프리랜서 · 크리에이터를 위한 세금 관리</span>
          </div>
          <h1 className="reveal d1" style={{ fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 800, color: '#111827', lineHeight: 1.2, letterSpacing: '-1.5px', marginBottom: 20 }}>
            세금 걱정은 이제<br />
            <span style={{ color: '#1d4ed8' }}>AI한테 맡기세요</span>
          </h1>
          <p className="reveal d2" style={{ fontSize: 16, color: '#6b7280', lineHeight: 1.75, marginBottom: 36, maxWidth: 520 }}>
            AI 세무 상담부터 영수증 자동 인식, 예상 세액 계산까지.<br />
            프리랜서와 크리에이터를 위한 스마트 세금 비서입니다.
          </p>
          <div className="reveal d3" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
            <button onClick={() => navigate('/login')}
              style={{ background: '#111827', color: '#fff', border: 'none', borderRadius: 8, height: 46, padding: '0 28px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              무료로 시작하기 →
            </button>
            <button onClick={() => document.getElementById('features').scrollIntoView({ behavior: 'smooth' })}
              style={{ background: '#fff', color: '#374151', border: '1px solid #e5e7eb', borderRadius: 8, height: 46, padding: '0 28px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              기능 살펴보기
            </button>
          </div>
          <p className="reveal d3" style={{ fontSize: 12, color: '#9ca3af' }}>신용카드 없이 · 14일 무료체험 · 언제든 취소 가능</p>
        </div>
      </section>

      {/* 통계 바 */}
      <div style={{ borderTop: '1px solid #e5e7eb', borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)' }}>
          {stats.map((s, i) => (
            <div key={i} className="stat-item reveal">
              <p style={{ fontSize: 22, fontWeight: 800, color: '#111827', letterSpacing: '-0.5px', marginBottom: 4 }}>{s.value}</p>
              <p style={{ fontSize: 12, color: '#9ca3af', fontWeight: 500 }}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 미리보기 카드 */}
      <section style={{ padding: '64px 24px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <div className="reveal" style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, overflow: 'hidden' }}>
            {/* 상단 네비바 */}
            <div style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '0 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: 48 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 22, height: 22, background: '#1d4ed8', borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg>
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#111827' }}>세무비서</span>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: '#1d4ed8', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 5, padding: '3px 8px' }}>구독 업그레이드</div>
                <div style={{ fontSize: 10, color: '#6b7280', padding: '3px 8px' }}>내 정보</div>
                <div style={{ fontSize: 10, color: '#9ca3af', padding: '3px 8px' }}>로그아웃</div>
              </div>
            </div>
            {/* 검정 헤더 */}
            <div style={{ background: '#111827', padding: '20px 20px 16px' }}>
              <p style={{ fontSize: 10, color: '#6b7280', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.8px' }}>2026년 6월 8일 기준</p>
              <p style={{ fontSize: 11, color: '#6b7280', marginBottom: 3 }}>이번 달 순이익</p>
              <p style={{ fontSize: 24, fontWeight: 700, color: '#fff', letterSpacing: '-1px', marginBottom: 6 }}>
                +84,264,000<span style={{ fontSize: 13, fontWeight: 400, color: '#6b7280', marginLeft: 3 }}>원</span>
              </p>
              <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                <span style={{ fontSize: 11, color: '#6b7280' }}>수입 <span style={{ color: '#34d399', fontWeight: 600 }}>+90,810,000원</span></span>
                <span style={{ fontSize: 11, color: '#374151' }}>·</span>
                <span style={{ fontSize: 11, color: '#6b7280' }}>지출 <span style={{ color: '#f87171', fontWeight: 600 }}>-6,546,000원</span></span>
              </div>
              <div style={{ position: 'relative', height: 60, marginBottom: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 10, color: '#6b7280' }}>월별 수입 · 지출 추이</span>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <span style={{ fontSize: 10, color: '#34d399', fontWeight: 600 }}>— 수입</span>
                    <span style={{ fontSize: 10, color: '#f87171', fontWeight: 600 }}>— 지출</span>
                    <span style={{ fontSize: 10, color: '#4b5563', background: '#1f2937', padding: '1px 6px', borderRadius: 3 }}>확대 ↗</span>
                  </div>
                </div>
                <svg viewBox="0 0 300 40" style={{ width: '100%', height: 40 }}>
                  <polyline points="0,38 40,35 80,28 120,18 160,12 200,10 240,11 280,13 300,14" fill="none" stroke="#34d399" strokeWidth="1.5" />
                  <polyline points="0,39 40,39 80,38 120,37 160,37 200,37 240,38 280,38 300,38" fill="none" stroke="#f87171" strokeWidth="1" />
                </svg>
              </div>
            </div>
            {/* 탭 메뉴 */}
            <div style={{ background: '#f8f9fa', padding: '10px 12px', borderBottom: '1px solid #e5e7eb' }}>
              <div style={{ display: 'flex', gap: 5 }}>
                {['거래 내역', 'AI 세무 상담', '세무사 상담', '세금 계산기', '일괄 업로드'].map((label, i) => (
                  <div key={i} style={{
                    flex: 1, padding: '6px 4px', fontSize: 10, fontWeight: 600, textAlign: 'center',
                    color: i === 0 ? '#fff' : '#1d4ed8',
                    background: i === 0 ? '#1d4ed8' : '#eff6ff',
                    border: '1px solid #bfdbfe', borderRadius: 5,
                  }}>{label}</div>
                ))}
              </div>
            </div>
            {/* D-day 카드 */}
            <div style={{ background: '#f8f9fa', padding: '10px 12px', borderBottom: '1px solid #e5e7eb' }}>
              <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 7, background: '#f5f3ff', border: '1px solid #ddd6fe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 8, fontWeight: 700, color: '#6d28d9' }}>WIT</span>
                  </div>
                  <div>
                    <p style={{ fontSize: 10, color: '#9ca3af', marginBottom: 2 }}>원천세 신고</p>
                    <p style={{ fontSize: 12, fontWeight: 600, color: '#111827' }}>6월 10일까지</p>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: 10, color: '#9ca3af', marginBottom: 2 }}>남은 기간</p>
                  <p style={{ fontSize: 20, fontWeight: 700, color: '#dc2626' }}>D-2</p>
                </div>
              </div>
            </div>
            {/* AI 인사이트 */}
            <div style={{ background: '#f8f9fa', padding: '10px 12px' }}>
              <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 14 }}>✦</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#111827' }}>AI 인사이트</span>
                    <span style={{ fontSize: 10, color: '#9ca3af' }}>2025.06.08 ~ 2026.06.08</span>
                  </div>
                  <span style={{ fontSize: 10, color: '#6b7280' }}>↺ 새로고침</span>
                </div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                  <div style={{ flex: 1, textAlign: 'center', borderBottom: '2px solid #1d4ed8', paddingBottom: 6, fontSize: 11, fontWeight: 600, color: '#1d4ed8' }}>📊 자동 분석</div>
                  <div style={{ flex: 1, textAlign: 'center', paddingBottom: 6, fontSize: 11, color: '#9ca3af' }}>💬 질문하기</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <div style={{ flex: 1, background: '#f9fafb', borderRadius: 8, padding: '8px 10px' }}>
                    <p style={{ fontSize: 9, color: '#9ca3af', marginBottom: 3 }}>최다 지출</p>
                    <p style={{ fontSize: 11, fontWeight: 600, color: '#111827' }}>식비</p>
                    <p style={{ fontSize: 10, color: '#dc2626' }}>-2,100,000원</p>
                  </div>
                  <div style={{ flex: 1, background: '#f9fafb', borderRadius: 8, padding: '8px 10px' }}>
                    <p style={{ fontSize: 9, color: '#9ca3af', marginBottom: 3 }}>이번 달 수입</p>
                    <p style={{ fontSize: 11, fontWeight: 600, color: '#111827' }}>프리랜서</p>
                    <p style={{ fontSize: 10, color: '#059669' }}>+5,200,000원</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 기능 */}
      <section id="features" style={{ padding: '80px 24px', background: '#fff' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <div className="reveal" style={{ marginBottom: 48 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 12 }}>기능</p>
            <h2 style={{ fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 800, color: '#111827', letterSpacing: '-0.8px', marginBottom: 12 }}>세금 관리의 모든 것</h2>
            <p style={{ fontSize: 15, color: '#6b7280', lineHeight: 1.7 }}>복잡한 세금, 이제 하나의 서비스로 해결하세요</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 12 }}>
            {features.slice(0, 4).map((f, i) => (
              <div key={i} className={`feature-card reveal d${(i % 2) + 1}`}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: f.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: f.accent, marginBottom: 14 }}>
                  {f.icon}
                </div>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 8 }}>{f.title}</h3>
                <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.65 }}>{f.desc}</p>
              </div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
            {features.slice(4).map((f, i) => (
              <div key={i} className={`feature-card reveal d${i + 1}`}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: f.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: f.accent, marginBottom: 14 }}>
                  {f.icon}
                </div>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 8 }}>{f.title}</h3>
                <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.65 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 후기 */}
      <section style={{ padding: '80px 24px', background: '#f9fafb', borderTop: '1px solid #e5e7eb', borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <div className="reveal" style={{ marginBottom: 40 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 12 }}>사용자 후기</p>
            <h2 style={{ fontSize: 'clamp(22px, 4vw, 32px)', fontWeight: 800, color: '#111827', letterSpacing: '-0.5px' }}>이미 많은 프리랜서가<br />세금 걱정을 덜었습니다</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {reviews.map((r, i) => (
              <div key={i} className={`review-card reveal d${i + 1}`}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>{r.initials}</span>
                  </div>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{r.name}</p>
                    <p style={{ fontSize: 11, color: '#9ca3af' }}>{r.job}</p>
                  </div>
                </div>
                <p style={{ fontSize: 13, color: '#4b5563', lineHeight: 1.7 }}>"{r.text}"</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 요금제 */}
      <section id="pricing" style={{ padding: '80px 24px', background: '#fff' }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <div className="reveal" style={{ marginBottom: 48 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 12 }}>요금제</p>
            <h2 style={{ fontSize: 'clamp(22px, 4vw, 32px)', fontWeight: 800, color: '#111827', letterSpacing: '-0.5px', marginBottom: 10 }}>심플한 요금제</h2>
            <p style={{ fontSize: 15, color: '#6b7280' }}>필요한 만큼만, 부담 없이 시작하세요</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            {plans.map((plan, i) => (
              <div key={i} className={`plan-card reveal d${i + 1}`}
                style={{
                  border: plan.highlightPremium ? '2px solid #7c3aed' : plan.highlight ? '2px solid #1d4ed8' : '1px solid #e5e7eb',
                  position: 'relative', display: 'flex', flexDirection: 'column'
                }}>
                {(plan.highlight || plan.highlightPremium) && (
                  <div style={{
                    position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
                    background: plan.badgeColor, color: '#fff',
                    fontSize: 11, fontWeight: 700, padding: '4px 14px', borderRadius: 100, whiteSpace: 'nowrap'
                  }}>
                    {plan.highlightPremium ? '세무사 상담' : '인기'}
                  </div>
                )}
                <div style={{ marginBottom: 24 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#6b7280', marginBottom: 4 }}>{plan.name}</p>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 6 }}>
                    <span style={{ fontSize: 32, fontWeight: 800, color: '#111827', letterSpacing: '-1px' }}>{plan.price}</span>
                    <span style={{ fontSize: 13, color: '#9ca3af' }}>원 / 월</span>
                  </div>
                  <p style={{ fontSize: 12, color: '#9ca3af' }}>{plan.desc}</p>
                </div>
                <ul style={{ listStyle: 'none', marginBottom: 24, display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
                  {plan.features.map((feat, j) => {
                    const isHighlight = feat.startsWith();
                    return (
                      <li key={j} style={{ display: 'flex', alignItems: 'flex-start', fontSize: 13, color: isHighlight ? '#7c3aed' : '#374151', fontWeight: isHighlight ? 700 : 400 }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={isHighlight ? '#7c3aed' : '#059669'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 10, marginTop: 1, flexShrink: 0 }}>
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        {feat}
                      </li>
                    );
                  })}
                </ul>
                <button
                  onClick={() => navigate('/login')}
                  style={{
                    background: plan.highlightPremium ? '#7c3aed' : plan.highlight ? '#1d4ed8' : '#fff',
                    color: plan.highlight || plan.highlightPremium ? '#fff' : '#374151',
                    border: plan.highlight || plan.highlightPremium ? 'none' : '1px solid #e5e7eb',
                    borderRadius: 8, height: 46, fontSize: 14, fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'inherit', width: '100%',
                  }}
                >
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 최종 CTA */}
      <section style={{ padding: '80px 24px', background: '#111827' }}>
        <div className="reveal" style={{ maxWidth: 560, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: 'clamp(22px, 4vw, 34px)', fontWeight: 800, color: '#fff', letterSpacing: '-0.8px', marginBottom: 14 }}>
            지금 바로 세금 걱정을 줄여보세요
          </h2>
          <p style={{ fontSize: 15, color: '#6b7280', marginBottom: 32, lineHeight: 1.7 }}>
            14일 무료체험 · 언제든 취소 가능 · 신용카드 불필요
          </p>
          <button onClick={() => navigate('/login')}
            style={{ background: '#fff', color: '#111827', border: 'none', borderRadius: 8, height: 46, padding: '0 36px', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            무료로 시작하기 →
          </button>
        </div>
      </section>

      {/* 푸터 */}
      <footer style={{ padding: '24px', background: '#111827', borderTop: '1px solid #1f2937', textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 8 }}>
          <div style={{ width: 22, height: 22, background: '#1d4ed8', borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg>
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>세무비서</span>
        </div>
        <p style={{ fontSize: 12, color: '#6b7280' }}>© 2026 세무비서. 본 서비스는 참고용이며 실제 세무 신고는 전문가와 상담하세요.</p>
      </footer>
    </div>
  );
}
