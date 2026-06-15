import { useState } from "react";
import { STATIONS, STATION_COLORS, SECTIONS, SECTION_COLORS } from "../lib/constants.js";
import { AddTaskModal } from "../components/AddTaskModal.js";
import { ReportModal } from "../components/ReportModal.js";
import { useTodayTasks } from "../hooks/features/useTodayTasks.js";
import { selectOwnedTasks } from "../domain/ownership.js";
import type { Task, Role, Station } from "../lib/types.js";

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

export function TodayScreen({ userStation = 'Common', userRole, userId = null }: { userStation?: Station | string; userRole: Role | null; userId?: string | null }) {
  const [dateOffset, setDateOffset] = useState(0);
  const [stationFilter, setStationFilter] = useState('All');
  const [showAddTask, setShowAddTask] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [commentingId, setCommentingId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');

  const { tasks, bySection, progress, loading, experiment, improvements, selectedDate, toggle, addTask, saveComment, removeTask } =
    useTodayTasks(dateOffset, stationFilter);

  const isAdmin = userRole === 'admin' || userRole === 'superadmin';

  const ownedTasks = userId
    ? selectOwnedTasks(tasks, { id: userId, station: userStation as Station | null })
    : tasks;
  const nextShiftTasks = ownedTasks.filter((t: Task) => !t.done).map((t: Task) => t.text);

  const handleSaveComment = async (taskId: string) => {
    await saveComment(taskId, commentText);
    setCommentingId(null);
    setCommentText('');
  };

  return (
    <div className="screen">
      <div className="screen-header">
        <div>
          <div className="screen-title">Today</div>
          <div className="screen-sub">{formatDateLabel(selectedDate)}</div>
        </div>
        <div className="screen-hdr-actions">
          {progress.total > 0 && <button className="report-trigger" onClick={() => setShowReport(true)} title="Send report">📋</button>}
          <button className="report-trigger" onClick={() => setShowAddTask(true)} title="Add task">＋</button>
          {progress.total > 0 && (
            <div className="progress-ring">
              <svg viewBox="0 0 48 48">
                <circle cx="24" cy="24" r="20" fill="none" stroke="#222" strokeWidth="4"/>
                <circle cx="24" cy="24" r="20" fill="none" stroke="#F97316" strokeWidth="4"
                  strokeDasharray={`${progress.pct*1.257} 125.7`} strokeLinecap="round" transform="rotate(-90 24 24)"/>
              </svg>
              <span className="ring-pct">{progress.pct}%</span>
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

      {!loading && progress.total === 0 && (
        <div className="empty-state">
          <div className="empty-icon">🔪</div>
          <div className="empty-title">No tasks yet</div>
          <div className="empty-sub">Tap + to add a task</div>
        </div>
      )}

      {!loading && SECTIONS.map(sec => {
        const items = bySection[sec];
        if (!items.length) return null;
        const doneCnt = items.filter((t: Task) => t.done).length;
        return (
          <div className="section" key={sec}>
            <div className="section-header">
              <div className="section-dot" style={{ background: SECTION_COLORS[sec] }}/>
              <span className="section-name">{sec}</span>
              <span className="section-count">{doneCnt}/{items.length}</span>
            </div>
            {items.map((task: Task) => (
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
                    <button className="action-btn del" onClick={() => removeTask(task.id)}>×</button>
                  )}
                </div>
                {commentingId === task.id && (
                  <div className="timer-row comment-row">
                    <input className="add-input" placeholder="Add comment…" value={commentText}
                      autoFocus onChange={e => setCommentText(e.target.value)}
                      onKeyDown={e => { if (e.key==='Enter') handleSaveComment(task.id); if (e.key==='Escape') setCommentingId(null); }}/>
                    <button className="add-confirm" onClick={() => handleSaveComment(task.id)}>✓</button>
                    <button className="action-btn" onClick={() => setCommentingId(null)}>×</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        );
      })}

      {showAddTask && <AddTaskModal userStation={stationFilter !== 'All' ? stationFilter : userStation} onSave={addTask} onClose={() => setShowAddTask(false)}/>}
      {showReport && (() => {
        const reportDone  = ownedTasks.filter((t: Task) => t.done).length;
        const reportTotal = ownedTasks.length;
        const reportPct   = reportTotal > 0 ? Math.round((reportDone / reportTotal) * 100) : 0;
        return (
          <ReportModal
            sections={SECTIONS.map(sec => {
              const sec_tasks = ownedTasks.filter((t: Task) => t.section === sec);
              return {
                name: sec,
                items: sec_tasks.map((t: Task) => ({ text: t.text, done: t.done })),
                done: sec_tasks.filter((t: Task) => t.done).length,
                total: sec_tasks.length,
              };
            })}
            nextShift={nextShiftTasks}
            pct={reportPct}
            done={reportDone}
            total={reportTotal}
            date={dateStr(dateOffset)}
            experiment={experiment}
            onClose={() => setShowReport(false)}
          />
        );
      })()}
    </div>
  );
}
