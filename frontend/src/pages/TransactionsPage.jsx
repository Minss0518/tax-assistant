import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTransactions, createTransaction, deleteTransaction } from '../api/transactions';
import { uploadReceipt } from '../api/ocr';
import useAuthStore from '../store/authStore';

export default function TransactionsPage() {
  const navigate = useNavigate();
  const { token } = useAuthStore();
  const [transactions, setTransactions] = useState([]);
  const [form, setForm] = useState({ type: 'income', amount: '', memo: '', transaction_date: '' });
  const [showForm, setShowForm] = useState(false);

  // OCR 관련 상태
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrPreview, setOcrPreview] = useState(null); // 이미지 미리보기 URL
  const [ocrResult, setOcrResult] = useState(null);   // 추출 결과
  const [ocrError, setOcrError] = useState('');
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

  // 영수증 이미지 선택 → 미리보기 + OCR 자동 호출
  const handleReceiptChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // 미리보기
    setOcrPreview(URL.createObjectURL(file));
    setOcrError('');
    setOcrResult(null);
    setOcrLoading(true);

    try {
      const res = await uploadReceipt(file);
      const extracted = res.data.extracted;

      setOcrResult(extracted);
      // 폼에 자동 입력 (지출로 고정, 백엔드가 항상 expense 반환)
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">

        {/* 헤더 */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/dashboard')}
              className="text-gray-400 hover:text-gray-600 transition">← 뒤로</button>
            <h1 className="text-xl font-bold text-gray-800">📊 거래 내역</h1>
          </div>
          <div className="flex gap-2">
            {/* 영수증 OCR 버튼 */}
            <button
              onClick={() => { setShowForm(true); fileInputRef.current?.click(); }}
              className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-xl text-sm font-semibold transition flex items-center gap-1"
            >
              📷 영수증
            </button>
            <button onClick={() => { setShowForm(!showForm); resetOcr(); }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition">
              + 추가
            </button>
          </div>
        </div>

        {/* 숨겨진 파일 입력 */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleReceiptChange}
        />

        {/* 거래 추가 폼 */}
        {showForm && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6">
            <h2 className="font-bold text-gray-700 mb-4">새 거래 추가</h2>

            {/* OCR 미리보기 영역 */}
            {ocrPreview && (
              <div className="mb-4 relative">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-purple-600">📷 영수증 인식 결과</span>
                  <button onClick={resetOcr} className="text-xs text-gray-400 hover:text-gray-600">✕ 초기화</button>
                </div>
                <div className="flex gap-3 items-start">
                  <img
                    src={ocrPreview}
                    alt="영수증 미리보기"
                    className="w-20 h-20 object-cover rounded-xl border border-gray-200 flex-shrink-0"
                  />
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
                    {ocrError && (
                      <p className="text-xs text-red-400 mt-2">{ocrError}</p>
                    )}
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

            {/* 수입/지출 선택 */}
            <div className="flex gap-2 mb-3">
              <button onClick={() => setForm({ ...form, type: 'income' })}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold transition ${form.type === 'income' ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
                수입
              </button>
              <button onClick={() => setForm({ ...form, type: 'expense' })}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold transition ${form.type === 'expense' ? 'bg-red-400 text-white' : 'bg-gray-100 text-gray-500'}`}>
                지출
              </button>
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
            <button onClick={handleSubmit}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-xl text-sm font-semibold transition">
              저장
            </button>
          </div>
        )}

        {/* 거래 목록 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          {transactions.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">거래 내역이 없어요</p>
          ) : (
            <div className="flex flex-col gap-3">
              {transactions.map((t) => (
                <div key={t.id} className="flex justify-between items-center py-3 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${t.type === 'income' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-500'}`}>
                      {t.type === 'income' ? '수입' : '지출'}
                    </span>
                    <div>
                      <p className="text-sm text-gray-700">{t.memo || '-'}</p>
                      <p className="text-xs text-gray-400">{t.transaction_date}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`font-bold text-sm ${t.type === 'income' ? 'text-green-500' : 'text-red-400'}`}>
                      {t.type === 'income' ? '+' : '-'}{t.amount.toLocaleString()}원
                    </span>
                    <button onClick={() => handleDelete(t.id)}
                      className="text-xs text-gray-400 hover:text-red-500 transition">
                      삭제
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
