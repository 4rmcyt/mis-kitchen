import { useState, useEffect } from "react";
import { getTasks, createTask, createTasksBatch, completeTask, uncompleteTask, commentTask, deleteTask, getDefaultDayTemplate, getShiftExperiment, getImprovementLogs } from "../lib/supabase.js";
import { STATIONS, STATION_COLORS, SECTIONS, SECTION_COLORS } from "../lib/constants.js";
import { AddTaskModal } from "../components/AddTaskModal.jsx";
import { ReportModal } from "../components/ReportModal.jsx";

function CheckIcon() {
  return <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><polyline points="2,7 5.5,10.5 12,3" stroke="#F97316" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}

function dateStr(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().split('T')[0];
}

function formatDateLabel(isoDate) {
  const today = dateStr(0);
  const yesterday = dateStr(-1);
  const tomorrow = dateStr(1);
  if (isoDate === today) return new Date(isoDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  if (isoDate === yesterday) return 'Yesterday';
  if (isoDate === tomorrow) return 'Tomorrow';
  return new Date(isoDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export function TodayScreen({ userStation = 'Common', userRole }) {
  const [dateOffset, setDateOffset] = useState(0);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stationFilter, setStationFilter] = useState('All');
  const [showAddTask, setShowAddTask] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [commentingId, setCommentingId] = useState(null);
  const [commentText, setCommentText] = useState('');
  const [experiment, setExperiment] = useState(null);
  const [improvements, setImprovements] = useState([]);

  const selectedDate = dateStr(dateOffset);

  useEffect(() => {
    getShiftExperiment().then(setExperiment).catch(() => {});
    getImprovementLogs(3).then(setImprovements).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    getTasks(selectedDate).then(async (rows) => {
      if (rows && rows.length > 0) {
        setTasks(rows);
        return;
      }
      const tpl = await getDefaultDayTemplate().catch(() => null);
      if (!tpl || !tpl.entries?.length) {
        setTasks([]);
        return;
      }
      const batch = tpl.entries.map(e => ({
        text: e.text, station: e.station, section: e.section, date: selectedDate, source: 'template',
      }));
      const created = await createTasksBatch(batch).catch(() => null);
      setTasks(created || []);
    }).catch(() => setTasks([])).finally(() => setLoading(false));
  }, [selectedDate]);

  const toggle = async (task) => {
    try {
      const updated = task.done
        ? await uncompleteTask(task.id)
        : await completeTask(task.id);
      setTasks(ts => ts.map(t => t.id === task.id ? { ...t, ...updated } : t));
    } catch (_e) { /* noop */ }
  };

  const handleAddTask = async ({ text, station, section, date }) => {
    try {
      const task = await createTask({ text, station, section, date, source: 'manual' });
      if (date === selectedDate) setTasks(ts => [...ts, task]);
    } catch (_e) { /* noop */ }
  };

  const saveComment = async (taskId) => {
    try {
      const updated = await commentTask(taskId, commentText);
      setTasks(ts => ts.map(t => t.id === taskId ? { ...t, ...updated } : t));
      setCommentingId(null);
      setCommentText('');
    } catch (_e) { /* noop */ }
  };

  const handleDelete = async (taskId) => {
    try {
      await deleteTask(taskId);
      setTasks(ts => ts.filter(t => t.id !== taskId));
    } catch (_e) { /* noop */ }
  };

  const isAdmin = userRole === 'admin' || userRole === 'superadmin';

  const filtered = stationFilter === 'All'
    ? tasks
    : tasks.filter(t => t.station === stationFilter || t.station === 'Common');

  const bySection = SECTIONS.reduce((acc, sec) => {
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
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
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
        <div style={{ margin:'0 0 12px', padding:'10px 14px', background:'rgba(249,115,22,0.08)', border:'1px solid rgba(249,115,22,0.25)', borderRadius:'var(--radius)', display:'flex', gap:10, alignItems:'flex-start' }}>
          <span style={{ fontSize:15, flexShrink:0 }}>🧪</span>
          <div>
            <div style={{ fontSize:11, color:'#F97316', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:3 }}>Today&apos;s experiment</div>
            <div style={{ fontSize:13, color:'var(--text)', lineHeight:1.4 }}>{experiment}</div>
          </div>
        </div>
      )}

      {improvements.length > 0 && (
        <div style={{ margin:'0 0 12px', padding:'10px 14px', background:'rgba(16,185,129,0.07)', border:'1px solid rgba(16,185,129,0.2)', borderRadius:'var(--radius)' }}>
          <div style={{ fontSize:11, color:'#10B981', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:6 }}>✓ Recent wins</div>
          {improvements.map((log, i) => (
            <div key={log.id} style={{ fontSize:13, color:'var(--text)', lineHeight:1.4, padding:'3px 0', borderTop: i > 0 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
              {log.text}
            </div>
          ))}
        </div>
      )}

      {loading && <div style={{ textAlign:'center', padding:40, color:'var(--text-muted)', fontSize:13 }}>Loading…</div>}

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
                <div className="item-body" style={{ flexDirection:'column', alignItems:'flex-start', gap:2 }}>
                  <span className="item-text">{task.text}</span>
                  <div style={{ display:'flex', gap:6, alignItems:'center', flexWrap:'wrap' }}>
                    {task.station !== 'Common' && (
                      <span style={{ fontSize:10, background: STATION_COLORS[task.station]||'#888', color:'#000', padding:'1px 6px', borderRadius:4, fontFamily:'var(--font-display)', fontWeight:600 }}>{task.station}</span>
                    )}
                    {task.source !== 'manual' && (
                      <span style={{ fontSize:10, color:'var(--text-muted)', border:'1px solid var(--border)', padding:'1px 6px', borderRadius:4 }}>{task.source}</span>
                    )}
                    {task.comment && (
                      <span style={{ fontSize:11, color:'var(--text-muted)', fontStyle:'italic' }}>💬 {task.comment}</span>
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
                  <div className="timer-row" style={{ width:'100%' }}>
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
