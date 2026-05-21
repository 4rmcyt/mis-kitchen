import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getRestaurantProfiles, signOut, getTasks, createTask, createTasksBatch, completeTask, uncompleteTask, commentTask, deleteTask, getDefaultDayTemplate, getRecipes, saveReport, sendReportEmail, subscribePush } from "./lib/supabase.js";
import { STATIONS, STATION_COLORS, SECTIONS, SECTION_COLORS } from "./lib/constants.js";
import "./App.css";

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

function AddTaskModal({ userStation, onSave, onClose }) {
  const [text, setText] = useState('');
  const [station, setStation] = useState(userStation);
  const [section, setSection] = useState('Other');
  const [date, setDate] = useState(dateStr(0));
  const [saving, setSaving] = useState(false);

  const minDate = dateStr(0);

  const save = async () => {
    if (!text.trim()) return;
    setSaving(true);
    await onSave({ text: text.trim(), station, section, date });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ display:'flex', flexDirection:'column', gap:14 }}>
        <div className="modal-header"><span>Add Task</span><button className="action-btn del" onClick={onClose}>×</button></div>
        <input className="form-input" placeholder="Task description…" value={text} onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && save()} autoFocus/>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          <div>
            <div className="form-label">Station</div>
            <select className="form-input" value={station} onChange={e => setStation(e.target.value)}>
              {STATIONS.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <div className="form-label">Section</div>
            <select className="form-input" value={section} onChange={e => setSection(e.target.value)}>
              {SECTIONS.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div>
          <div className="form-label">Date</div>
          <input className="form-input" type="date" value={date} min={minDate} onChange={e => setDate(e.target.value)}/>
        </div>
        <button className="save-btn" onClick={save} disabled={saving || !text.trim()}>
          {saving ? 'Saving…' : 'Add Task'}
        </button>
      </div>
    </div>
  );
}

function ReportModal({ sections, nextShift, pct, done, total, date, onClose }) {
  const [state, setState] = useState('idle'); // idle | saving | sent | error
  const [errMsg, setErrMsg] = useState('');
  const pctColor = pct >= 90 ? '#10B981' : pct >= 70 ? '#F97316' : '#EF4444';

  const handleSend = async () => {
    setState('saving');
    try {
      await saveReport({ sections, nextShift });
      await sendReportEmail(date);
      setState('sent');
    } catch (e) {
      setErrMsg(e.message);
      setState('error');
    }
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', display:'flex', alignItems:'flex-end', justifyContent:'center', zIndex:100 }}>
      <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'16px 16px 0 0', width:'100%', maxWidth:480, padding:24, maxHeight:'80vh', overflowY:'auto' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
          <span style={{ fontFamily:'var(--font-display)', fontSize:16, fontWeight:700 }}>End of Shift Report</span>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'var(--text-muted)', fontSize:20, cursor:'pointer', lineHeight:1 }}>×</button>
        </div>

        {state === 'sent' ? (
          <div className="report-sent">✓ Report saved and emailed</div>
        ) : (
          <>
            <div className="report-summary">
              <div className="report-pct" style={{ color: pctColor }}>{pct}%</div>
              <div className="report-sub">{done} of {total} tasks completed</div>
            </div>

            <div className="report-sections" style={{ marginTop:16 }}>
              {sections.map((sec, i) => sec.total > 0 && (
                <div key={i} className="report-sec-row">
                  <span className="report-sec-name">{sec.name}</span>
                  <div className="report-sec-bar">
                    <div className="report-sec-fill" style={{ width: `${sec.total ? (sec.done/sec.total)*100 : 0}%`, background: pctColor }}/>
                  </div>
                  <span className="report-sec-count">{sec.done}/{sec.total}</span>
                </div>
              ))}
            </div>

            {nextShift.length > 0 && (
              <div className="report-next" style={{ marginTop:16 }}>
                <div className="report-next-label">→ Incomplete — carried to next shift</div>
                {nextShift.map((t, i) => (
                  <div key={i} className="report-next-item">
                    <span style={{ flex:1 }}>{t}</span>
                  </div>
                ))}
              </div>
            )}

            {state === 'error' && <div className="report-error" style={{ marginTop:12 }}>✗ {errMsg}</div>}

            <button
              className="btn-primary"
              style={{ width:'100%', marginTop:20 }}
              onClick={handleSend}
              disabled={state === 'saving'}
            >
              {state === 'saving' ? 'Sending…' : 'Save & Send Report'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function TodayScreen({ userStation = 'Common', userRole }) {
  const [dateOffset, setDateOffset] = useState(0);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stationFilter, setStationFilter] = useState(userStation);
  const [showAddTask, setShowAddTask] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [commentingId, setCommentingId] = useState(null);
  const [commentText, setCommentText] = useState('');

  const selectedDate = dateStr(dateOffset);

  useEffect(() => { setStationFilter(userStation); }, [userStation]);

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
    } catch {}
  };

  const handleAddTask = async ({ text, station, section, date }) => {
    try {
      const task = await createTask({ text, station, section, date, source: 'manual' });
      if (date === selectedDate) setTasks(ts => [...ts, task]);
    } catch {}
  };

  const saveComment = async (taskId) => {
    try {
      const updated = await commentTask(taskId, commentText);
      setTasks(ts => ts.map(t => t.id === taskId ? { ...t, ...updated } : t));
      setCommentingId(null);
      setCommentText('');
    } catch {}
  };

  const handleDelete = async (taskId) => {
    try {
      await deleteTask(taskId);
      setTasks(ts => ts.filter(t => t.id !== taskId));
    } catch {}
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

      {/* Date switcher */}
      <div className="date-switcher">
        {[0,1,2,3].map(off => (
          <button key={off} className={`date-pill ${dateOffset===off?'active':''}`} onClick={() => setDateOffset(off)}>
            {off === 0 ? 'Today' : off === 1 ? 'Tmrw' : new Date(dateStr(off)+'T12:00:00').toLocaleDateString('en-US',{weekday:'short'})}
          </button>
        ))}
      </div>

      {/* Station filter */}
      <div className="station-filter">
        {['All', ...STATIONS].map(st => (
          <button key={st} className={`station-pill ${stationFilter===st?'active':''}`}
            style={stationFilter===st && st!=='All' ? { background: STATION_COLORS[st]||'#888', color:'#000', borderColor: STATION_COLORS[st]||'#888' } : {}}
            onClick={() => setStationFilter(st)}>{st}</button>
        ))}
      </div>

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
          onClose={() => setShowReport(false)}
        />
      )}
    </div>
  );
}

