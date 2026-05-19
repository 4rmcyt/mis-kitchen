import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getRestaurantProfiles, signOut, getTasks, createTask, completeTask, uncompleteTask, commentTask, deleteTask } from "./lib/supabase.js";

const STATIONS = ["Common", "Cold", "Rolls", "Hot", "Grill", "Tandoor"];
const STATION_COLORS = {
  Cold: "#22D3EE", Rolls: "#A78BFA", Hot: "#F97316",
  Grill: "#EF4444", Tandoor: "#F59E0B", Default: "#6B7280"
};

const load = (key, fallback) => { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; } };

const DEFAULT_RECIPES = [
  { id: "r1", name: "Beurre Blanc", station: "Hot", portions: 1,
    ingredients: [
      { id: "i1", name: "White wine", amount: 120, unit: "ml" },
      { id: "i2", name: "Shallots, minced", amount: 30, unit: "g" },
      { id: "i3", name: "Heavy cream", amount: 30, unit: "ml" },
      { id: "i4", name: "Butter cold, cubed", amount: 200, unit: "g" },
      { id: "i5", name: "Lemon juice", amount: 5, unit: "ml" },
    ],
    steps: ["Reduce wine + shallots until nearly dry.", "Add cream, reduce by half.", "Mount butter off heat, cube by cube. Season."]
  },
  { id: "r2", name: "Garlic Confit", station: "Cold", portions: 1,
    ingredients: [
      { id: "j1", name: "Garlic cloves", amount: 200, unit: "g" },
      { id: "j2", name: "Olive oil", amount: 300, unit: "ml" },
      { id: "j3", name: "Thyme sprigs", amount: 3, unit: "pcs" },
      { id: "j4", name: "Bay leaf", amount: 1, unit: "pcs" },
    ],
    steps: ["Peel garlic, place in small pot.", "Cover with olive oil + herbs.", "90°C, 45 min. Cool in oil. Keeps 2 weeks."]
  }
];

function CheckIcon() {
  return <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><polyline points="2,7 5.5,10.5 12,3" stroke="#F97316" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}


const SECTIONS = ['Opening', 'Closing', 'Other'];
const SECTION_COLORS = { Opening: '#F97316', Closing: '#6366F1', Other: '#6B7280' };

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

