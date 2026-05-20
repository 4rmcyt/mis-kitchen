import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from './lib/supabase.js';

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
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.logo}>mis<span style={{ color: '#F97316' }}>.</span></div>
        <div style={s.title}>Join the kitchen</div>
        <div style={s.sub}>Set up your account to get started</div>

        <form onSubmit={submit} style={s.form}>
          <div style={s.field}>
            <label style={s.label}>Your name</label>
            <input style={s.input} placeholder="Chef name" value={name}
              onChange={e => setName(e.target.value)} required autoFocus/>
          </div>
          <div style={s.field}>
            <label style={s.label}>Email</label>
            <input style={s.input} type="email" placeholder="you@example.com" value={email}
              onChange={e => setEmail(e.target.value)} required/>
          </div>
          <div style={s.field}>
            <label style={s.label}>Password</label>
            <input style={s.input} type="password" placeholder="Min. 8 characters" value={password}
              onChange={e => setPassword(e.target.value)} required/>
          </div>
          <div style={s.field}>
            <label style={s.label}>Confirm password</label>
            <input style={s.input} type="password" placeholder="Repeat password" value={confirm}
              onChange={e => setConfirm(e.target.value)} required/>
          </div>

          {error && <div style={s.error}>{error}</div>}

          <button style={{ ...s.btn, opacity: loading ? 0.6 : 1 }} type="submit" disabled={loading}>
            {loading ? 'Setting up…' : 'Create account'}
          </button>
        </form>
      </div>
    </div>
  );
}

const s = {
  page:  { minHeight: '100vh', background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: "'DM Mono', monospace" },
  card:  { background: '#1A1A1A', border: '1px solid #333', borderRadius: 12, padding: '36px 32px', width: '100%', maxWidth: 400 },
  logo:  { fontFamily: "'Syne', sans-serif", fontSize: 26, fontWeight: 800, letterSpacing: -1, color: '#F0F0E8', marginBottom: 20 },
  title: { fontSize: 20, fontWeight: 700, color: '#F0F0E8', marginBottom: 6, fontFamily: "'Syne', sans-serif" },
  sub:   { fontSize: 12, color: '#777', marginBottom: 28 },
  form:  { display: 'flex', flexDirection: 'column', gap: 16 },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 11, color: '#999', textTransform: 'uppercase', letterSpacing: '0.5px' },
  input: { background: '#111', border: '1px solid #333', borderRadius: 8, padding: '10px 12px', color: '#F0F0E8', fontSize: 14, fontFamily: "'DM Mono', monospace", outline: 'none' },
  btn:   { background: '#F97316', border: 'none', borderRadius: 8, padding: '12px', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Mono', monospace' " },
  error: { fontSize: 12, color: '#EF4444', background: '#1a0808', border: '1px solid #EF444433', borderRadius: 6, padding: '8px 12px' },
};
