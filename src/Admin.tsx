import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase, signOut } from "./lib/supabase.js";
import { ROLE_COLORS, ROLE_LABELS } from "./lib/constants.js";
import "./Admin.css";
import { ToastContext, ToastContainer } from "./admin/components/Toast.js";
import { Avatar } from "./admin/components/Avatar.js";
import { PeopleTab } from "./admin/tabs/PeopleTab.js";
import { TasksTab } from "./admin/tabs/TasksTab.js";
import { RecipesTab } from "./admin/tabs/RecipesTab.js";
import { ReportsTab } from "./admin/tabs/ReportsTab.js";
import { PushTab } from "./admin/tabs/PushTab.js";
import { VelocityTab } from "./admin/tabs/VelocityTab.js";
import { ImprovementsTab } from "./admin/tabs/ImprovementsTab.js";
import { RotaTab } from "./admin/tabs/RotaTab.js";
import type { Role } from "./lib/types.js";

interface Me {
  name: string | null;
  role: Role;
}

interface Toast {
  id: string;
  msg: string;
  type: string;
}

export default function Admin() {
  const [tab, setTab] = useState('people');
  const [me, setMe] = useState<Me | null>(null);
  const navigate = useNavigate();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const showToast = (msg: string, type = "info") => {
    const id = Math.random().toString(36).slice(2);
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  };

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate('/'); return; }
      const { data } = await supabase.from('profiles').select('name,role').eq('id', user.id).single();
      if (!data || (data.role !== 'admin' && data.role !== 'superadmin')) { navigate('/'); return; }
      setMe(data as Me);
    })();
  }, []);

  const TABS = [
    { id:'people',       label:'People',   icon:'👥' },
    { id:'tasks',        label:'Tasks',    icon:'✓'  },
    { id:'recipes',      label:'Recipes',  icon:'⚗'  },
    { id:'reports',      label:'Reports',  icon:'📊' },
    { id:'velocity',     label:'Velocity', icon:'📈' },
    { id:'improvements', label:'Wins',     icon:'✓'  },
    { id:'rota',         label:'Schedule', icon:'📅' },
    { id:'push',         label:'Push',     icon:'🔔' },
  ];

  return (
    <ToastContext.Provider value={{ show: showToast }}>
    <div className="admin-app">
      <ToastContainer toasts={toasts} />
      <aside className="sidebar">
        <div className="sidebar-logo">
          <span className="sidebar-logo-link" onClick={() => navigate('/')}>mis<span className="sidebar-logo-dot">.</span></span>
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
          <div className="sidebar-footer-info">
            <div className="sidebar-footer-name">{me?.name || '…'}</div>
            <div className="sidebar-footer-role" style={{ color: me?.role ? ROLE_COLORS[me.role] : 'var(--text-muted)' }}>{me?.role ? ROLE_LABELS[me.role] : ''}</div>
          </div>
          <button onClick={() => signOut()} title="Sign out" className="sidebar-signout">
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
          <div className="admin-header-right">
            <div className="live-badge">● Live</div>
            <div className="admin-header-date">{new Date().toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})}</div>
            <button onClick={() => navigate('/')} className="btn-app-link">← App</button>
          </div>
        </div>

        {tab === 'people'       && <PeopleTab/>}
        {tab === 'tasks'        && <TasksTab/>}
        {tab === 'recipes'      && <RecipesTab/>}
        {tab === 'reports'      && <ReportsTab/>}
        {tab === 'velocity'     && <VelocityTab/>}
        {tab === 'improvements' && <ImprovementsTab/>}
        {tab === 'rota'         && <RotaTab/>}
        {tab === 'push'         && <PushTab/>}
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
