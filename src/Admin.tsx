import { useState, useEffect, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { signOut } from "./lib/supabase.js";
import { getCurrentProfile } from "./lib/client.js";
import { ROLE_COLORS, ROLE_LABELS } from "./lib/constants.js";
import "./Admin.css";
import { ToastContext, ToastContainer } from "./admin/components/Toast.js";
import { Avatar } from "./admin/components/Avatar.js";
import type { Role } from "./lib/types.js";

const PeopleTab       = lazy(() => import("./admin/tabs/PeopleTab.js").then(m => ({ default: m.PeopleTab })))
const TasksTab        = lazy(() => import("./admin/tabs/TasksTab.js").then(m => ({ default: m.TasksTab })))
const RecipesTab      = lazy(() => import("./admin/tabs/RecipesTab.js").then(m => ({ default: m.RecipesTab })))
const ReportsTab      = lazy(() => import("./admin/tabs/ReportsTab.js").then(m => ({ default: m.ReportsTab })))
const PushTab         = lazy(() => import("./admin/tabs/PushTab.js").then(m => ({ default: m.PushTab })))
const VelocityTab     = lazy(() => import("./admin/tabs/VelocityTab.js").then(m => ({ default: m.VelocityTab })))
const ImprovementsTab = lazy(() => import("./admin/tabs/ImprovementsTab.js").then(m => ({ default: m.ImprovementsTab })))
const RotaTab         = lazy(() => import("./admin/tabs/RotaTab.js").then(m => ({ default: m.RotaTab })))
const PrepBoardTab    = lazy(() => import("./admin/tabs/PrepBoardTab.js").then(m => ({ default: m.PrepBoardTab })))
const PrepItemsTab    = lazy(() => import("./admin/tabs/PrepItemsTab.js").then(m => ({ default: m.PrepItemsTab })))

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
    getCurrentProfile()
      .then(profile => {
        if (profile.role !== 'admin' && profile.role !== 'superadmin') { navigate('/'); return; }
        setMe({ name: profile.name, role: profile.role });
      })
      .catch(() => navigate('/'));
  }, []);

  const TABS = [
    { id:'people',       label:'People',     icon:'👥' },
    { id:'prep',         label:'Prep',       icon:'📋' },
    { id:'prep-items',   label:'Prep Items', icon:'🗂'  },
    { id:'tasks',        label:'Tasks',      icon:'✓'  },
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

        <Suspense fallback={<div className="loading-msg">Loading…</div>}>
          {tab === 'people'       && <PeopleTab/>}
          {tab === 'prep'         && <PrepBoardTab/>}
          {tab === 'prep-items'   && <PrepItemsTab/>}
          {tab === 'tasks'        && <TasksTab/>}
          {tab === 'recipes'      && <RecipesTab/>}
          {tab === 'reports'      && <ReportsTab/>}
          {tab === 'velocity'     && <VelocityTab/>}
          {tab === 'improvements' && <ImprovementsTab/>}
          {tab === 'rota'         && <RotaTab/>}
          {tab === 'push'         && <PushTab/>}
        </Suspense>
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