function RecipesScreen() {
  const [recipes, setRecipes] = useState([]);
  const [active, setActive] = useState(null);
  const [multiplier, setMultiplier] = useState(1);
  const [search, setSearch] = useState('');

  useEffect(() => {
    getRecipes().then(data => setRecipes(data || []));
  }, []);

  const filtered = recipes.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) || (r.station || '').toLowerCase().includes(search.toLowerCase())
  );

  if (active) return (
    <div className="screen">
      <div className="screen-header">
        <button className="back-btn" onClick={() => setActive(null)}>← Back</button>
      </div>
      <div className="recipe-detail">
        <div className="recipe-station-badge" style={{ background: STATION_COLORS[active.station]||STATION_COLORS.Default }}>{active.station}</div>
        <h2 className="recipe-title">{active.name}</h2>
        <div className="multiplier-row">
          <span className="mult-label">Portions</span>
          {[1,2,5,10].map(m => <button key={m} className={`mult-btn ${multiplier===m?'active':''}`} onClick={() => setMultiplier(m)}>{m}×</button>)}
        </div>
        <div className="ingredients-list">
          {active.ingredients.map(ing => (
            <div key={ing.id} className="ing-row">
              <span className="ing-name">{ing.name}</span>
              <span className="ing-amount">{(ing.amount*multiplier).toFixed(ing.amount*multiplier%1!==0?1:0)} {ing.unit}</span>
            </div>
          ))}
        </div>
        <div className="steps-list">
          {active.steps.map((step,i) => (
            <div key={i} className="step-row">
              <span className="step-num">{i+1}</span>
              <span className="step-text">{step}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="screen">
      <div className="screen-header"><div className="screen-title">Recipes</div></div>
      <input className="search-input" placeholder="Search recipes..." value={search} onChange={e => setSearch(e.target.value)}/>
      <div className="recipe-grid">
        {filtered.map(r => (
          <button key={r.id} className="recipe-card" onClick={() => { setActive(r); setMultiplier(1); }}>
            <div className="recipe-card-station" style={{ background: STATION_COLORS[r.station]||STATION_COLORS.Default }}>{r.station}</div>
            <div className="recipe-card-name">{r.name}</div>
            <div className="recipe-card-meta">{r.ingredients.length} ingredients</div>
          </button>
        ))}
        {filtered.length === 0 && <div className="empty-state" style={{ gridColumn:'1/-1' }}><div className="empty-icon">📖</div><div className="empty-title">No recipes found</div></div>}
      </div>
    </div>
  );
}

function LineupScreen() {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getRestaurantProfiles()
      .then(data => setProfiles(data || []))
      .catch(() => setProfiles([]))
      .finally(() => setLoading(false));
  }, []);

  const byStation = STATIONS.reduce((acc, st) => {
    acc[st] = profiles.filter(p => (p.station || 'Common') === st && p.active !== false);
    return acc;
  }, {});
  const unassigned = profiles.filter(p => !p.station && p.active !== false);

  return (
    <div className="screen">
      <div className="screen-header">
        <div>
          <div className="screen-title">Lineup</div>
          <div className="screen-sub">Station assignments</div>
        </div>
      </div>
      {loading ? (
        <div className="empty-state"><div className="empty-sub">Loading…</div></div>
      ) : profiles.length === 0 ? (
        <div className="empty-state"><div className="empty-icon">👤</div><div className="empty-title">No crew yet</div><div className="empty-sub">Invite cooks from Admin panel</div></div>
      ) : (
        <>
          {STATIONS.filter(st => st !== 'Common').map(st => {
            const crew = byStation[st];
            if (crew.length === 0) return null;
            return (
              <div key={st} className="lineup-station">
                <div className="lineup-station-header">
                  <span className="lineup-station-dot" style={{ background: STATION_COLORS[st] || STATION_COLORS.Default }}/>
                  <span className="lineup-station-name">{st}</span>
                  <span className="lineup-station-count">{crew.length}</span>
                </div>
                {crew.map(p => (
                  <div key={p.id} className="lineup-cook">
                    <div className="lineup-avatar">{(p.name||'?')[0].toUpperCase()}</div>
                    <div className="lineup-info">
                      <div className="lineup-name">{p.name || p.email}</div>
                      <div className="lineup-role">{p.role || 'Cook'}</div>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
          {unassigned.length > 0 && (
            <div className="lineup-station">
              <div className="lineup-station-header">
                <span className="lineup-station-dot" style={{ background: '#555' }}/>
                <span className="lineup-station-name">Unassigned</span>
                <span className="lineup-station-count">{unassigned.length}</span>
              </div>
              {unassigned.map(p => (
                <div key={p.id} className="lineup-cook">
                  <div className="lineup-avatar" style={{ background: '#333' }}>{(p.name||'?')[0].toUpperCase()}</div>
                  <div className="lineup-info">
                    <div className="lineup-name">{p.name || p.email}</div>
                    <div className="lineup-role">{p.role || 'Cook'}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function App({ userRole, userStation = 'Common' }) {
  const [tab, setTab] = useState('today');
  const navigate = useNavigate();

  useEffect(() => {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted') {
      subscribePush();
    } else if (Notification.permission === 'default') {
      Notification.requestPermission().then(p => { if (p === 'granted') subscribePush(); });
    }
  }, []);

  const isAdmin = userRole === 'admin' || userRole === 'superadmin';

  return (
    <div className="app">
      <div className="app-inner">
        <header className="app-header">
          <span className="app-logo">mis<span className="logo-dot">.</span></span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {isAdmin && (
              <button className="admin-btn" onClick={() => navigate('/admin')} title="Admin panel">Admin</button>
            )}
            <button className="logout-btn" onClick={() => signOut()} title="Sign out">⏻</button>
          </div>
        </header>
        <main className="app-main">
          {tab==='today' && <TodayScreen userStation={userStation} userRole={userRole}/>}
          {tab==='lineup' && <LineupScreen/>}
          {tab==='recipes' && <RecipesScreen/>}
        </main>
        <nav className="bottom-nav">
          {[{id:'today',label:'Today',icon:'✓'},{id:'lineup',label:'Lineup',icon:'◈'},{id:'recipes',label:'Recipes',icon:'⚗'}].map(t => (
            <button key={t.id} className={`nav-btn ${tab===t.id?'active':''}`} onClick={() => setTab(t.id)}>
              <span className="nav-icon">{t.icon}</span>
              <span className="nav-label">{t.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}

