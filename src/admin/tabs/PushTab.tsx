import { useState, useContext, useEffect } from "react";
import { sendPushNotification, getPushSubscriptionCount } from "../../lib/supabase.js";
import { STATIONS, STATION_COLORS } from "../../lib/constants.js";
import { ToastContext } from "../components/Toast.js";
import type { Station } from "../../lib/types.js";

export function PushTab() {
  const ctx = useContext(ToastContext);
  const show = ctx!.show;
  const [title, setTitle]     = useState('');
  const [body, setBody]       = useState('');
  const [station, setStation] = useState('');
  const [sending, setSending] = useState(false);
  const [deviceCount, setDeviceCount] = useState<number | null>(null);

  useEffect(() => {
    getPushSubscriptionCount().then(setDeviceCount).catch(() => {});
  }, []);

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) return;
    setSending(true);
    try {
      const res = await sendPushNotification({
        title: title.trim(),
        body:  body.trim(),
        station: (station || undefined) as Station | undefined,
      });
      show(`Sent to ${res.sent} device${res.sent !== 1 ? 's' : ''}`, 'success');
      setTitle('');
      setBody('');
      setStation('');
    } catch (e) {
      show((e as Error).message, 'error');
    } finally {
      setSending(false);
    }
  };

  const canSend = title.trim() && body.trim() && !sending;

  const recipients = [
    { value: '', label: 'All staff' },
    ...STATIONS.filter(s => s !== 'Common').map(s => ({ value: s, label: s })),
  ];

  return (
    <div className="tab-content">
      <div className="push-compose">

        <div className="push-compose-hdr">
          <div className="push-compose-hdr-left">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            <span className="push-compose-title">Send Notification</span>
          </div>
          <div className="push-device-badge">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>
            </svg>
            <span data-testid="push-device-count">{deviceCount ?? '—'}</span> {deviceCount === 1 ? 'device' : 'devices'}
          </div>
        </div>

        <div className="push-field">
          <label className="push-field-label">To</label>
          <div className="push-pills">
            {recipients.map(opt => (
              <button
                key={opt.value}
                className={`push-pill${station === opt.value ? ' push-pill--active' : ''}`}
                onClick={() => setStation(opt.value)}
                style={station === opt.value ? {
                  borderColor: STATION_COLORS[opt.value] || 'var(--accent)',
                  background:  (STATION_COLORS[opt.value] || 'var(--accent)') + '22',
                  color:       STATION_COLORS[opt.value] || 'var(--accent)',
                } : undefined}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="push-field">
          <label className="push-field-label">Title</label>
          <input
            className="form-inp"
            placeholder="e.g. Prep starts in 15 min"
            value={title}
            onChange={e => setTitle(e.target.value)}
            maxLength={64}
            autoFocus
          />
        </div>

        <div className="push-field">
          <div className="push-field-row">
            <label className="push-field-label">Message</label>
            <span className="push-char-count" style={{ color: body.length > 160 ? 'var(--accent)' : 'var(--text-muted)' }}>
              {body.length}/200
            </span>
          </div>
          <textarea
            className="form-inp push-textarea"
            placeholder="Message body…"
            value={body}
            onChange={e => setBody(e.target.value)}
            maxLength={200}
            rows={3}
          />
        </div>

        <div className="push-preview">
          <div className="push-preview-label">Preview</div>
          <div className="push-preview-card">
            <div className="push-preview-app">mis kitchen</div>
            <div className="push-preview-title">{title || 'Title'}</div>
            <div className="push-preview-body">{body || 'Message body…'}</div>
          </div>
        </div>

        <button className="btn-primary push-send-btn" onClick={handleSend} disabled={!canSend}>
          {sending ? 'Sending…' : `Send to ${station ? station + ' station' : 'all staff'}`}
        </button>
      </div>
    </div>
  );
}
