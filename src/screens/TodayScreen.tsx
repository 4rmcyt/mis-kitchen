import { useState, useEffect } from "react";
import { getTasks, createTask, createTasksBatch, completeTask, uncompleteTask, commentTask, deleteTask, getDefaultDayTemplate, getShiftExperiment, getImprovementLogs } from "../lib/supabase.js";
import { STATIONS, STATION_COLORS, SECTIONS, SECTION_COLORS } from "../lib/constants.js";
import { AddTaskModal } from "../components/AddTaskModal.js";
import { ReportModal } from "../components/ReportModal.js";
import type { Task, ImprovementLog, Role, Station } from "../lib/types.js";

function CheckIcon() {
  return <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><polyline points="2,7 5.5,10.5 12,3" stroke="#F97316" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}

function dateStr(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().split('T')[0];
}

function formatDateLabel(isoDate: string) {
  const today = dateStr(0);
  const yesterday = dateStr(-1);
  const tomorrow = dateStr(1);
  if (isoDate === today) return new Date(isoDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  if (isoDate === yesterday) return 'Yesterday';
  if (isoDate === tomorrow) return 'Tomorrow';
  return new Date(isoDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export function TodayScreen({ userStation = 'Common', userRole }: { userStation?: Station | string; userRole: Role | null }) {
  const [dateOffset, setDateOffset] = useState(0);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [stationFilter, setStationFilter] = useState('All');
  const [showAddTask, setShowAddTask] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [commentingId, setCommentingId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [experiment, setExperiment] = useState<string | null>(null);
  const [improvements, setImprovements] = useState<ImprovementLog[]>([]);

  const selectedDate = dateStr(dateOffset);

  useEffect(() => {
    getShiftExperiment().then(setExperiment).catch(() => {});
    getImprovementLogs(3).then(setImprovements).catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getTasks(selectedDate).then(async (rows: Task[]) => {
      if (cancelled) return;
      if (rows && rows.length > 0) {
        setTasks(rows);
        return;
      }
      if (selectedDate !== dateStr(0)) {
        setTasks([]);
        return;
      }
      const tpl = await getDefaultDayTemplate().catch(() => null);
      if (cancelled) return;
      if (!tpl || !tpl.entries?.length) {
        setTasks([]);
        return;
      }
      const batch = tpl.entries.map(e => ({
        text: e.text, station: e.station as Station, section: e.section, date: selectedDate, source: 'template' as const,
      }));
      const created = await createTasksBatch(batch).catch(() => null);
      if (cancelled) return;
      setTasks(created || []);
    }).catch(() => { if (!cancelled) setTasks([]); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [selectedDate]);

  const toggle = async (task: Task) => {
    try {
      const updated = task.done
        ? await uncompleteTask(task.id)
        : await completeTask(task.id);
      setTasks(ts => ts.map(t => t.id === task.id ? { ...t, ...updated } : t));
    } catch (_e) { /* noop */ }
  };

  const handleAddTask = async ({ text, station, section, date }: { text: string; station: string; section: string; date: string }) => {
    try {
      const task = await createTask({ text, station: station as Station, section, date, source: 'manual' });
      if (date === selectedDate) setTasks(ts => [...ts, task]);
    } catch (_e) { /* noop */ }
  };

  const saveComment = async (taskId: string) => {
    try {
      const updated = await commentTask(taskId, commentText);
      setTasks(ts => ts.map(t => t.id === taskId ? { ...t, ...updated } : t));
      setCommentingId(null);
      setCommentText('');
    } catch (_e) { /* noop */ }
  };

  const handleDelete = async (taskId: string) => {
    try {
      await deleteTask(taskId);
      setTasks(ts => ts.filter(t => t.id !== taskId));
    } catch (_e) { /* noop */ }
  };

  const isAdmin = userRole === 'admin' || userRole === 'superadmin';

  const filtered = stationFilter === 'All'
    ? tasks
    : tasks.filter(t => t.station === stationFilter || t.station === 'Common');

  const bySection = SECTIONS.reduce<Record<string, Task[]>>((acc, sec) => {
    acc[sec] = filtered.filter(t => t.section === sec);
    return acc;
  }, {});

  const totalDone = filtered.filter(t => t.done).length;
  const totalAll = filtered.length;
  const pct = totalAll ? Math.round((totalDone / totalAll) * 100) : 0;

  return (
    <div className="screen">
      <div className="screen-header">
        <div>
          <div className="screen-title">Today</div>
          <div className="screen-sub">{formatDateLabel(selectedDate)}</div>
        </div>
        <div className="screen-hdr-actions">
          {totalAll > 0 && <button className="report-trigger" onClick={() => setShowReport(true)} title="Send report">📋</button>}
          <button className="report-trigger" onClick={() => setShowAddTask(true)} title="Add task">＋</button>
          {totalAll > 0 && (
            <div className="progress-ring">
              <svg viewBox="0 0 48 48">
                <circle cx="24" cy="24" r="20" fill="none" stroke="#222" strokeWidth="4"/>
                <circle cx="24" cy="24" r="20" fill="none" stroke="#F97316" strokeWidth="4"
                  strokeDasharray={`${pct*1.257} 125.7`} strokeLinecap="round" transform="rotate(-90 24 24)"/>
              </svg>
              <span className="ring-pct">{pct}%</span>
            </div>
          )}
        </div>
      </div>

      <div className="date-switcher">
        {[0,1,2,3].map(off => (
          <button key={off} className={`date-pill ${dateOffset===off?'active':''}`} onClick={() => setDateOffset(off)}>
            {off === 0 ? 'Today' : off === 1 ? 'Tmrw' : new Date(dateStr(off)+'T12:00:00').toLocaleDateString('en-US',{weekday:'short'})}
          </button>
        ))}
      </div>

      <div className="station-filter">
        {['All', ...STATIONS].map(st => (
          <button key={st} className={`station-pill ${stationFilter===st?'active':''}`}
            style={stationFilter===st && st!=='All' ? { background: STATION_COLORS[st]||'#888', color:'#000', borderColor: STATION_COLORS[st]||'#888' } : {}}
            onClick={() => setStationFilter(st)}>{st}</button>
        ))}
      </div>

      {experiment && (
        <div className="experiment-banner">
          <span className="experiment-banner-icon">🧪</span>
          <div>
            <div className="experiment-banner-title">Today&apos;s experiment</div>
            <div className="experiment-banner-text">{experiment}</div>
          </div>
        </div>
      )}

      {improvements.length > 0 && (
        <div className="wins-banner">
          <div className="wins-banner-title">✓ Recent wins</div>
          {improvements.map((log) => (
            <div key={log.id} className="wins-banner-item">{log.text}</div>
          ))}
        </div>
      )}

      {loading && <div className="loading-msg">Loading…</div>}

      {!loading && totalAll === 0 && (
        <div className="empty-state">
          <div className="empty-icon">🔪</div>
          <div className="empty-title">No tasks yet</div>
          <div className="empty-sub">Tap + to add a task</div>
        </div>
      )}

      {!loading && SECTIONS.map(sec => {
        const items = bySection[sec];
        if (!items.length) return null;
        const doneCnt = items.filter(t => t.done).length;
        return (
          <div className="section" key={sec}>
            <div className="section-header">
              <div className="section-dot" style={{ background: SECTION_COLORS[sec] }}/>
              <span className="section-name">{sec}</span>
              <span className="section-count">{doneCnt}/{items.length}</span>
            </div>
            {items.map(task => (
              <div key={task.id} className={`check-item ${task.done ? 'done' : ''}`}>
                <button className="check-btn" onClick={() => toggle(task)}>
                  <span className="check-inner">{task.done && <CheckIcon/>}</span>
                </button>
                <div className="item-body item-body-col">
                  <span className="item-text">{task.text}</span>
                  <div className="item-tags">
                    {task.station !== 'Common' && (
                      <span className="task-station-tag" style={{ background: STATION_COLORS[task.station]||'#888' }}>{task.station}</span>
                    )}
                    {task.source !== 'manual' && (
                      <span className="task-source-tag">{task.source}</span>
                    )}
                    {task.comment && (
                      <span className="task-comment-tag">💬 {task.comment}</span>
                    )}
                  </div>
                </div>
                <div className="item-actions">
                  <button className="action-btn" title="Comment"
                    onClick={() => { setCommentingId(task.id); setCommentText(task.comment || ''); }}>💬</button>
                  {isAdmin && (
                    <button className="action-btn del" onClick={() => handleDelete(task.id)}>×</button>
                  )}
                </div>
                {commentingId === task.id && (
                  <div className="timer-row comment-row">
                    <input className="add-input" placeholder="Add comment…" value={commentText}
                      autoFocus onChange={e => setCommentText(e.target.value)}
                      onKeyDown={e => { if (e.key==='Enter') saveComment(task.id); if (e.key==='Escape') setCommentingId(null); }}/>
                    <button className="add-confirm" onClick={() => saveComment(task.id)}>✓</button>
                    <button className="action-btn" onClick={() => setCommentingId(null)}>×</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        );
      })}

      {showAddTask && <AddTaskModal userStation={stationFilter !== 'All' ? stationFilter : userStation} onSave={handleAddTask} onClose={() => setShowAddTask(false)}/>}
      {showReport && (
        <ReportModal
          sections={SECTIONS.map(sec => ({
            name: sec,
            items: bySection[sec].map(t => ({ text: t.text, done: t.done })),
            done: bySection[sec].filter(t => t.done).length,
            total: bySection[sec].length,
          }))}
          nextShift={filtered.filter(t => !t.done).map(t => t.text)}
          pct={pct}
          done={totalDone}
          total={totalAll}
          date={dateStr(dateOffset)}
          experiment={experiment}
          onClose={() => setShowReport(false)}
        />
      )}
    </div>
  );
}
