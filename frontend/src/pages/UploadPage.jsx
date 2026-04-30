import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

const BackButton = ({ onClick }) => (
  <button onClick={onClick}
    className="flex items-center gap-1.5 bg-gray-600 hover:bg-gray-700 active:scale-95 text-white text-sm font-semibold px-4 py-2 rounded-full shadow-md transition">
    ← 뒤로
  </button>
);

export default function UploadPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);

  const handleFileSelect = (selectedFile) => {
    if (!selectedFile) return;
    const name = selectedFile.name.toLowerCase();
    if (!name.endsWith('.csv') && !name.endsWith('.xlsx') && !name.endsWith('.xls')) {
      setError('CSV 또는 Excel 파일만 업로드 가능해요.');
      return;
    }
    setFile(selectedFile);
    setError('');
    setResult(null);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files[0]);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError('');
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.post('/upload/transactions', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(res.data);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      setError(err.response?.data?.detail || '업로드 중 오류가 발생했어요.');
    } finally {
      setUploading(false);
    }
  };

  const handleTemplateDownload = async () => {
    const res = await api.get('/upload/template/csv', { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template.csv';
    a.click();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">

        {/* 헤더 */}
        <div className="flex items-center gap-3 mb-8">
          <BackButton onClick={() => navigate('/dashboard')} />
          <h1 className="text-xl font-bold text-gray-800">📂 거래내역 일괄 업로드</h1>
        </div>

        {/* 안내 */}
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 mb-6">
          <h2 className="font-bold text-blue-700 mb-3">📋 업로드 형식 안내</h2>
          <p className="text-sm text-blue-600 mb-3">CSV 또는 Excel 파일에 아래 컬럼이 있어야 해요:</p>
          <div className="bg-white rounded-xl p-4 mb-3">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-1.5 text-gray-500 font-semibold">컬럼명</th>
                  <th className="text-left py-1.5 text-gray-500 font-semibold">설명</th>
                  <th className="text-left py-1.5 text-gray-500 font-semibold">예시</th>
                </tr>
              </thead>
              <tbody className="text-gray-600">
                <tr className="border-b border-gray-50">
                  <td className="py-1.5 font-medium">날짜 <span className="text-red-400">*</span></td>
                  <td className="py-1.5">거래 날짜</td>
                  <td className="py-1.5 text-gray-400">2024-01-15</td>
                </tr>
                <tr className="border-b border-gray-50">
                  <td className="py-1.5 font-medium">금액 <span className="text-red-400">*</span></td>
                  <td className="py-1.5">거래 금액</td>
                  <td className="py-1.5 text-gray-400">50000</td>
                </tr>
                <tr className="border-b border-gray-50">
                  <td className="py-1.5 font-medium">유형</td>
                  <td className="py-1.5">수입/지출</td>
                  <td className="py-1.5 text-gray-400">지출 (기본값)</td>
                </tr>
                <tr>
                  <td className="py-1.5 font-medium">메모</td>
                  <td className="py-1.5">거래 내용</td>
                  <td className="py-1.5 text-gray-400">스타벅스 커피</td>
                </tr>
              </tbody>
            </table>
          </div>
          <button onClick={handleTemplateDownload}
            className="text-sm text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1">
            📥 CSV 템플릿 다운로드
          </button>
        </div>

        {/* 업로드 영역 */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition mb-6 ${
            dragOver
              ? 'border-blue-400 bg-blue-50'
              : file
              ? 'border-emerald-400 bg-emerald-50'
              : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50'
          }`}>
          <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden"
            onChange={(e) => handleFileSelect(e.target.files[0])} />

          {file ? (
            <div>
              <div className="text-4xl mb-3">📄</div>
              <p className="font-bold text-emerald-600 mb-1">{file.name}</p>
              <p className="text-sm text-gray-400">{(file.size / 1024).toFixed(1)} KB</p>
              <button onClick={(e) => { e.stopPropagation(); setFile(null); }}
                className="mt-3 text-xs text-gray-400 hover:text-red-500">✕ 파일 제거</button>
            </div>
          ) : (
            <div>
              <div className="text-4xl mb-3">📂</div>
              <p className="font-semibold text-gray-600 mb-1">파일을 드래그하거나 클릭해서 선택</p>
              <p className="text-sm text-gray-400">CSV, XLSX, XLS 지원</p>
            </div>
          )}
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="bg-red-50 border border-red-100 rounded-2xl p-4 mb-6">
            <p className="text-sm text-red-500">⚠️ {error}</p>
          </div>
        )}

        {/* 결과 */}
        {result && (
          <div className={`rounded-2xl p-5 mb-6 border ${result.failed === 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-amber-50 border-amber-100'}`}>
            <p className="font-bold text-gray-800 mb-3">📊 업로드 결과</p>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="bg-white rounded-xl p-4 text-center">
                <p className="text-2xl font-extrabold text-emerald-500">{result.success}</p>
                <p className="text-xs text-gray-400 mt-1">성공</p>
              </div>
              <div className="bg-white rounded-xl p-4 text-center">
                <p className="text-2xl font-extrabold text-red-400">{result.failed}</p>
                <p className="text-xs text-gray-400 mt-1">실패</p>
              </div>
            </div>
            {result.errors?.length > 0 && (
              <div className="bg-white rounded-xl p-3">
                <p className="text-xs font-semibold text-gray-500 mb-2">오류 내용:</p>
                {result.errors.map((e, i) => (
                  <p key={i} className="text-xs text-red-400">{e}</p>
                ))}
              </div>
            )}
            <button onClick={() => navigate('/transactions')}
              className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl text-sm font-semibold transition">
              거래 내역 확인하기 →
            </button>
          </div>
        )}

        {/* 업로드 버튼 */}
        {file && !result && (
          <button onClick={handleUpload} disabled={uploading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white py-4 rounded-2xl font-bold text-sm transition flex items-center justify-center gap-2">
            {uploading ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
                AI 카테고리 분류 중... 잠시만 기다려주세요
              </>
            ) : '📂 업로드 시작'}
          </button>
        )}

      </div>
    </div>
  );
}
