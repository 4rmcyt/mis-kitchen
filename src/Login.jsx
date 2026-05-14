import { useState } from "react";
import { signIn } from "./lib/supabase.js";

export default function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signIn(email, password);
      onLogin();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh", background: "#0A0A0A", display: "flex",
      alignItems: "center", justifyContent: "center", fontFamily: "'DM Mono', monospace",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Syne:wght@700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input { font-size: 16px !important; }
      `}</style>
      <div style={{
        background: "#111", border: "1px solid #222", borderRadius: 12,
        padding: "32px 28px", width: "100%", maxWidth: 360,
      }}>
        <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 28, fontWeight: 800, marginBottom: 4, letterSpacing: -1 }}>
          mis<span style={{ color: "#F97316" }}>.</span>
        </div>
        <div style={{ fontSize: 12, color: "#4A4A4A", marginBottom: 28, textTransform: "uppercase", letterSpacing: "0.5px" }}>
          Line Cook OS
        </div>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ fontSize: 11, color: "#4A4A4A", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: 6 }}>Email</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              required autoFocus placeholder="cook@restaurant.io"
              style={{
                width: "100%", background: "#181818", border: "1px solid #222",
                color: "#E8E8E0", padding: "10px 12px", borderRadius: 8, outline: "none",
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: 11, color: "#4A4A4A", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: 6 }}>Password</label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              required placeholder="••••••••"
              style={{
                width: "100%", background: "#181818", border: "1px solid #222",
                color: "#E8E8E0", padding: "10px 12px", borderRadius: 8, outline: "none",
              }}
            />
          </div>
          {error && (
            <div style={{ fontSize: 12, color: "#EF4444", background: "#1a0808", border: "1px solid #EF444433", borderRadius: 6, padding: "8px 12px" }}>
              {error}
            </div>
          )}
          <button type="submit" disabled={loading} style={{
            background: "#F97316", color: "#fff", border: "none", padding: "11px 16px",
            borderRadius: 8, fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 14,
            cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1, marginTop: 4,
          }}>
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
