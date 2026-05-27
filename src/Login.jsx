import { useState } from "react";
import { signIn, supabase } from "./lib/supabase.js";
import "./Auth.css";

function ForgotPassword({ onBack }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    setLoading(false);
    if (err) { setError(err.message); return; }
    setSent(true);
  };

  return (
    <div className="auth-forgot-wrap">
      <div className="auth-title--sm">Reset password</div>
      {sent ? (
        <div className="auth-success">
          Check your email — we sent a reset link to {email}.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="auth-form">
          <div>
            <label className="auth-label">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoFocus placeholder="cook@restaurant.io" className="auth-input"/>
          </div>
          {error && <div className="auth-error">{error}</div>}
          <button type="submit" disabled={loading} className="auth-btn">
            {loading ? "Sending…" : "Send reset link"}
          </button>
        </form>
      )}
      <button onClick={onBack} className="auth-back-btn">← Back to sign in</button>
    </div>
  );
}

export default function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);

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
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">mis<span className="auth-logo-dot">.</span></div>
        <div className="auth-tagline">Line Cook OS</div>

        {showForgot ? (
          <ForgotPassword onBack={() => setShowForgot(false)} />
        ) : (
          <form onSubmit={handleSubmit} className="auth-form">
            <div>
              <label className="auth-label">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoFocus placeholder="cook@restaurant.io" className="auth-input"/>
            </div>
            <div>
              <div className="auth-label-row">
                <label className="auth-label auth-label--no-mb">Password</label>
                <button type="button" onClick={() => setShowForgot(true)} className="auth-link-btn">Forgot?</button>
              </div>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" className="auth-input"/>
            </div>
            {error && <div className="auth-error">{error}</div>}
            <button type="submit" disabled={loading} className="auth-btn">
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
