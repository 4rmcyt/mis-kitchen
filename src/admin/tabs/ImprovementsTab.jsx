import { useState, useEffect } from "react";
import { getImprovementLogs, addImprovementLog, deleteImprovementLog } from "../../lib/supabase.js";
import { useToast } from "../components/Toast.jsx";
import { useConfirm } from "../components/Confirm.jsx";
import { Avatar } from "../components/Avatar.jsx";

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function ImprovementsTab() {
  const [logs, setLogs] = useState([]);
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const { show: toast } = useToast();
  const { confirm, dialog: confirmDialog } = useConfirm();

  useEffect(() => {
    getImprovementLogs(20).then(setLogs).catch(e => toast(e.message, 'error'));
  }, []);

  const submit = async () => {
    if (!text.trim()) return;
    setSaving(true);
    try {
      const entry = await addImprovementLog(text);
      setLogs(ls => [entry, ...ls]);
      setText('');
      toast('Improvement logged', 'success');
    } catch (e) { toast(e.message, 'error'); }
    setSaving(false);
  };

  const remove = async (log) => {
    if (!await confirm(`Delete this entry?`)) return;
    try {
      await deleteImprovementLog(log.id);
      setLogs(ls => ls.filter(l => l.id !== log.id));
    } catch (e) { toast(e.message, 'error'); }
  };

  return (
    <div className="tab-content">
      {confirmDialog}

      <div style={{ marginBottom: 20, padding: '14px 16px', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 'var(--radius)' }}>
        <div style={{ fontSize: 12, color: '#10B981', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>✓ Log an improvement</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>
          What did the team improve this week? Staff will see this on their Today screen.
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            className="search-inp"
            style={{ flex: 1, maxWidth: 'none' }}
            placeholder="e.g. Reduced opening time by 10 min by pre-staging mise en place…"
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submit()}
          />
          <button className="btn-primary" style={{ flexShrink: 0 }} onClick={submit} disabled={saving || !text.trim()}>
            {saving ? 'Saving…' : 'Post'}
          </button>
        </div>
      </div>

      <div className="improvement-log-list" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {logs.length === 0 && (
          <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: '24px 0', textAlign: 'center' }}>
            No improvements logged yet. Be the first!
          </div>
        )}
        {logs.map(log => (
          <div key={log.id} style={{ display: 'flex', gap: 12, padding: '12px 14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', alignItems: 'flex-start' }}>
            <Avatar name={log.profiles?.name || '?'} size={32} style={{ flexShrink: 0 }}/>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5 }}>{log.text}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                {log.profiles?.name || 'Admin'} · {timeAgo(log.created_at)}
              </div>
            </div>
            <button
              onClick={() => remove(log)}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 16, padding: '0 4px', lineHeight: 1, flexShrink: 0 }}
              title="Delete"
            >×</button>
          </div>
        ))}
      </div>
    </div>
  );
}