function TodayScreen({ userStation = 'Common', userRole }) {
  const [dateOffset, setDateOffset] = useState(0);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stationFilter, setStationFilter] = useState(userStation);
  const [showAddTask, setShowAddTask] = useState(false);
  const [commentingId, setCommentingId] = useState(null);
  const [commentText, setCommentText] = useState('');

  const selectedDate = dateStr(dateOffset);

  useEffect(() => { setStationFilter(userStation); }, [userStation]);

  useEffect(() => {
    setLoading(true);
    getTasks(selectedDate)
      .then(rows => setTasks(rows || []))
      .catch(() => setTasks([]))
      .finally(() => setLoading(false));
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
        {[-3,-2,-1,0,1,2,3].map(off => (
          <button key={off} className={`date-pill ${dateOffset===off?'active':''}`} onClick={() => setDateOffset(off)}>
            {off === 0 ? 'Today' : off === -1 ? 'Yest' : off === 1 ? 'Tmrw' : new Date(dateStr(off)+'T12:00:00').toLocaleDateString('en-US',{weekday:'short'})}
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
    </div>
  );
}

function RecipesScreen() {
  const [recipes] = useState(() => load('mis_recipes', DEFAULT_RECIPES));
  const [active, setActive] = useState(null);
  const [multiplier, setMultiplier] = useState(1);
  const [search, setSearch] = useState('');
  const [stationFilter, setStationFilter] = useState('All');

  const filtered = recipes.filter(r => {
    const ms = r.name.toLowerCase().includes(search.toLowerCase()) || r.station.toLowerCase().includes(search.toLowerCase());
    return ms && (stationFilter === 'All' || r.station === stationFilter);
  });

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
      <div className="station-filter" style={{ marginBottom:16 }}>
        {['All', ...STATIONS].map(st => (
          <button key={st} className={`station-pill ${stationFilter===st?'active':''}`}
            style={stationFilter===st && st!=='All' ? { background: STATION_COLORS[st]||'#888', color:'#000', borderColor: STATION_COLORS[st]||'#888' } : {}}
            onClick={() => setStationFilter(st)}>{st}</button>
        ))}
      </div>
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

  useEffect(() => { if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission(); }, []);

  const isAdmin = userRole === 'admin' || userRole === 'superadmin';

  return (
    <div className="app">
      <style>{CSS}</style>
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

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Syne:wght@600;700;800&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  :root{--bg:#111111;--surface:#1A1A1A;--surface2:#222222;--border:#333333;--text:#F0F0E8;--text-muted:#777;--accent:#F97316;--font-display:'Syne',sans-serif;--font-mono:'DM Mono',monospace;--radius:10px}
  html,body{height:100%;background:var(--bg);color:var(--text);font-family:var(--font-mono)}
  .app{min-height:100vh;display:flex;justify-content:center;background:var(--bg)}
  .app-inner{width:100%;max-width:430px;min-height:100vh;display:flex;flex-direction:column}
  .app-header{padding:18px 20px 12px;border-bottom:1px solid var(--border);background:var(--bg);position:sticky;top:0;z-index:10;display:flex;align-items:center;justify-content:space-between}
  .logout-btn{background:none;border:none;color:var(--text-muted);font-size:18px;cursor:pointer;padding:4px 6px;border-radius:6px;transition:color 0.15s}
  .logout-btn:hover{color:#EF4444}
  .admin-btn{background:transparent;border:1px solid var(--border);color:var(--text-muted);font-family:var(--font-mono);font-size:11px;padding:5px 10px;border-radius:6px;cursor:pointer;transition:all 0.15s;text-transform:uppercase;letter-spacing:0.5px}
  .admin-btn:hover{border-color:var(--accent);color:var(--accent)}
  .app-logo{font-family:var(--font-display);font-size:22px;font-weight:800;letter-spacing:-1px}
  .logo-dot{color:var(--accent)}
  .app-main{flex:1;overflow-y:auto;padding-bottom:80px}
  .screen{padding:20px}
  .screen-header{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:16px}
  .screen-title{font-family:var(--font-display);font-size:28px;font-weight:700;line-height:1}
  .screen-sub{font-size:11px;color:var(--text-muted);margin-top:4px;text-transform:uppercase;letter-spacing:0.5px}
  .station-filter{display:flex;gap:6px;overflow-x:auto;padding-bottom:4px;margin-bottom:16px;scrollbar-width:none}
  .station-filter::-webkit-scrollbar{display:none}
  .station-pill{background:transparent;border:1px solid var(--border);color:var(--text-muted);font-family:var(--font-mono);font-size:11px;padding:5px 10px;border-radius:20px;cursor:pointer;white-space:nowrap;transition:all 0.15s;flex-shrink:0}
  .station-pill.active{border-color:var(--accent);color:var(--accent)}
  .item-station{font-size:10px;font-weight:600;padding:2px 6px;border-radius:4px;color:#000;font-family:var(--font-display);letter-spacing:0.3px;flex-shrink:0}
  .next-shift-banner{width:100%;background:rgba(249,115,22,0.08);border:1px solid rgba(249,115,22,0.3);border-radius:var(--radius);padding:10px 14px;display:flex;justify-content:space-between;align-items:center;cursor:pointer;color:var(--accent);font-family:var(--font-mono);font-size:13px;margin-bottom:8px;transition:background 0.15s}
  .next-shift-panel{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:12px;margin-bottom:16px}
  .progress-ring{position:relative;width:48px;height:48px}
  .progress-ring svg{width:48px;height:48px}
  .ring-pct{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:500;color:var(--accent)}
  .report-trigger{background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:8px 10px;cursor:pointer;font-size:16px;transition:border-color 0.15s}
  .report-trigger:hover{border-color:var(--accent)}
  .empty-state{text-align:center;padding:48px 20px}
  .empty-icon{font-size:36px;margin-bottom:12px}
  .empty-title{font-family:var(--font-display);font-size:16px;font-weight:600;color:var(--text-muted)}
  .empty-sub{font-size:12px;color:var(--text-muted);margin-top:6px}
  .section{margin-bottom:24px}
  .section-header{display:flex;align-items:center;gap:8px;padding:0 0 10px;border-bottom:1px solid var(--border);margin-bottom:2px}
  .section-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
  .section-name{font-family:var(--font-display);font-size:14px;font-weight:600;flex:1;text-transform:uppercase;letter-spacing:0.5px}
  .section-count{font-size:11px;color:var(--text-muted)}
  .check-item{display:flex;align-items:center;gap:10px;padding:12px 8px;border-bottom:1px solid var(--border);transition:background 0.15s;flex-wrap:wrap;border-radius:4px}
  .check-item:hover{background:var(--surface)}
  .check-item.done{opacity:0.4}
  .check-item.done .item-text{text-decoration:line-through;color:var(--text-muted)}
  .check-btn{width:28px;height:28px;border-radius:6px;border:1.5px solid var(--border);background:transparent;cursor:pointer;flex-shrink:0;display:flex;align-items:center;justify-content:center;transition:border-color 0.15s}
  .check-btn:hover{border-color:var(--accent)}
  .check-inner{display:flex;align-items:center;justify-content:center}
  .item-body{flex:1;min-width:0;display:flex;align-items:center;gap:6px;flex-wrap:wrap}
  .item-text{font-size:14px;line-height:1.3}
  .item-amount{font-size:11px;color:var(--accent);background:rgba(249,115,22,0.1);padding:2px 6px;border-radius:4px}
  .item-actions{display:flex;gap:4px}
  .action-btn{background:transparent;border:none;cursor:pointer;padding:4px 6px;border-radius:4px;color:var(--text-muted);font-size:14px;transition:color 0.15s,background 0.15s}
  .action-btn:hover{color:var(--text);background:var(--surface2)}
  .action-btn.del:hover{color:#EF4444}
  .action-btn.defer:hover{color:var(--accent)}
  .timer-row{width:100%;display:flex;align-items:center;gap:6px;padding:8px 0 0 38px}
  .timer-input{width:56px;background:var(--surface2);border:1px solid var(--border);color:var(--text);font-family:var(--font-mono);font-size:13px;padding:4px 8px;border-radius:6px;text-align:center}
  .timer-unit{font-size:12px;color:var(--text-muted)}
  .timer-go{background:var(--accent);color:#fff;border:none;padding:4px 10px;border-radius:6px;font-family:var(--font-display);font-size:12px;font-weight:700;cursor:pointer}
  .timer-badge{font-size:11px;color:var(--accent)}
  .timer-badge.done{color:#10B981}
  .add-row{display:flex;gap:6px;margin-top:8px}
  .add-station-select{background:var(--surface2);border:1px solid var(--border);color:var(--text-muted);font-family:var(--font-mono);font-size:11px;padding:0 6px;border-radius:var(--radius);max-width:70px}
  .add-input{flex:1;background:var(--surface2);border:1px solid var(--border);color:var(--text);font-family:var(--font-mono);font-size:13px;padding:10px 12px;border-radius:var(--radius);outline:none}
  .add-input:focus{border-color:var(--accent)}
  .add-confirm{background:var(--accent);color:#fff;border:none;width:40px;border-radius:var(--radius);font-size:20px;cursor:pointer;font-weight:300}
  .add-task-btn{background:none;border:1px dashed var(--border);color:var(--text-muted);font-family:var(--font-mono);font-size:12px;padding:8px 12px;border-radius:var(--radius);cursor:pointer;margin-top:6px;width:100%;transition:border-color 0.15s,color 0.15s}
  .add-task-btn:hover{border-color:var(--accent);color:var(--accent)}
  .tpl-picker{display:flex;flex-wrap:wrap;gap:8px;padding:12px 0 4px}
  .fab-area{display:flex;flex-wrap:wrap;gap:8px;margin-top:24px}
  .tpl-chip{background:transparent;border:1px solid;padding:8px 14px;border-radius:20px;font-family:var(--font-mono);font-size:12px;cursor:pointer;transition:background 0.15s}
  .tpl-chip:hover{background:rgba(255,255,255,0.05)}
  .tpl-chip.plain{border-color:var(--border);color:var(--text-muted)}
  .reset-btn{background:none;border:1px solid #EF444455;color:#EF4444;padding:8px 14px;border-radius:20px;font-family:var(--font-mono);font-size:12px;cursor:pointer;margin-left:auto}
  .inline-input-row{display:flex;gap:6px;align-items:center;flex:1}
  .confirm-row{display:flex;align-items:center;gap:8px;padding:6px 10px;background:rgba(239,68,68,0.06);border:1px solid rgba(239,68,68,0.2);border-radius:20px;margin-left:auto}
  .confirm-text{font-size:12px;color:#EF4444}
  .confirm-yes{background:#EF4444;color:#fff;border:none;padding:4px 10px;border-radius:6px;font-family:var(--font-mono);font-size:11px;cursor:pointer}
  .confirm-no{background:transparent;border:none;color:var(--text-muted);font-family:var(--font-mono);font-size:11px;cursor:pointer;padding:4px 6px}
  .timer-bar{position:fixed;bottom:70px;left:50%;transform:translateX(-50%);max-width:400px;width:calc(100% - 40px);background:#1A1A1A;border:1px solid var(--accent);border-radius:10px;padding:10px 14px;display:flex;gap:12px;flex-wrap:wrap;z-index:20}
  .timer-chip{font-size:12px;color:var(--accent)}
  .search-input{width:100%;background:var(--surface);border:1px solid var(--border);color:var(--text);font-family:var(--font-mono);font-size:13px;padding:10px 14px;border-radius:var(--radius);margin-bottom:12px;outline:none}
  .search-input:focus{border-color:var(--accent)}
  .recipe-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
  .recipe-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:0;cursor:pointer;text-align:left;overflow:hidden;transition:border-color 0.15s,transform 0.1s}
  .recipe-card:hover{border-color:var(--accent);transform:translateY(-1px)}
  .recipe-card-station{font-size:10px;font-weight:600;padding:4px 10px;color:#000;font-family:var(--font-display);letter-spacing:0.5px}
  .recipe-card-name{font-family:var(--font-display);font-size:15px;font-weight:700;padding:10px 10px 4px}
  .recipe-card-meta{font-size:11px;color:var(--text-muted);padding:0 10px 10px}
  .recipe-detail{padding-top:4px}
  .recipe-station-badge{display:inline-block;font-size:10px;font-weight:700;font-family:var(--font-display);padding:3px 10px;border-radius:4px;color:#000;margin-bottom:8px}
  .recipe-title{font-family:var(--font-display);font-size:28px;font-weight:800;line-height:1.1;margin-bottom:20px}
  .multiplier-row{display:flex;align-items:center;gap:8px;margin-bottom:20px}
  .mult-label{font-size:12px;color:var(--text-muted);margin-right:4px}
  .mult-btn{background:var(--surface2);border:1px solid var(--border);color:var(--text-muted);font-family:var(--font-mono);font-size:13px;padding:6px 12px;border-radius:6px;cursor:pointer;transition:all 0.15s}
  .mult-btn.active{background:var(--accent);border-color:var(--accent);color:#fff}
  .ingredients-list{margin-bottom:24px}
  .ing-row{display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border)}
  .ing-name{font-size:14px}
  .ing-amount{font-size:13px;color:var(--accent);font-weight:500}
  .step-row{display:flex;gap:14px;margin-bottom:14px}
  .step-num{width:24px;height:24px;border-radius:50%;background:var(--surface2);display:flex;align-items:center;justify-content:center;font-size:11px;color:var(--accent);flex-shrink:0;margin-top:1px}
  .step-text{font-size:13px;line-height:1.6;color:#B0B0A8;flex:1}
  .back-btn{background:none;border:none;color:var(--text-muted);font-family:var(--font-mono);font-size:13px;cursor:pointer;padding:0}
  .back-btn:hover{color:var(--text)}
  .fab-btn{background:var(--accent);color:#fff;border:none;width:36px;height:36px;border-radius:10px;font-size:22px;font-weight:300;cursor:pointer;display:flex;align-items:center;justify-content:center}
  .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.8);display:flex;align-items:flex-end;z-index:100}
  .modal{background:#161616;border-top:1px solid var(--border);border-radius:16px 16px 0 0;padding:20px;width:100%;max-height:85vh;overflow-y:auto;display:flex;flex-direction:column;gap:10px}
  .modal-header{display:flex;justify-content:space-between;align-items:center;font-family:var(--font-display);font-size:18px;font-weight:700;margin-bottom:4px}
  .form-input{background:var(--surface2);border:1px solid var(--border);color:var(--text);font-family:var(--font-mono);font-size:13px;padding:10px 12px;border-radius:var(--radius);width:100%;outline:none;resize:none}
  .form-input:focus{border-color:var(--accent)}
  .form-label{font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin-top:4px;display:flex;align-items:center;justify-content:space-between}
  .date-switcher{display:flex;gap:4px;overflow-x:auto;padding-bottom:4px;margin-bottom:12px;scrollbar-width:none}
  .date-switcher::-webkit-scrollbar{display:none}
  .date-pill{background:transparent;border:1px solid var(--border);color:var(--text-muted);font-family:var(--font-mono);font-size:11px;padding:4px 10px;border-radius:20px;cursor:pointer;white-space:nowrap;flex-shrink:0;transition:all 0.15s}
  .date-pill.active{border-color:var(--accent);color:var(--accent);background:rgba(249,115,22,0.08)}
  .ing-form-row{display:flex;gap:6px}
  .flex1{flex:1}.flex2{flex:2}
  .save-btn{background:var(--accent);color:#fff;border:none;padding:14px;border-radius:var(--radius);font-family:var(--font-display);font-size:15px;font-weight:700;cursor:pointer;margin-top:8px;transition:opacity 0.15s}
  .save-btn:hover{opacity:0.9}
  .save-btn:disabled{opacity:0.5;cursor:not-allowed}
  .report-modal{gap:12px}
  .report-summary{background:var(--surface2);border-radius:var(--radius);padding:16px;text-align:center}
  .report-pct{font-family:var(--font-display);font-size:48px;font-weight:800;color:var(--accent);line-height:1}
  .report-sub{font-size:12px;color:var(--text-muted);margin-top:4px}
  .report-sections{display:flex;flex-direction:column;gap:8px}
  .report-sec-row{display:flex;align-items:center;gap:8px}
  .report-sec-name{font-size:12px;width:80px;flex-shrink:0}
  .report-sec-bar{flex:1;height:4px;background:var(--surface2);border-radius:2px;overflow:hidden}
  .report-sec-fill{height:100%;border-radius:2px;transition:width 0.4s}
  .report-sec-count{font-size:11px;color:var(--text-muted);width:32px;text-align:right}
  .report-next{background:rgba(249,115,22,0.06);border:1px solid rgba(249,115,22,0.2);border-radius:var(--radius);padding:12px}
  .report-next-label{font-size:11px;color:var(--accent);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px}
  .report-next-item{display:flex;align-items:center;gap:8px;padding:5px 0;font-size:13px;border-bottom:1px solid rgba(255,255,255,0.04)}
  .report-divider{height:1px;background:var(--border);margin:4px 0}
  .report-sent{color:#10B981;font-size:14px;text-align:center;padding:12px}
  .report-error{color:#EF4444;font-size:12px}
  .link-btn{background:none;border:none;color:var(--accent);font-family:var(--font-mono);font-size:11px;cursor:pointer;padding:0;text-decoration:underline}
  .link-btn.small{display:block;margin-top:-4px;margin-bottom:4px}
  .tpl-list{display:flex;flex-direction:column;gap:8px}
  .tpl-card{display:flex;align-items:center;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);cursor:pointer;overflow:hidden;text-align:left;transition:border-color 0.15s}
  .tpl-card:hover{border-color:var(--accent)}
  .tpl-card-bar{width:4px;align-self:stretch;flex-shrink:0}
  .tpl-card-body{flex:1;padding:14px 12px}
  .tpl-card-name{font-family:var(--font-display);font-size:16px;font-weight:700}
  .tpl-card-meta{font-size:11px;color:var(--text-muted);margin-top:3px}
  .tpl-arrow{font-size:16px;color:var(--text-muted);padding-right:14px}
  .bottom-nav{position:fixed;bottom:0;left:50%;transform:translateX(-50%);width:100%;max-width:430px;background:rgba(12,12,12,0.95);border-top:1px solid var(--border);display:flex;height:64px;backdrop-filter:blur(12px)}
  .nav-btn{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;background:none;border:none;cursor:pointer;color:var(--text-muted);transition:color 0.15s}
  .nav-btn.active{color:var(--accent)}
  .nav-icon{font-size:18px;line-height:1}
  .nav-label{font-family:var(--font-display);font-size:10px;font-weight:600;letter-spacing:0.3px;text-transform:uppercase}
  .lineup-station{margin-bottom:20px}
  .lineup-station-header{display:flex;align-items:center;gap:8px;padding:0 0 10px;border-bottom:1px solid var(--border);margin-bottom:8px}
  .lineup-station-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
  .lineup-station-name{font-family:var(--font-display);font-size:14px;font-weight:700;flex:1;text-transform:uppercase;letter-spacing:0.5px}
  .lineup-station-count{font-size:11px;color:var(--text-muted);background:var(--surface2);padding:2px 8px;border-radius:10px}
  .lineup-cook{display:flex;align-items:center;gap:12px;padding:10px 8px;border-bottom:1px solid var(--border)}
  .lineup-avatar{width:36px;height:36px;border-radius:50%;background:var(--accent);color:#fff;display:flex;align-items:center;justify-content:center;font-family:var(--font-display);font-size:15px;font-weight:700;flex-shrink:0}
  .lineup-info{flex:1}
  .lineup-name{font-size:14px;font-weight:500}
  .lineup-role{font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.3px;margin-top:2px}
`;
