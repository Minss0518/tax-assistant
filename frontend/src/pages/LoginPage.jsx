import { loginKakao, loginGoogle, loginNaver } from '../api/auth';

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-lg p-10 w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">💼</div>
          <h1 className="text-2xl font-bold text-gray-800">AI 세무 비서</h1>
          <p className="text-gray-500 text-sm mt-2">프리랜서를 위한 스마트 세무 도우미</p>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={loginKakao}
            className="w-full py-3 rounded-xl bg-yellow-400 hover:bg-yellow-500 text-gray-800 font-semibold transition"
          >
            카카오로 로그인
          </button>
          <button
            onClick={loginGoogle}
            className="w-full py-3 rounded-xl bg-white hover:bg-gray-50 text-gray-700 font-semibold border border-gray-200 transition"
          >
            구글로 로그인
          </button>
          <button
            onClick={loginNaver}
            className="w-full py-3 rounded-xl bg-green-500 hover:bg-green-600 text-white font-semibold transition"
          >
            네이버로 로그인
          </button>
        </div>
      </div>
    </div>
  );
}