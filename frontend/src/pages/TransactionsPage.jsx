import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTransactions, createTransaction, deleteTransaction } from '../api/transactions';
import { uploadReceipt } from '../api/ocr';
import useAuthStore from '../store/authStore';
import api from '../api/axios';

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

const BackButton = ({ onClick }) => (
  <button onClick={onClick}
    className="flex items-center gap-1.5 bg-gray-600 hover:bg-gray-700 active:scale-95 text-white text-sm font-semibold px-4 py-2 rounded-full shadow-md transition">
    ← 뒤로
  </button>
);

export default function TransactionsPage() {
  const navigate = useNavigate();
  const { token } = useAuthStore();
  const [transactions, setTransactions] = useState([]);
  const [form, setForm] = useState({ type: 'income', amount: '', memo: '', transaction_date: '' });
  const [showForm, setShowForm] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrPreview, setOcrPreview] = useState(null);
  const [ocrResult, setOcrResult] = useState(null);
  const [ocrError, setOcrError] = useState('');
  const [editCategoryId, setEditCategoryId] = useState(null); // 카테고리 수정 중인 거래 ID
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!token) { navigate('/login'); return; }
    fetchTransactions();
  }, [token]);

  const fetchTransactions = async () => {
    const res = await getTransactions();
    setTransactions(res.data);
  };

  const handleSubmit = async () => {
    if (!form.amount || !form.transaction_date) return;
    await createTransaction({ ...form, amount: parseInt(form.amount) });
    setForm({ type: 'income', amount: '', memo: '', transaction_date: '' });
    setShowForm(false);
    setOcrPreview(null);
    setOcrResult(null);
    fetchTransactions();
  };

  const handleDelete = async (id) => {
    await deleteTransaction(id);
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
      setForm({
        type: extracted.type || 'expense',
        amount: String(extracted.amount || ''),
        memo: extracted.memo || '',
        transaction_date: extracted.date || '',
      });
    } catch (err) {
      setOcrError('영수증 인식에 실패했어요. 다시 시도해 주세요.');
    } finally {
      setOcrLoading(false);
    }
  };

  const resetOcr = () => {
    setOcrPreview(null);
    setOcrResult(null);
    setOcrError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCategoryUpdate = async (transactionId, cat) => {
    await api.patch(`/transactions/${transactionId}/category`, {
      category_name: cat.name,
      category_emoji: cat.emoji,
      is_deductible: cat.is_deductible ?? false,
    });
    setEditCategoryId(null);
    fetchTransactions();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">

        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2 min-w-0">
            <BackButton onClick={() => navigate('/dashboard')} />
            <h1 className="text-lg font-bold text-gray-800 whitespace-nowrap">📊 거래 내역</h1>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button onClick={() => { setShowForm(true); fileInputRef.current?.click(); }}
              className="bg-purple-500 hover:bg-purple-600 text-white px-3 py-2 rounded-xl text-xs font-semibold transition whitespace-nowrap">
              📷 영수증
            </button>
            <button onClick={() => { setShowForm(!showForm); resetOcr(); }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-xl text-xs font-semibold transition whitespace-nowrap">
              + 추가
            </button>
          </div>
        </div>

        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleReceiptChange} />

        {showForm && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6">
            <h2 className="font-bold text-gray-700 mb-4">새 거래 추가</h2>
            {ocrPreview && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-purple-600">📷 영수증 인식 결과</span>
                  <button onClick={resetOcr} className="text-xs text-gray-400 hover:text-gray-600">✕ 초기화</button>
                </div>
                <div className="flex gap-3 items-start">
                  <img src={ocrPreview} alt="영수증 미리보기" className="w-20 h-20 object-cover rounded-xl border border-gray-200 flex-shrink-0" />
                  <div className="flex-1">
                    {ocrLoading && (
                      <div className="flex items-center gap-2 text-sm text-purple-500 mt-2">
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                        </svg>
                        AI가 영수증을 분석 중이에요...
                      </div>
                    )}
                    {ocrError && <p className="text-xs text-red-400 mt-2">{ocrError}</p>}
                    {ocrResult && !ocrLoading && (
                      <div className="text-xs text-gray-500 mt-1 space-y-0.5">
                        <p>✅ 인식 완료! 아래 내용을 확인·수정 후 저장하세요.</p>
                        <p>금액: <span className="font-semibold text-gray-700">{ocrResult.amount?.toLocaleString()}원</span></p>
                        <p>날짜: <span className="font-semibold text-gray-700">{ocrResult.date}</span></p>
                        <p>메모: <span className="font-semibold text-gray-700">{ocrResult.memo}</span></p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            <div className="flex gap-2 mb-3">
              <button onClick={() => setForm({ ...form, type: 'income' })}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold transition ${form.type === 'income' ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-500'}`}>수입</button>
              <button onClick={() => setForm({ ...form, type: 'expense' })}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold transition ${form.type === 'expense' ? 'bg-red-400 text-white' : 'bg-gray-100 text-gray-500'}`}>지출</button>
            </div>
            <input type="number" placeholder="금액" value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-4 py-2 mb-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
            <input type="text" placeholder="메모 (선택)" value={form.memo}
              onChange={(e) => setForm({ ...form, memo: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-4 py-2 mb-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
            <input type="date" value={form.transaction_date}
              onChange={(e) => setForm({ ...form, transaction_date: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-4 py-2 mb-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
            <p className="text-xs text-gray-400 mb-3">💡 메모를 입력하면 저장 시 AI가 카테고리를 자동 분류해요</p>
            <button onClick={handleSubmit}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-xl text-sm font-semibold transition">저장</button>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          {transactions.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">거래 내역이 없어요</p>
          ) : (
            <div className="flex flex-col gap-3">
              {transactions.map((t) => (
                <div key={t.id} className="py-3 border-b border-gray-50 last:border-0">
                  <div className="flex justify-between items-start">
                    <div className="flex items-start gap-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 mt-0.5 ${t.type === 'income' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-500'}`}>
                        {t.type === 'income' ? '수입' : '지출'}
                      </span>
                      <div>
                        <p className="text-sm text-gray-700">{t.memo || '-'}</p>
                        <p className="text-xs text-gray-400">{t.transaction_date}</p>
                        {/* 카테고리 뱃지 */}
                        {t.category_name && (
                          <button
                            onClick={() => setEditCategoryId(editCategoryId === t.id ? null : t.id)}
                            className={`mt-1 inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border transition ${
                              t.is_deductible
                                ? 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100'
                                : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
                            }`}>
                            <span>{t.category_emoji}</span>
                            <span>{t.category_name}</span>
                            {t.is_deductible && <span className="text-emerald-400">· 경비</span>}
                            <span className="text-gray-300">✎</span>
                          </button>
                        )}
                        {!t.category_name && t.memo && (
                          <button
                            onClick={() => setEditCategoryId(editCategoryId === t.id ? null : t.id)}
                            className="mt-1 inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border border-dashed border-gray-200 text-gray-400 hover:bg-gray-50 transition">
                            + 카테고리 추가
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className={`font-bold text-sm ${t.type === 'income' ? 'text-green-500' : 'text-red-400'}`}>
                        {t.type === 'income' ? '+' : '-'}{t.amount.toLocaleString()}원
                      </span>
                      <button onClick={() => handleDelete(t.id)} className="text-xs text-gray-400 hover:text-red-500 transition">삭제</button>
                    </div>
                  </div>

                  {/* 카테고리 선택 드롭다운 */}
                  {editCategoryId === t.id && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-xl">
                      <p className="text-xs font-semibold text-gray-500 mb-2">카테고리 선택</p>
                      <div className="grid grid-cols-3 gap-1.5">
                        {CATEGORIES.filter(cat =>
                          t.type === 'income'
                            ? cat.is_deductible === null
                            : cat.is_deductible !== null
                        ).map((cat) => (
                          <button key={cat.name}
                            onClick={() => handleCategoryUpdate(t.id, cat)}
                            className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs transition text-left ${
                              t.category_name === cat.name
                                ? 'bg-blue-100 text-blue-700 font-semibold'
                                : 'bg-white hover:bg-blue-50 text-gray-600 border border-gray-100'
                            }`}>
                            <span>{cat.emoji}</span>
                            <span className="truncate">{cat.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
