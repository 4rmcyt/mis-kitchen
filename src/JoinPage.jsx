import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from './lib/supabase.js';
import './Auth.css';

export default function JoinPage() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [email, setEmail]       = useState('');
  const [name, setName]         = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) { setError("Passwords don't match"); return; }
    if (password.length < 8)  { setError("Password must be at least 8 characters"); return; }
    setLoading(true);
    try {
      const res = await supabase.functions.invoke('accept-invite', {
        body: { token, email, name, password },
      });
      if (res.error) throw new Error(res.error.message);
      const { error: data_error, action_link } = res.data;
      if (data_error) throw new Error(data_error);

      // Follow the magic link to establish a session
      if (action_link) {
        window.location.href = action_link;
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card auth-card--wide auth-card--dark">
        <div className="auth-logo auth-logo--lg">mis<span className="auth-logo-dot">.</span></div>
        <div className="auth-title--md">Join the kitchen</div>
        <div className="auth-sub--sm">Set up your account to get started</div>

        <form onSubmit={submit} className="auth-form--gap16" data-testid="join-form">
          <div className="auth-field">
            <label className="auth-label--inline">Your name</label>
            <input className="auth-input--join" placeholder="Chef name" value={name}
              onChange={e => setName(e.target.value)} required autoFocus/>
          </div>
          <div className="auth-field">
            <label className="auth-label--inline">Email</label>
            <input className="auth-input--join" type="email" placeholder="you@example.com" value={email}
              onChange={e => setEmail(e.target.value)} required/>
          </div>
          <div className="auth-field">
            <label className="auth-label--inline">Password</label>
            <input className="auth-input--join" type="password" placeholder="Min. 8 characters" value={password}
              onChange={e => setPassword(e.target.value)} required/>
          </div>
          <div className="auth-field">
            <label className="auth-label--inline">Confirm password</label>
            <input className="auth-input--join" type="password" placeholder="Repeat password" value={confirm}
              onChange={e => setConfirm(e.target.value)} required/>
          </div>

          {error && <div className="auth-error">{error}</div>}

          <button className="auth-btn auth-btn--join" type="submit" disabled={loading}
            data-testid="join-submit">
            {loading ? 'Setting up…' : 'Create account'}
          </button>
        </form>
      </div>
    </div>
  );
}
