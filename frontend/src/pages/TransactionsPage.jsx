import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTransactions, createTransaction, deleteTransaction } from '../api/transactions';
import { uploadReceipt } from '../api/ocr';
import useAuthStore from '../store/authStore';
import api from '../api/axios';

const ScrollTopButton = () => {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 300);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  if (!show) return null;
  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      style={{ position: 'fixed', bottom: 28, right: 16, width: 44, height: 44, background: '#111827', color: '#fff', border: 'none', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.2)', zIndex: 100 }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="18 15 12 9 6 15"/>
      </svg>
    </button>
  );
};

const CATEGORIES = [
  { name: "식비", emoji: "🍽️", is_deductible: true },
  { name: "교통비", emoji: "🚗", is_deductible: true },
  { name: "장비/기기", emoji: "💻", is_deductible: true },
  { name: "소프트웨어/구독", emoji: "📱", is_deductible: true },
  { name: "교육비", emoji: "📚", is_deductible: true },
  { name: "통신비", emoji: "📡", is_deductible: true },
  { name: "사무용품", emoji: "✏️", is_deductible: true },
  { name: "마케팅/광고", emoji: "📢", is_deductible: true },
  { name: "외주/인건비", emoji: "👥", is_deductible: true },
  { name: "기타경비", emoji: "📦", is_deductible: true },
  { name: "개인식비", emoji: "🍜", is_deductible: false },
  { name: "개인교통", emoji: "🚌", is_deductible: false },
  { name: "쇼핑", emoji: "🛍️", is_deductible: false },
  { name: "의료/건강", emoji: "🏥", is_deductible: false },
  { name: "여가/취미", emoji: "🎮", is_deductible: false },
  { name: "기타", emoji: "💸", is_deductible: false },
  { name: "프리랜서수입", emoji: "💼", is_deductible: null },
  { name: "유튜브수입", emoji: "🎬", is_deductible: null },
  { name: "강의수입", emoji: "🎓", is_deductible: null },
  { name: "기타수입", emoji: "💰", is_deductible: null },
];

