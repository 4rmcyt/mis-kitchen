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

      <div className="block-success" style={{ marginBottom: 20 }}>
        <div className="block-success-title">✓ Log an improvement</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>
          What did the team improve this week? Staff will see this on their Today screen.
        </div>
        <div className="flex-row gap-8">
          <input
            className="search-inp flex-1"
            placeholder="e.g. Reduced opening time by 10 min by pre-staging mise en place…"
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submit()}
          />
          <button className="btn-primary flex-shrink-0" onClick={submit} disabled={saving || !text.trim()}>
            {saving ? 'Saving…' : 'Post'}
          </button>
        </div>
      </div>

      <div className="log-list">
        {logs.length === 0 && (
          <div className="empty-inline">No improvements logged yet. Be the first!</div>
        )}
        {logs.map(log => (
          <div key={log.id} className="log-item">
            <Avatar name={log.profiles?.name || '?'} size={32}/>
            <div className="log-body">
              <div className="log-text">{log.text}</div>
              <div className="log-meta">{log.profiles?.name || 'Admin'} · {timeAgo(log.created_at)}</div>
            </div>
            <button className="log-del" onClick={() => remove(log)} title="Delete">×</button>
          </div>
        ))}
      </div>
    </div>
  );
}
