import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getChatHistory, clearChatHistory } from '../api/chat';
import useAuthStore from '../store/authStore';
import ReactMarkdown from 'react-markdown';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const BackButton = ({ onClick }) => (
  <button onClick={onClick} style={{ fontSize: 12, fontWeight: 600, color: "#1d4ed8", border: "1px solid #bfdbfe", borderRadius: 6, padding: "5px 12px", background: "#eff6ff", cursor: "pointer", whiteSpace: "nowrap" }}>
    ← 뒤로
  </button>
);

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white text-xs mr-2 flex-shrink-0 mt-1">AI</div>
      <div className="bg-white border border-gray-100 shadow-sm px-4 py-3 rounded-2xl rounded-bl-sm">
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
          <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
          <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
          <span className="text-xs text-gray-400 ml-1">답변 생성 중...</span>
        </div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  const navigate = useNavigate();
  const { token } = useAuthStore();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [clearing, setClearing] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!token) { navigate('/login'); return; }
    getChatHistory().then((res) => setMessages(res.data));
  }, [token]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    setMessages((prev) => [...prev, { role: 'user', content: input }]);
    setInput('');
    setLoading(true);
    setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);
    try {
      const res = await fetch(`${API_BASE}/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ message: input }),
      });
      if (!res.ok) {
        const errData = await res.json();
        setMessages((prev) => { const updated = [...prev]; updated[updated.length - 1] = { role: 'assistant', content: `⚠️ ${errData.detail || '오류가 발생했어요.'}` }; return updated; });
        setLoading(false);
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop();
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const json = JSON.parse(line.slice(6));
            if (json.done) break;
            if (json.token) {
              setMessages((prev) => { const updated = [...prev]; updated[updated.length - 1] = { role: 'assistant', content: updated[updated.length - 1].content + json.token }; return updated; });
            }
          } catch (e) { }
        }
      }
    } catch {
      setMessages((prev) => { const updated = [...prev]; updated[updated.length - 1] = { role: 'assistant', content: '오류가 발생했어요.' }; return updated; });
    } finally {
      setLoading(false);
    }
  };

  const handleClear = async () => {
    if (clearing) return;
    setClearing(true);
    try { await clearChatHistory(); setMessages([]); } finally { setClearing(false); }
  };

  const suggestions = ['3.3% 원천징수란 뭔가요?', '종합소득세 신고 기간이 언제인가요?', '프리랜서 경비 처리 방법 알려주세요'];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <style>{`
        @media (max-width: 480px) {
          .chat-bubble { max-width: 85% !important; }
          .chat-input-wrap { padding: 8px !important; }
        }
      `}</style>
      <div className="max-w-2xl mx-auto w-full flex flex-col h-screen" style={{ padding: '16px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <BackButton onClick={() => navigate('/dashboard')} />
            <h1 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: 0 }}>AI 세무 상담</h1>
          </div>
          {messages.length > 0 && (
            <button onClick={handleClear} disabled={clearing}
              className="text-xs text-gray-400 hover:text-red-400 border border-gray-200 hover:border-red-200 px-3 py-1.5 rounded-xl transition disabled:opacity-50">
              {clearing ? '초기화 중...' : '🗑 새 대화'}
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto flex flex-col gap-4 pb-4">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500 text-sm mb-6">세금 관련 무엇이든 물어보세요!</p>
              <div className="flex flex-col gap-2">
                {suggestions.map((s, i) => (
                  <button key={i} onClick={() => setInput(s)}
                    className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-600 hover:bg-blue-50 hover:border-blue-200 transition text-left">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((msg, i) => {
            if (msg.role === 'assistant' && msg.content === '' && i === messages.length - 1 && loading) {
              return <TypingIndicator key={i} />;
            }
            return (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white text-xs mr-2 flex-shrink-0 mt-1">AI</div>
                )}
                <div className={`chat-bubble px-4 py-3 rounded-2xl text-sm leading-relaxed ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-white text-gray-700 shadow-sm border border-gray-100 rounded-bl-sm'}`}
                  style={{ maxWidth: '75%' }}>
                  {msg.role === 'assistant' ? (
                    <ReactMarkdown components={{
                      p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                      ol: ({ children }) => <ol className="list-decimal pl-4 space-y-1">{children}</ol>,
                      ul: ({ children }) => <ul className="list-disc pl-4 space-y-1">{children}</ul>,
                      li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                      strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
                    }}>{msg.content}</ReactMarkdown>
                  ) : msg.content}
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        <div className="chat-input-wrap" style={{ display: 'flex', gap: 8, marginTop: 8, padding: '8px 0' }}>
          <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="세금 관련 질문을 입력하세요..."
            className="flex-1 border border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white" />
          <button onClick={handleSend} disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white px-5 py-3 rounded-2xl text-sm font-semibold transition">
            전송
          </button>
        </div>
      </div>
    </div>
  );
}