const SOURCE_BADGE = {
  ocr:    { label: 'OCR', color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
  upload: { label: '파일 업로드', color: '#1D4ED8', bg: '#EFF6FF', border: '#BFDBFE' },
  manual: { label: '직접입력', color: '#065F46', bg: '#ECFDF5', border: '#A7F3D0' },
};

const BackButton = ({ onClick }) => (
  <button onClick={onClick} style={{ fontSize: 12, fontWeight: 600, color: "#1d4ed8", border: "1px solid #bfdbfe", borderRadius: 6, padding: "5px 12px", background: "#eff6ff", cursor: "pointer" }}>
    ← 뒤로
  </button>
);

export default function TransactionsPage() {
  const navigate = useNavigate();
  const { token } = useAuthStore();
  const [transactions, setTransactions] = useState([]);
  const [form, setForm] = useState({ type: 'income', amount: '', memo: '', transaction_date: '', source: 'manual' });
  const [showForm, setShowForm] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrPreview, setOcrPreview] = useState(null);
  const [ocrResult, setOcrResult] = useState(null);
  const [ocrError, setOcrError] = useState('');
  const [editCategoryId, setEditCategoryId] = useState(null);
  const [receiptModal, setReceiptModal] = useState(null);
  const fileInputRef = useRef(null);

  const [filterType, setFilterType] = useState('all');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [showFilter, setShowFilter] = useState(false);
  const [searchMemo, setSearchMemo] = useState('');
  const [searchCategory, setSearchCategory] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    if (!token) { navigate('/login'); return; }
    fetchTransactions();
  }, [token]);

  const fetchTransactions = async () => {
    const res = await getTransactions();
    setTransactions(res.data);
    setSelected(new Set());
  };

  const filtered = transactions.filter((t) => {
    if (filterType !== 'all' && t.type !== filterType) return false;
    if (filterDateFrom && t.transaction_date < filterDateFrom) return false;
    if (filterDateTo && t.transaction_date > filterDateTo) return false;
    if (searchMemo && !t.memo?.toLowerCase().includes(searchMemo.toLowerCase())) return false;
    if (searchCategory && !t.category_name?.toLowerCase().includes(searchCategory.toLowerCase())) return false;
    return true;
  });

  const activeFilterCount = [filterType !== 'all', !!filterDateFrom, !!filterDateTo].filter(Boolean).length;
  const activeSearchCount = [!!searchMemo, !!searchCategory].filter(Boolean).length;

  const toggleSelect = (id) => {
    setSelected(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  };

  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map(t => t.id)));
  };

  const handleBulkDelete = async () => {
    if (selected.size === 0) return;
    if (!window.confirm(`선택한 ${selected.size}개를 삭제할까요?`)) return;
    setDeleteLoading(true);
    await Promise.all([...selected].map(id => deleteTransaction(id)));
    setDeleteLoading(false);
    setSelectMode(false);
    fetchTransactions();
  };

  const handleDeleteAll = async () => {
    if (!window.confirm(`전체 ${filtered.length}개를 삭제할까요?`)) return;
    setDeleteLoading(true);
    await Promise.all(filtered.map(t => deleteTransaction(t.id)));
    setDeleteLoading(false);
    setSelectMode(false);
    fetchTransactions();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('이 거래를 삭제할까요?')) return;
    await deleteTransaction(id);
    fetchTransactions();
  };

  const handleSubmit = async () => {
    if (!form.amount || !form.transaction_date) return;
    await createTransaction({ ...form, amount: parseInt(form.amount) });
    setForm({ type: 'income', amount: '', memo: '', transaction_date: '', source: 'manual' });
    setShowForm(false);
    setOcrPreview(null);
    setOcrResult(null);
    fetchTransactions();
  };

  const handleReceiptChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setOcrPreview(URL.createObjectURL(file));
    setOcrError('');
    setOcrResult(null);
    setOcrLoading(true);
    try {
      const res = await uploadReceipt(file);
      const extracted = res.data.extracted;
      setOcrResult(extracted);
      setForm({ type: extracted.type || 'expense', amount: String(extracted.amount || ''), memo: extracted.memo || '', transaction_date: extracted.date || '', source: 'ocr', receipt_image_url: extracted.receipt_image_url || null });
    } catch {
      setOcrError('영수증 인식에 실패했어요.');
    } finally {
      setOcrLoading(false);
    }
  };

  const resetOcr = () => {
    setOcrPreview(null); setOcrResult(null); setOcrError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCategoryUpdate = async (transactionId, cat) => {
    await api.patch(`/transactions/${transactionId}/category`, { category_name: cat.name, category_emoji: cat.emoji, is_deductible: cat.is_deductible ?? false });
    setEditCategoryId(null);
    fetchTransactions();
  };

  const getSource = (t) => t.source || 'manual';
  const card = { background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12 };
  const btnBase = { border: 'none', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' };

  return (
    <div style={{ minHeight: '100vh', background: '#F8F9FA', fontFamily: "'Pretendard', -apple-system, sans-serif" }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .row-hover:hover { background: #F9FAFB; }
        @media (max-width: 480px) {
          .tx-header { flex-wrap: wrap; gap: 8px !important; }
          .tx-filter-bar { flex-wrap: wrap; gap: 6px !important; }
          .tx-amount { font-size: 13px !important; }
          .cat-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .date-filter-wrap { flex-direction: column !important; }
          .select-toolbar { flex-direction: column !important; align-items: flex-start !important; gap: 8px !important; }
        }
      `}</style>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '20px 12px 48px' }}>

        {/* 헤더 */}
        <div className="tx-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <BackButton onClick={() => navigate('/dashboard')} />
            <span style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>거래 내역</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => { setShowForm(true); fileInputRef.current?.click(); }}
              style={{ ...btnBase, background: '#7C3AED', color: '#fff', fontSize: 12, fontWeight: 600, padding: '7px 12px', borderRadius: 8 }}>
              📷 영수증
            </button>
            <button onClick={() => { setShowForm(!showForm); resetOcr(); }}
              style={{ ...btnBase, background: '#1D4ED8', color: '#fff', fontSize: 12, fontWeight: 600, padding: '7px 12px', borderRadius: 8 }}>
              + 추가
            </button>
          </div>
        </div>

        <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleReceiptChange} />

        {/* 폼 */}
        {showForm && (
          <div style={{ ...card, padding: 20, marginBottom: 16 }}>
            <p style={{ fontWeight: 700, color: '#111827', marginBottom: 16, fontSize: 14 }}>새 거래 추가</p>
            {ocrPreview && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#7C3AED' }}>📷 영수증 인식 결과</span>
                  <button onClick={resetOcr} style={{ ...btnBase, fontSize: 11, color: '#9CA3AF', background: 'none' }}>✕ 초기화</button>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <img src={ocrPreview} alt="영수증" style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 8, border: '1px solid #E5E7EB', flexShrink: 0 }} />
                  <div>
                    {ocrLoading && <p style={{ fontSize: 12, color: '#7C3AED' }}>AI가 분석 중이에요...</p>}
                    {ocrError && <p style={{ fontSize: 12, color: '#EF4444' }}>{ocrError}</p>}
                    {ocrResult && !ocrLoading && (
                      <div style={{ fontSize: 12, color: '#6B7280', lineHeight: 1.7 }}>
                        <p>✅ 인식 완료!</p>
                        <p>금액: <b style={{ color: '#111827' }}>{ocrResult.amount?.toLocaleString()}원</b></p>
                        <p>날짜: <b style={{ color: '#111827' }}>{ocrResult.date}</b></p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              {['income', 'expense'].map(type => (
                <button key={type} onClick={() => setForm({ ...form, type })}
                  style={{ ...btnBase, flex: 1, padding: '8px 0', borderRadius: 8, fontSize: 13, fontWeight: 600, background: form.type === type ? (type === 'income' ? '#059669' : '#DC2626') : '#F3F4F6', color: form.type === type ? '#fff' : '#6B7280' }}>
                  {type === 'income' ? '수입' : '지출'}
                </button>
              ))}
            </div>
            {[{ placeholder: '금액', type: 'number', key: 'amount' }, { placeholder: '메모 (선택)', type: 'text', key: 'memo' }, { placeholder: '날짜', type: 'date', key: 'transaction_date' }].map(({ placeholder, type, key }) => (
              <input key={key} type={type} placeholder={placeholder} value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })}
                style={{ width: '100%', border: '1px solid #E5E7EB', borderRadius: 8, padding: '8px 12px', marginBottom: 10, fontSize: 13, outline: 'none', fontFamily: 'inherit' }} />
            ))}
            <p style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 12 }}>메모를 입력하면 AI가 카테고리를 자동 분류해요</p>
            <button onClick={handleSubmit} style={{ ...btnBase, width: '100%', background: '#1D4ED8', color: '#fff', padding: '10px 0', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>저장</button>
          </div>
        )}

        <ScrollTopButton />

        {/* 필터 */}
        <div style={{ ...card, padding: '12px 16px', marginBottom: 12, position: 'sticky', top: 0, zIndex: 10 }}>
          <div className="tx-filter-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {[['all', '전체'], ['income', '수입'], ['expense', '지출']].map(([val, label]) => (
                <button key={val} onClick={() => setFilterType(val)}
                  style={{ ...btnBase, padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: filterType === val ? (val === 'income' ? '#059669' : val === 'expense' ? '#DC2626' : '#111827') : '#F3F4F6', color: filterType === val ? '#fff' : '#6B7280', border: '1px solid transparent' }}>
                  {label}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button onClick={() => setShowSearch(!showSearch)}
                style={{ ...btnBase, padding: '5px 10px', borderRadius: 8, fontSize: 12, fontWeight: 500, background: activeSearchCount > 0 ? '#FFF7ED' : '#F3F4F6', color: activeSearchCount > 0 ? '#C2410C' : '#6B7280', border: `1px solid ${activeSearchCount > 0 ? '#FED7AA' : '#E5E7EB'}` }}>
                🔍 검색{activeSearchCount > 0 ? ` (${activeSearchCount})` : ''}
              </button>
              <button onClick={() => setShowFilter(!showFilter)}
                style={{ ...btnBase, padding: '5px 10px', borderRadius: 8, fontSize: 12, fontWeight: 500, background: activeFilterCount > 0 ? '#EFF6FF' : '#F3F4F6', color: activeFilterCount > 0 ? '#1D4ED8' : '#6B7280', border: `1px solid ${activeFilterCount > 0 ? '#BFDBFE' : '#E5E7EB'}` }}>
                📅 날짜{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
              </button>
              <button onClick={() => { setSelectMode(!selectMode); setSelected(new Set()); }}
                style={{ ...btnBase, padding: '5px 10px', borderRadius: 8, fontSize: 12, fontWeight: 500, background: selectMode ? '#FEF2F2' : '#F3F4F6', color: selectMode ? '#DC2626' : '#6B7280', border: `1px solid ${selectMode ? '#FECACA' : '#E5E7EB'}` }}>
                {selectMode ? '취소' : '선택'}
              </button>
            </div>
          </div>

          {/* 검색창 */}
          {showSearch && (
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #F3F4F6', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: '#9CA3AF' }}>🔍</span>
                  <input
                    value={searchMemo}
                    onChange={e => setSearchMemo(e.target.value)}
                    placeholder="메모 검색 (예: 스타벅스)"
                    style={{ width: '100%', border: '1px solid #E5E7EB', borderRadius: 8, padding: '7px 10px 7px 32px', fontSize: 12, fontFamily: 'inherit', outline: 'none', color: '#374151' }}
                  />
                  {searchMemo && (
                    <button onClick={() => setSearchMemo('')} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', fontSize: 14 }}>✕</button>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: '#9CA3AF' }}>🏷️</span>
                  <input
                    value={searchCategory}
                    onChange={e => setSearchCategory(e.target.value)}
                    placeholder="카테고리 검색 (예: 식비)"
                    style={{ width: '100%', border: '1px solid #E5E7EB', borderRadius: 8, padding: '7px 10px 7px 32px', fontSize: 12, fontFamily: 'inherit', outline: 'none', color: '#374151' }}
                  />
                  {searchCategory && (
                    <button onClick={() => setSearchCategory('')} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', fontSize: 14 }}>✕</button>
                  )}
                </div>
                {(searchMemo || searchCategory) && (
                  <button onClick={() => { setSearchMemo(''); setSearchCategory(''); }}
                    style={{ ...btnBase, padding: '7px 12px', borderRadius: 8, fontSize: 12, fontWeight: 500, background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA', whiteSpace: 'nowrap' }}>
                    초기화
                  </button>
                )}
              </div>
            </div>
          )}

          {showFilter && (
            <div className="date-filter-wrap" style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #F3F4F6', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)}
                style={{ border: '1px solid #E5E7EB', borderRadius: 8, padding: '5px 10px', fontSize: 12, fontFamily: 'inherit', outline: 'none', color: '#374151', flex: 1, minWidth: 120 }} />
              <span style={{ color: '#9CA3AF', fontSize: 12 }}>~</span>
              <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)}
                style={{ border: '1px solid #E5E7EB', borderRadius: 8, padding: '5px 10px', fontSize: 12, fontFamily: 'inherit', outline: 'none', color: '#374151', flex: 1, minWidth: 120 }} />
            </div>
          )}

          {selectMode && (
            <div className="select-toolbar" style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #F3F4F6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#374151', cursor: 'pointer' }}>
                <input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0} onChange={toggleAll} style={{ width: 14, height: 14, accentColor: '#1D4ED8' }} />
                전체선택 ({selected.size}/{filtered.length})
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={handleBulkDelete} disabled={selected.size === 0 || deleteLoading}
                  style={{ ...btnBase, padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, background: selected.size > 0 ? '#EF4444' : '#F3F4F6', color: selected.size > 0 ? '#fff' : '#9CA3AF' }}>
                  선택 삭제 {selected.size > 0 ? `(${selected.size})` : ''}
                </button>
                <button onClick={handleDeleteAll} disabled={deleteLoading || filtered.length === 0}
                  style={{ ...btnBase, padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }}>
                  전체삭제
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 거래 목록 */}
        <div style={{ ...card, overflow: 'hidden' }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#9CA3AF', fontSize: 13 }}>
              {transactions.length === 0 ? '거래 내역이 없어요' : '필터 조건에 맞는 내역이 없어요'}
            </div>
          ) : (
            filtered.map((t, idx) => {
              const srcBadge = SOURCE_BADGE[getSource(t)] || SOURCE_BADGE.manual;
              const isChecked = selected.has(t.id);
              return (
                <div key={t.id} className="row-hover"
                  style={{ padding: '14px 16px', borderBottom: idx < filtered.length - 1 ? '1px solid #F9FAFB' : 'none', background: isChecked ? '#EFF6FF' : undefined }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    {selectMode && (
                      <input type="checkbox" checked={isChecked} onChange={() => toggleSelect(t.id)}
                        style={{ width: 15, height: 15, marginTop: 2, flexShrink: 0, accentColor: '#1D4ED8', cursor: 'pointer' }} />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 3 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 10, background: t.type === 'income' ? '#F0FDF4' : '#FEF2F2', color: t.type === 'income' ? '#059669' : '#DC2626', flexShrink: 0 }}>
                          {t.type === 'income' ? '수입' : '지출'}
                        </span>
                        <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 8, background: srcBadge.bg, color: srcBadge.color, border: `1px solid ${srcBadge.border}`, flexShrink: 0 }}>
                          {srcBadge.label}
                        </span>
                        <span style={{ fontSize: 13, color: '#111827', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {t.memo || '-'}
                        </span>
                        {t.source === 'ocr' && t.receipt_image_url && (
                          <button onClick={() => setReceiptModal(t.receipt_image_url)}
                            style={{ fontSize: 11, color: '#7C3AED', background: '#F5F3FF', border: '1px solid #DDD6FE', borderRadius: 6, padding: '2px 8px', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', flexShrink: 0 }}>
                            영수증 확인
                          </button>
                        )}
                      </div>
                      <p style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 4 }}>{t.transaction_date}</p>
                      {t.category_name ? (
                        <button onClick={() => setEditCategoryId(editCategoryId === t.id ? null : t.id)}
                          style={{ ...btnBase, display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, padding: '2px 8px', borderRadius: 10, background: t.is_deductible ? '#ECFDF5' : '#F9FAFB', color: t.is_deductible ? '#065F46' : '#6B7280', border: `1px solid ${t.is_deductible ? '#A7F3D0' : '#E5E7EB'}` }}>
                          <span>{t.category_emoji}</span><span>{t.category_name}</span>
                          {t.is_deductible && <span style={{ color: '#059669' }}>· 경비</span>}
                          <span style={{ color: '#D1D5DB' }}>✎</span>
                        </button>
                      ) : t.memo && (
                        <button onClick={() => setEditCategoryId(editCategoryId === t.id ? null : t.id)}
                          style={{ ...btnBase, display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, padding: '2px 8px', borderRadius: 10, background: 'none', border: '1px dashed #E5E7EB', color: '#9CA3AF' }}>
                          + 카테고리
                        </button>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                      <span className="tx-amount" style={{ fontSize: 14, fontWeight: 700, color: t.type === 'income' ? '#059669' : '#DC2626' }}>
                        {t.type === 'income' ? '+' : '-'}{t.amount.toLocaleString()}원
                      </span>
                      {!selectMode && (
                        <button onClick={() => handleDelete(t.id)}
                          style={{ ...btnBase, fontSize: 11, color: '#D1D5DB', background: 'none', padding: '2px 4px', borderRadius: 4, border: '1px solid transparent' }}
                          onMouseEnter={e => { e.target.style.color = '#EF4444'; e.target.style.borderColor = '#FECACA'; }}
                          onMouseLeave={e => { e.target.style.color = '#D1D5DB'; e.target.style.borderColor = 'transparent'; }}>
                          삭제
                        </button>
                      )}
                    </div>
                  </div>

                  {editCategoryId === t.id && (
                    <div style={{ marginTop: 12, padding: 12, background: '#F9FAFB', borderRadius: 8 }}>
                      <p style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', marginBottom: 8 }}>카테고리 선택</p>
                      <div className="cat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                        {CATEGORIES.filter(cat => t.type === 'income' ? cat.is_deductible === null : cat.is_deductible !== null).map(cat => (
                          <button key={cat.name} onClick={() => handleCategoryUpdate(t.id, cat)}
                            style={{ ...btnBase, display: 'flex', alignItems: 'center', gap: 4, padding: '6px 8px', borderRadius: 8, fontSize: 11, textAlign: 'left', background: t.category_name === cat.name ? '#EFF6FF' : '#fff', color: t.category_name === cat.name ? '#1D4ED8' : '#374151', border: `1px solid ${t.category_name === cat.name ? '#BFDBFE' : '#E5E7EB'}`, fontWeight: t.category_name === cat.name ? 600 : 400 }}>
                            <span>{cat.emoji}</span>
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cat.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {filtered.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 4px', fontSize: 12, color: '#9CA3AF', flexWrap: 'wrap', gap: 8 }}>
            <span>총 {filtered.length}건</span>
            <div style={{ display: 'flex', gap: 16 }}>
              <span style={{ color: '#059669' }}>수입 +{filtered.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0).toLocaleString()}원</span>
              <span style={{ color: '#DC2626' }}>지출 -{filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0).toLocaleString()}원</span>
            </div>
          </div>
        )}
      </div>

      {receiptModal && (
        <div onClick={() => setReceiptModal(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, padding: 20, maxWidth: 480, width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <p style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>영수증</p>
              <button onClick={() => setReceiptModal(null)} style={{ background: '#F3F4F6', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 13, color: '#6B7280' }}>✕ 닫기</button>
            </div>
            <img src={receiptModal} alt="영수증" style={{ width: '100%', borderRadius: 8, border: '1px solid #E5E7EB' }} />
          </div>
        </div>
      )}
    </div>
  );
}
