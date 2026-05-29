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

  return (
    <div className="tab-content">
      <div className="stat-row">
        <div className="stat-card">
          <div className="stat-val" data-testid="push-device-count">{deviceCount ?? '—'}</div>
          <div className="stat-lbl">Subscribed devices</div>
        </div>
      </div>
      <div className="push-wrap">

        <div className="push-recipients">
          <div className="form-label mb-10">Recipients</div>
          <div className="flex-row gap-8 flex-wrap">
            {[{ value: '', label: 'All staff' }, ...STATIONS.filter(s => s !== 'Common').map(s => ({ value: s, label: s }))].map(opt => (
              <button
                key={opt.value}
                className="push-pill"
                onClick={() => setStation(opt.value)}
                style={{
                  borderColor: station === opt.value ? (STATION_COLORS[opt.value] || 'var(--accent)') : 'var(--border)',
                  background: station === opt.value ? (STATION_COLORS[opt.value] ? STATION_COLORS[opt.value] + '22' : 'rgba(249,115,22,0.1)') : 'transparent',
                  color: station === opt.value ? (STATION_COLORS[opt.value] || 'var(--accent)') : 'var(--text-muted)',
                }}
              >{opt.label}</button>
            ))}
          </div>
        </div>

        <div className="push-card">
          <div className="push-card-hdr">
            <span className="push-card-icon">🔔</span>
            <div>
              <div className="push-card-title">Push Notification</div>
              <div className="push-card-sub">→ {station ? `${station} station` : 'All staff'}</div>
            </div>
          </div>

          <div>
            <div className="form-label mb-6">Title</div>
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
            <div className="form-label-row">
              <span className="form-label">Message</span>
              <span className="push-char-count" style={{ color: body.length > 160 ? 'var(--accent)' : 'var(--text-muted)' }}>{body.length}/200</span>
            </div>
            <textarea
              className="form-input resize-none"
              placeholder="Message body…"
              value={body}
              onChange={e => setBody(e.target.value)}
              maxLength={200}
              rows={3}
            />
          </div>

          <button className="save-btn mt-4" onClick={handleSend} disabled={!canSend}>
            {sending ? 'Sending…' : 'Send Notification'}
          </button>
        </div>

      </div>
    </div>
  );
}
