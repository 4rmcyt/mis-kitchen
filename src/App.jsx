import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { signOut, subscribePush } from "./lib/supabase.js";
import "./App.css";
import { TodayScreen } from "./screens/TodayScreen.jsx";
import { RecipesScreen } from "./screens/RecipesScreen.jsx";
import { LineupScreen } from "./screens/LineupScreen.jsx";

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
            <button className="logout-btn" onClick={() => signOut()} title="Sign out">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </button>
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
