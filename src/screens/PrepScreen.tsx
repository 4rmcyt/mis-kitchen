import { useState } from "react";
import { usePrepTasks, type PrepTask } from "../hooks/features/usePrepTasks.js";
import { usePrepStats, type Period } from "../hooks/features/usePrepStats.js";
import type { ByPrepEntry } from "../domain/prep_stats.js";

function CheckIcon() {
  return <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><polyline points="2,7 5.5,10.5 12,3" stroke="#F97316" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}

function OwnerBadge({ name }: { name: string | null | undefined }) {
  const initials = name ? name.trim().slice(0, 2).toUpperCase() : '?';
  const color = name ? '#F97316' : '#555';
  return (
    <span className="prep-owner-badge" style={{ background: `${color}22`, borderColor: `${color}44`, color }}>
      {initials}
    </span>
  );
}

function QtyInput({ task, onSave }: { task: PrepTask; onSave: (id: string, qty: number | null) => void }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(task.quantity !== null ? String(task.quantity) : '');

  const commit = () => {
    setEditing(false);
    const num = val.trim() === '' ? null : parseInt(val.trim(), 10);
    if (val.trim() !== '' && (isNaN(num as number) || (num as number) < 0)) {
      setVal(task.quantity !== null ? String(task.quantity) : '');
      return;
    }
    onSave(task.id, num ?? null);
  };

  if (task.done) {
    return <span className="prep-qty-locked">{task.quantity !== null ? `×${task.quantity}` : ''}</span>;
  }

  if (editing) {
    return (
      <input
        className="prep-qty-input"
        type="number"
        min={0}
        value={val}
        autoFocus
        onChange={e => setVal(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') commit(); }}
      />
    );
  }

  return (
    <button className="prep-qty-btn" onClick={() => setEditing(true)}>
      {task.quantity !== null ? `×${task.quantity}` : <span className="prep-qty-empty">qty</span>}
    </button>
  );
}

function PrepList() {
  const { tasks, loading, toggle, setQuantity } = usePrepTasks();
  const done  = tasks.filter(t => t.done).length;
  const total = tasks.length;

  return (
    <>
      <div className="screen-sub">
        {total > 0 ? `${done} / ${total} done` : 'No prep tasks today'}
      </div>

      {loading && <div className="loading-msg">Loading…</div>}

      {!loading && (
        <div className="prep-list">
          {tasks.map(task => (
            <div key={task.id} className={`prep-row${task.done ? ' prep-row--done' : ''}`}>
              <button
                className={`prep-toggle${task.done ? ' prep-toggle--done' : ''}`}
                onClick={() => toggle(task)}
                aria-label={task.done ? 'Undo' : 'Complete'}
              >
                {task.done && <CheckIcon />}
              </button>

              <div className="prep-row-body">
                <span className="prep-row-text">{task.text}</span>
              </div>

              <QtyInput task={task} onSave={setQuantity} />

              <OwnerBadge name={task.assigned_profile?.name} />
            </div>
          ))}

          {tasks.length === 0 && (
            <div className="prep-empty-msg">No prep tasks for today.</div>
          )}
        </div>
      )}
    </>
  );
}

function PrepItemStatRow({ entry }: { entry: ByPrepEntry }) {
  return (
    <div className="prep-stat-row">
      <div className="prep-stat-name">{entry.prep_item_name}</div>
      <div className="prep-stat-counts">
        <span className="prep-stat-tasks">{entry.total_tasks}×</span>
        {entry.total_units > 0 && <span className="prep-stat-units">{entry.total_units} u</span>}
      </div>
    </div>
  );
}

function PrepStatsList() {
  const [period, setPeriod] = useState<Period>('week');
  const { data, loading, error } = usePrepStats(period);

  return (
    <>
      <div className="prep-stats-toolbar">
        <button className={`period-btn${period === 'week' ? ' active' : ''}`} onClick={() => setPeriod('week')}>Week</button>
        <button className={`period-btn${period === 'month' ? ' active' : ''}`} onClick={() => setPeriod('month')}>Month</button>
      </div>

      {loading && <div className="loading-msg">Loading…</div>}
      {error   && <div className="prep-empty-msg" style={{ color: '#EF4444' }}>{error}</div>}

      {!loading && !error && data && data.byPrep.length === 0 && (
        <div className="prep-empty-msg">No prep data yet.</div>
      )}

      {!loading && !error && data && data.byPrep.length > 0 && (
        <div className="prep-stats-list">
          {data.byPrep.map(e => <PrepItemStatRow key={e.prep_item_id} entry={e} />)}
        </div>
      )}
    </>
  );
}

type PrepTab = 'today' | 'stats';

export function PrepScreen() {
  const [activeTab, setActiveTab] = useState<PrepTab>('today');

  return (
    <div className="screen">
      <div className="screen-header">
        <div className="screen-title">Prep</div>
      </div>

      <div className="prep-screen-tabs">
        <button className={`prep-screen-tab${activeTab === 'today' ? ' active' : ''}`} onClick={() => setActiveTab('today')}>Today</button>
        <button className={`prep-screen-tab${activeTab === 'stats' ? ' active' : ''}`} onClick={() => setActiveTab('stats')}>My stats</button>
      </div>

      {activeTab === 'today' && <PrepList />}
      {activeTab === 'stats' && <PrepStatsList />}
    </div>
  );
}
