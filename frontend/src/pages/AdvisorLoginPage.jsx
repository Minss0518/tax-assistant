import { useState } from "react";
import { useNavigate } from "react-router-dom";

const API = import.meta.env.VITE_API_URL;

export default function AdvisorLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const login = async () => {
    setError("");
    const formData = new URLSearchParams();
    formData.append("username", email);
    formData.append("password", password);

    const res = await fetch(`${API}/advisor/login`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData,
    });

    if (!res.ok) {
      setError("이메일 또는 비밀번호가 올바르지 않습니다");
      return;
    }

    const data = await res.json();
    localStorage.setItem("advisor_token", data.access_token);
    navigate("/advisor");
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f9fafb" }}>
      <div style={{ background: "white", padding: 40, borderRadius: 16, boxShadow: "0 4px 24px rgba(0,0,0,0.08)", width: 360 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🧾</div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: "bold" }}>세무사 로그인</h2>
          <p style={{ color: "#6b7280", fontSize: 14, marginTop: 8 }}>세무 비서 상담 시스템</p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="이메일"
            style={{ padding: "12px 16px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 15, outline: "none" }}
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && login()}
            placeholder="비밀번호"
            style={{ padding: "12px 16px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 15, outline: "none" }}
          />
          {error && <p style={{ color: "#ef4444", fontSize: 14, margin: 0 }}>{error}</p>}
          <button
            onClick={login}
            style={{ padding: "13px", background: "#3b82f6", color: "white", border: "none", borderRadius: 8, fontSize: 15, fontWeight: "bold", cursor: "pointer" }}
          >
            로그인
          </button>
        </div>
      </div>
    </div>
  );
}