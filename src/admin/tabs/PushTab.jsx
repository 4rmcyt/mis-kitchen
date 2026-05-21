import { useState, useContext } from "react";
import { sendPushNotification } from "../../lib/supabase.js";
import { STATIONS, STATION_COLORS } from "../../lib/constants.js";
import { ToastContext } from "../components/Toast.jsx";

export function PushTab() {
  const { show } = useContext(ToastContext);
  const [title, setTitle]   = useState('');
  const [body, setBody]     = useState('');
  const [station, setStation] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) return;
    setSending(true);
    try {
      const res = await sendPushNotification({
        title: title.trim(),
        body:  body.trim(),
        station: station || undefined,
      });
      show(`Sent to ${res.sent} device${res.sent !== 1 ? 's' : ''}`, 'success');
      setTitle('');
      setBody('');
      setStation('');
    } catch (e) {
      show(e.message, 'error');
    } finally {
      setSending(false);
    }
  };

  const canSend = title.trim() && body.trim() && !sending;

  return (
    <div className="tab-content">
      <div style={{ maxWidth: 520 }}>

        <div style={{ marginBottom: 24 }}>
          <div className="form-label" style={{ marginBottom: 10 }}>Recipients</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[{ value: '', label: 'All staff' }, ...STATIONS.filter(s => s !== 'Common').map(s => ({ value: s, label: s }))].map(opt => (
              <button
                key={opt.value}
                onClick={() => setStation(opt.value)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 20,
                  border: `1px solid ${station === opt.value ? (STATION_COLORS[opt.value] || 'var(--accent)') : 'var(--border)'}`,
                  background: station === opt.value ? (STATION_COLORS[opt.value] ? STATION_COLORS[opt.value] + '22' : 'rgba(249,115,22,0.1)') : 'transparent',
                  color: station === opt.value ? (STATION_COLORS[opt.value] || 'var(--accent)') : 'var(--text-muted)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >{opt.label}</button>
            ))}
          </div>
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 14, borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: 20 }}>🔔</span>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700 }}>Push Notification</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                → {station ? `${station} station` : 'All staff'}
              </div>
            </div>
          </div>

          <div>
            <div className="form-label" style={{ marginBottom: 6 }}>Title</div>
            <input
              className="form-input"
              placeholder="e.g. Prep starts in 15 min"
              value={title}
              onChange={e => setTitle(e.target.value)}
              maxLength={64}
              autoFocus
            />
          </div>

          <div>
            <div className="form-label" style={{ marginBottom: 6, display: 'flex', justifyContent: 'space-between' }}>
              <span>Message</span>
              <span style={{ color: body.length > 160 ? 'var(--accent)' : 'var(--text-muted)' }}>{body.length}/200</span>
            </div>
            <textarea
              className="form-input"
              placeholder="Message body…"
              value={body}
              onChange={e => setBody(e.target.value)}
              maxLength={200}
              rows={3}
              style={{ resize: 'none' }}
            />
          </div>

          <button
            className="save-btn"
            style={{ marginTop: 4 }}
            onClick={handleSend}
            disabled={!canSend}
          >
            {sending ? 'Sending…' : 'Send Notification'}
          </button>
        </div>

      </div>
    </div>
  );
}
