import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase, signOut, subscribePush } from "./lib/supabase.js";
import { ROLE_COLORS, ROLE_LABELS } from "./lib/constants.js";
import "./Admin.css";
import { ToastContext, ToastContainer } from "./admin/components/Toast.jsx";
import { Avatar } from "./admin/components/Avatar.jsx";
import { PeopleTab } from "./admin/tabs/PeopleTab.jsx";
import { TasksTab } from "./admin/tabs/TasksTab.jsx";
import { RecipesTab } from "./admin/tabs/RecipesTab.jsx";
import { ReportsTab } from "./admin/tabs/ReportsTab.jsx";
import { PushTab } from "./admin/tabs/PushTab.jsx";
import { VelocityTab } from "./admin/tabs/VelocityTab.jsx";
import { ImprovementsTab } from "./admin/tabs/ImprovementsTab.jsx";
import { RotaTab } from "./admin/tabs/RotaTab.jsx";

export default function Admin() {
  const [tab, setTab] = useState('people');
  const [me, setMe] = useState(null);
  const navigate = useNavigate();
  const [toasts, setToasts] = useState([]);
  const showToast = (msg, type = "info") => {
    const id = Math.random().toString(36).slice(2);
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  };

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from('profiles').select('name,role').eq('id', user.id).single()
        .then(({ data }) => { if (data) setMe(data); });
    });
    if ('Notification' in window) {
      if (Notification.permission === 'granted') subscribePush();
      else if (Notification.permission === 'default')
        Notification.requestPermission().then(p => { if (p === 'granted') subscribePush(); });
    }
  }, []);

  const TABS = [
    { id:'people',   label:'People',   icon:'👥' },
    { id:'tasks',    label:'Tasks',    icon:'✓'  },
    { id:'recipes',  label:'Recipes',  icon:'⚗'  },
    { id:'reports',  label:'Reports',  icon:'📊' },
    { id:'velocity',     label:'Velocity',  icon:'📈' },
    { id:'improvements', label:'Wins',      icon:'✓'  },
    { id:'rota',     label:'Schedule',  icon:'📅' },
    { id:'push',     label:'Notify',   icon:'🔔' },
  ];

  return (
    <ToastContext.Provider value={{ show: showToast }}>
    <div className="admin-app">
      <ToastContainer toasts={toasts} />
      <aside className="sidebar">
        <div className="sidebar-logo">
          <span style={{ cursor:'pointer' }} onClick={() => navigate('/')}>mis<span style={{ color:'#F97316' }}>.</span></span>
          <span className="sidebar-role">Admin</span>
        </div>
        <nav className="sidebar-nav">
          {TABS.map(t => (
            <button key={t.id} className={`nav-item ${tab===t.id?'active':''}`} onClick={() => setTab(t.id)}>
              <span className="nav-item-icon">{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <Avatar name={me?.name || '?'} size={32}/>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:12, fontWeight:600 }}>{me?.name || '…'}</div>
            <div style={{ fontSize:10, color: ROLE_COLORS[me?.role] || 'var(--text-muted)' }}>{ROLE_LABELS[me?.role] || ''}</div>
          </div>
          <button onClick={() => signOut()} title="Sign out" style={{ background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', padding:'4px 6px', borderRadius:6, display:'flex', alignItems:'center' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        </div>
      </aside>

      <main className="admin-main">
        <div className="admin-header">
          <div>
            <h1 className="admin-title">{TABS.find(t=>t.id===tab)?.label}</h1>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div className="live-badge">● Live</div>
            <div style={{ fontSize:11, color:'var(--text-muted)' }}>{new Date().toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})}</div>
            <button onClick={() => navigate('/')} style={{ background:'none', border:'1px solid var(--border)', color:'var(--text-muted)', fontSize:12, cursor:'pointer', padding:'4px 10px', borderRadius:6, fontFamily:'var(--font-mono)' }}>← App</button>
          </div>
        </div>

        {tab === 'people'   && <PeopleTab/>}
        {tab === 'tasks'    && <TasksTab/>}
        {tab === 'recipes'  && <RecipesTab/>}
        {tab === 'reports'  && <ReportsTab/>}
        {tab === 'velocity'     && <VelocityTab/>}
        {tab === 'improvements' && <ImprovementsTab/>}
        {tab === 'rota'     && <RotaTab/>}
        {tab === 'push'     && <PushTab/>}
      </main>

      <nav className="admin-bottom-nav">
        {TABS.map(t => (
          <button key={t.id} className={`admin-bottom-nav-item ${tab===t.id?'active':''}`} onClick={() => setTab(t.id)}>
            <span className="admin-bottom-nav-icon">{t.icon}</span>
            <span className="admin-bottom-nav-label">{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
    </ToastContext.Provider>
  );
}
