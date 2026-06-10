import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import api from '../api/axios';

const PROVIDER_LABEL = { kakao: '카카오', google: '구글', naver: '네이버' };
const PLAN_LABEL = {
  free: { label: 'Free', color: 'bg-gray-100 text-gray-600' },
  pro: { label: 'Pro', color: 'bg-blue-100 text-blue-600' },
  premium: { label: 'Premium', color: 'bg-violet-100 text-violet-600' },
};

export default function MyInfoPage() {
  const navigate = useNavigate();
  const { logout } = useAuthStore();
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [editingNickname, setEditingNickname] = useState(false);
  const [nicknameInput, setNicknameInput] = useState('');
  const [savingNickname, setSavingNickname] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    api.get('/users/me')
      .then((res) => { setInfo(res.data); setNicknameInput(res.data.nickname || ''); })
      .catch(() => navigate('/login'))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async () => {
    setDeleting(true);
    try { await api.delete('/users/me'); logout(); navigate('/'); }
    catch { alert('탈퇴 중 오류가 발생했어요.'); }
    finally { setDeleting(false); }
  };

  const handleCancelSubscription = async () => {
    setCancelling(true);
    try {
      const res = await api.post('/payments/cancel');
      alert(res.data.message);
      setShowCancelModal(false);
      const updated = await api.get('/users/me');
      setInfo(updated.data);
    } catch (e) { alert(e.response?.data?.detail || '구독 취소 중 오류가 발생했어요.'); }
    finally { setCancelling(false); }
  };

  const handleSaveNickname = async () => {
    setSavingNickname(true);
    try {
      await api.patch('/users/me/profile', { nickname: nicknameInput });
      setInfo((prev) => ({ ...prev, nickname: nicknameInput }));
      setEditingNickname(false);
    } catch (e) { alert(e.response?.data?.detail || '닉네임 저장에 실패했어요.'); }
    finally { setSavingNickname(false); }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/users/me/profile-image', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setInfo((prev) => ({ ...prev, profile_image: res.data.profile_image }));
    } catch (e) { alert(e.response?.data?.detail || '이미지 업로드에 실패했어요.'); }
    finally { setUploadingImage(false); }
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-gray-400 text-sm">불러오는 중...</div>
    </div>
  );

  const plan = PLAN_LABEL[info?.plan] || PLAN_LABEL.free;
  const displayName = info?.nickname || info?.name || '-';

  return (
    <div className="min-h-screen bg-gray-50">
      <style>{`
        @media (max-width: 480px) {
          .myinfo-wrap { padding: 16px 12px !important; }
          .myinfo-stats { grid-template-columns: 1fr 1fr !important; }
          .myinfo-profile { flex-direction: column !important; align-items: center !important; text-align: center !important; }
          .myinfo-profile-info { align-items: center !important; }
          .nickname-edit { justify-content: center !important; }
        }
      `}</style>
      <div className="myinfo-wrap max-w-2xl mx-auto px-4 py-8">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
          <button onClick={() => navigate('/dashboard')} style={{ fontSize: 12, fontWeight: 600, color: "#1d4ed8", border: "1px solid #bfdbfe", borderRadius: 6, padding: "5px 12px", background: "#eff6ff", cursor: "pointer" }}>← 뒤로</button>
          <h1 className="text-xl font-bold text-gray-800">내 정보</h1>
        </div>

        {/* 프로필 카드 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-4">
          <div className="myinfo-profile" style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              {info?.profile_image ? (
                <img src={info.profile_image} alt="프로필" className="w-16 h-16 rounded-full object-cover border border-gray-200" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-violet-500 flex items-center justify-center text-white text-2xl font-bold">
                  {info?.name?.[0] || '?'}
                </div>
              )}
              <button onClick={() => fileInputRef.current?.click()} disabled={uploadingImage}
                style={{ position: 'absolute', bottom: -2, right: -2, width: 24, height: 24, background: '#374151', color: 'white', border: 'none', borderRadius: '50%', cursor: 'pointer', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {uploadingImage ? '…' : '✏️'}
              </button>
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleImageUpload} />
            </div>
            <div className="myinfo-profile-info" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {editingNickname ? (
                <div className="nickname-edit" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <input value={nicknameInput} onChange={(e) => setNicknameInput(e.target.value)} maxLength={50} placeholder="닉네임 입력" autoFocus onKeyDown={(e) => e.key === 'Enter' && handleSaveNickname()}
                    style={{ border: '1px solid #d1d5db', borderRadius: 8, padding: '4px 10px', fontSize: 14, fontWeight: 700, width: 140, outline: 'none' }} />
                  <button onClick={handleSaveNickname} disabled={savingNickname} className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg transition disabled:opacity-50">
                    {savingNickname ? '저장 중...' : '저장'}
                  </button>
                  <button onClick={() => { setEditingNickname(false); setNicknameInput(info?.nickname || ''); }} className="text-xs text-gray-400 hover:text-gray-600">취소</button>
                </div>
              ) : (
                <div className="nickname-edit" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <p className="font-bold text-gray-900 text-lg">{displayName}</p>
                  <button onClick={() => setEditingNickname(true)} className="text-xs text-gray-400 hover:text-gray-600">✏️</button>
                </div>
              )}
              <p className="text-sm text-gray-500">{info?.email || '-'}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${plan.color}`}>{plan.label} 플랜</span>
                <span className="text-xs text-gray-400">{PROVIDER_LABEL[info?.provider] || info?.provider} 로그인</span>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-50 pt-4">
            <div className="flex justify-between text-sm py-2">
              <span className="text-gray-500">가입일</span>
              <span className="text-gray-700 font-medium">{info?.created_at}</span>
            </div>
          </div>
        </div>

        {/* 사용 현황 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-4">
          <h2 className="font-bold text-gray-700 mb-4">사용 현황</h2>
          <div className="myinfo-stats grid grid-cols-2 gap-4">
            <div className="bg-emerald-50 rounded-xl p-4 text-center">
              <p className="text-3xl font-extrabold text-emerald-500">{info?.chat_count}</p>
              <p className="text-xs text-gray-500 mt-1">AI 세무 상담 횟수</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-4 text-center">
              <p className="text-3xl font-extrabold text-blue-500">{info?.tx_count}</p>
              <p className="text-xs text-gray-500 mt-1">등록된 거래 내역</p>
            </div>
          </div>
        </div>

        {/* 요금제 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-4">
          <h2 className="font-bold text-gray-700 mb-4">요금제</h2>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <p className="font-semibold text-gray-800">{plan.label} 플랜</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {info?.plan === 'pro' || info?.plan === 'premium' ? '모든 기능 무제한 사용 중' : 'AI 상담 월 5회 · OCR 월 3회'}
              </p>
            </div>
            {info?.plan === 'pro' || info?.plan === 'premium' ? (
              <button onClick={() => setShowCancelModal(true)} className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-500 px-4 py-2 rounded-xl font-semibold transition">구독 취소</button>
            ) : (
              <button onClick={() => navigate('/pricing')} className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-semibold transition">업그레이드</button>
            )}
          </div>
        </div>

        {/* 계정 관리 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="font-bold text-gray-700 mb-2">계정 관리</h2>
          <p className="text-xs text-gray-400 mb-4">탈퇴 시 모든 데이터가 영구 삭제되며 복구할 수 없어요.</p>
          <button onClick={() => setShowDeleteModal(true)} className="text-sm text-red-400 hover:text-red-600 border border-red-200 hover:border-red-400 px-4 py-2 rounded-xl transition">회원 탈퇴</button>
        </div>
      </div>

      {showCancelModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4" onClick={() => setShowCancelModal(false)}>
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="text-4xl mb-4 text-center">💳</div>
            <h3 className="font-bold text-gray-900 text-lg text-center mb-2">구독을 취소할까요?</h3>
            <p className="text-gray-500 text-sm text-center mb-6 leading-relaxed">취소해도 만료일까지는<br />기능을 계속 사용할 수 있어요.</p>
            <div className="flex gap-2">
              <button onClick={() => setShowCancelModal(false)} className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold transition hover:bg-gray-50">유지하기</button>
              <button onClick={handleCancelSubscription} disabled={cancelling} className="flex-1 py-3 rounded-xl bg-gray-500 hover:bg-gray-600 text-white text-sm font-semibold transition disabled:opacity-50">{cancelling ? '취소 중...' : '구독 취소'}</button>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4" onClick={() => setShowDeleteModal(false)}>
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="text-4xl mb-4 text-center">⚠️</div>
            <h3 className="font-bold text-gray-900 text-lg text-center mb-2">정말 탈퇴할까요?</h3>
            <p className="text-gray-500 text-sm text-center mb-6 leading-relaxed">거래 내역, AI 상담 기록 등<br />모든 데이터가 영구 삭제돼요.</p>
            <div className="flex gap-2">
              <button onClick={() => setShowDeleteModal(false)} className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold transition hover:bg-gray-50">취소</button>
              <button onClick={handleDelete} disabled={deleting} className="flex-1 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition disabled:opacity-50">{deleting ? '탈퇴 중...' : '탈퇴하기'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
