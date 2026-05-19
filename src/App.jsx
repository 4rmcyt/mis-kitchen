import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getRestaurantProfiles, signOut, getTemplates, createTemplate, updateTemplate, deleteTemplate } from "./lib/supabase.js";

const STATIONS = ["Common", "Cold", "Rolls", "Hot", "Grill", "Tandoor"];
const STATION_COLORS = {
  Cold: "#22D3EE", Rolls: "#A78BFA", Hot: "#F97316",
  Grill: "#EF4444", Tandoor: "#F59E0B", Default: "#6B7280"
};

const save = (key, val) => { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} };
const load = (key, fallback) => { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; } };

const DEFAULT_TEMPLATES = [
  { id: "t1", name: "Opening", color: "#F97316", station: "Common", items: [
    { id: "ti1", text: "Check fridge temps", done: false, station: "Common" },
    { id: "ti2", text: "Pull proteins from walk-in", done: false, station: "Common" },
    { id: "ti3", text: "Clarify butter 500g", done: false, amount: "500g", station: "Common" },
    { id: "ti4", text: "Mise en place — cold section", done: false, station: "Common" },
    { id: "ti5", text: "Stock check", done: false, station: "Common" },
  ]},
  { id: "t2", name: "Closing", color: "#6366F1", station: "Common", items: [
    { id: "tc1", text: "Wrap and label all preps", done: false, station: "Common" },
    { id: "tc2", text: "Cool stocks, log temp", done: false, station: "Common" },
    { id: "tc3", text: "Clean grill and flat top", done: false, station: "Common" },
    { id: "tc4", text: "Sweep station", done: false, station: "Common" },
    { id: "tc5", text: "Fridge doors sealed", done: false, station: "Common" },
  ]},
  { id: "t3", name: "Opening", color: "#22D3EE", station: "Cold", items: [
    { id: "co1",  text: "Raita — 4pc",                  done: false, station: "Cold" },
    { id: "co2",  text: "Tamarind — 4pc",               done: false, station: "Cold" },
    { id: "co3",  text: "Sweet Yogurt — 4pc",           done: false, station: "Cold" },
    { id: "co4",  text: "Hari Chutney — 2pc",           done: false, station: "Cold" },
    { id: "co5",  text: "Mint Vinaigrette — 2pc",       done: false, station: "Cold" },
    { id: "co6",  text: "Tomatoes Big — 1 big tray",    done: false, station: "Cold" },
    { id: "co7",  text: "Tomatoes Small — 1 big tray",  done: false, station: "Cold" },
    { id: "co8",  text: "Potatoes Boiled — 2 trays",    done: false, station: "Cold" },
    { id: "co9",  text: "Cilantro chopped — 1 box",     done: false, station: "Cold" },
    { id: "co10", text: "Onion Diced — 1 box",          done: false, station: "Cold" },
    { id: "co11", text: "Onion Sliced — 1 box",         done: false, station: "Cold" },
    { id: "co12", text: "Mishti Doi — 1 box",           done: false, station: "Cold" },
    { id: "co13", text: "Oranges — 1 big tray",         done: false, station: "Cold" },
    { id: "co14", text: "Pomegranate — 1 big tray",     done: false, station: "Cold" },
    { id: "co15", text: "Microgreens — 3 box",          done: false, station: "Cold" },
    { id: "co16", text: "Pomegranate — 1 small tray (up)", done: false, station: "Cold" },
    { id: "co17", text: "Oranges Sliced Peeled — min 1/3 small tray (up)", done: false, station: "Cold" },
    { id: "co18", text: "Banana Leafs — min 1/3 small tray (up)", done: false, station: "Cold" },
    { id: "co19", text: "Peaches Grilled — min 1/3 small tray (up)", done: false, station: "Cold" },
  ]},
  { id: "t4", name: "Closing", color: "#0891B2", station: "Cold", items: [
    { id: "cc1",  text: "Raita — wrapped & labelled",                    done: false, station: "Cold" },
    { id: "cc2",  text: "Tamarind — wrapped & labelled",                 done: false, station: "Cold" },
    { id: "cc3",  text: "Sweet Yogurt — wrapped & labelled",             done: false, station: "Cold" },
    { id: "cc4",  text: "Hari Chutney — wrapped & labelled",             done: false, station: "Cold" },
    { id: "cc5",  text: "Mint Vinaigrette — wrapped & labelled",         done: false, station: "Cold" },
    { id: "cc6",  text: "Tomatoes Big — put away",                       done: false, station: "Cold" },
    { id: "cc7",  text: "Tomatoes Small — put away",                     done: false, station: "Cold" },
    { id: "cc8",  text: "Potatoes Boiled — wrapped & put away",          done: false, station: "Cold" },
    { id: "cc9",  text: "Cilantro chopped — wrapped & put away",         done: false, station: "Cold" },
    { id: "cc10", text: "Onion Diced — wrapped & put away",              done: false, station: "Cold" },
    { id: "cc11", text: "Onion Sliced — wrapped & put away",             done: false, station: "Cold" },
    { id: "cc12", text: "Mishti Doi — wrapped & labelled",               done: false, station: "Cold" },
    { id: "cc13", text: "Oranges — wrapped & put away",                  done: false, station: "Cold" },
    { id: "cc14", text: "Pomegranate — wrapped & put away",              done: false, station: "Cold" },
    { id: "cc15", text: "Microgreens — wrapped & put away",              done: false, station: "Cold" },
    { id: "cc16", text: "Pomegranate (up) — put away",                   done: false, station: "Cold" },
    { id: "cc17", text: "Oranges Sliced Peeled (up) — put away",         done: false, station: "Cold" },
    { id: "cc18", text: "Banana Leafs (up) — put away",                  done: false, station: "Cold" },
    { id: "cc19", text: "Peaches Grilled (up) — put away",               done: false, station: "Cold" },
  ]},
  { id: "t5", name: "Opening", color: "#EF4444", station: "Grill", items: [
    { id: "go1",  text: "Cabbage Seared — 2 big tray (up)",              done: false, station: "Grill" },
    { id: "go2",  text: "Kale Chopped — 2 big tray (up)",                done: false, station: "Grill" },
    { id: "go3",  text: "Cilantro Stem Chopped — min 1/3 small tray (up)", done: false, station: "Grill" },
    { id: "go4",  text: "Onion Chopped — 1 small tray (up)",             done: false, station: "Grill" },
    { id: "go5",  text: "Garlic Chopped — 1 medium tray (up)",           done: false, station: "Grill" },
    { id: "go6",  text: "Ginger Cubes Chopped — 1 small tray (up)",      done: false, station: "Grill" },
    { id: "go7",  text: "Rogan Josh Lamb Sauce — 1 box (fridge)",        done: false, station: "Grill" },
    { id: "go8",  text: "Cabbage Sauce — 1 box (fridge)",                done: false, station: "Grill" },
    { id: "go9",  text: "Chicken Malai Sauce — 1 box (fridge)",          done: false, station: "Grill" },
    { id: "go10", text: "Demi-glace Sauce — 1 box (fridge)",             done: false, station: "Grill" },
    { id: "go11", text: "Steak Sous Vide — 1 pc (fridge)",               done: false, station: "Grill" },
    { id: "go12", text: "Chicken Malai — 1 pc (warming cabinet)",        done: false, station: "Grill" },
    { id: "go13", text: "Lamb Baked — 1 pc (warming cabinet)",           done: false, station: "Grill" },
  ]},
  { id: "t6", name: "Closing", color: "#B91C1C", station: "Grill", items: [
    { id: "gc1",  text: "Cabbage Seared — wrapped & put away",           done: false, station: "Grill" },
    { id: "gc2",  text: "Kale Chopped — wrapped & put away",             done: false, station: "Grill" },
    { id: "gc3",  text: "Cilantro Stem Chopped — wrapped & put away",    done: false, station: "Grill" },
    { id: "gc4",  text: "Onion Chopped — wrapped & put away",            done: false, station: "Grill" },
    { id: "gc5",  text: "Garlic Chopped — wrapped & put away",           done: false, station: "Grill" },
    { id: "gc6",  text: "Ginger Cubes Chopped — wrapped & put away",     done: false, station: "Grill" },
    { id: "gc7",  text: "Rogan Josh Lamb Sauce — wrapped & put away",    done: false, station: "Grill" },
    { id: "gc8",  text: "Cabbage Sauce — wrapped & put away",            done: false, station: "Grill" },
    { id: "gc9",  text: "Chicken Malai Sauce — wrapped & put away",      done: false, station: "Grill" },
    { id: "gc10", text: "Demi-glace Sauce — wrapped & put away",         done: false, station: "Grill" },
  ]}
];

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

function uid() { return Math.random().toString(36).slice(2, 9); }

function useTimer() {
  const [timers, setTimers] = useState({});
  const refs = useRef({});
  const start = (id, seconds) => {
    if (refs.current[id]) clearInterval(refs.current[id]);
    setTimers(t => ({ ...t, [id]: { remaining: seconds, running: true } }));
    refs.current[id] = setInterval(() => {
      setTimers(t => {
        const cur = t[id];
        if (!cur || cur.remaining <= 0) {
          clearInterval(refs.current[id]);
          if (Notification.permission === 'granted') new Notification('Mis — Timer done!', { icon: '/icons/icon-192.png' });
          return { ...t, [id]: { ...cur, running: false, done: true } };
        }
        return { ...t, [id]: { ...cur, remaining: cur.remaining - 1 } };
      });
    }, 1000);
  };
  const fmt = (s) => { if (!s && s !== 0) return null; return `${Math.floor(s/60)}:${(s%60).toString().padStart(2,'0')}`; };
  return { timers, start, fmt };
}

function CheckIcon() {
  return <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><polyline points="2,7 5.5,10.5 12,3" stroke="#F97316" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}

function CheckItem({ item, onToggle, onDelete, onDefer, timer, onStartTimer, fmt }) {
  const [showTimer, setShowTimer] = useState(false);
  const [mins, setMins] = useState("5");
  return (
    <div className={`check-item ${item.done ? 'done' : ''}`}>
      <button className="check-btn" onClick={() => onToggle(item.id)}>
        <span className="check-inner">{item.done && <CheckIcon />}</span>
      </button>
      <div className="item-body">
        <span className="item-text">{item.text}</span>
        {item.amount && <span className="item-amount">{item.amount}</span>}
        {timer?.running && <span className="timer-badge">⏱ {fmt(timer.remaining)}</span>}
        {timer?.done && <span className="timer-badge done">✓ done</span>}
      </div>
      <div className="item-actions">
        {!item.done && <>
          <button className="action-btn" onClick={() => setShowTimer(s => !s)} title="Timer">⏱</button>
          <button className="action-btn defer" onClick={() => onDefer(item.id)} title="Next shift">→</button>
        </>}
        <button className="action-btn del" onClick={() => onDelete(item.id)}>×</button>
      </div>
      {showTimer && !item.done && (
        <div className="timer-row">
          <input type="number" value={mins} onChange={e => setMins(e.target.value)} className="timer-input" min="1" max="999"/>
          <span className="timer-unit">min</span>
          <button className="timer-go" onClick={() => { onStartTimer(item.id, parseInt(mins)*60); setShowTimer(false); }}>GO</button>
        </div>
      )}
    </div>
  );
}

function ReportModal({ sections, nextShift, onClose }) {
  const [email, setEmail] = useState(() => load('mis_email', ''));
  const [apiKey, setApiKey] = useState(() => load('mis_resend_key', ''));
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [showKey, setShowKey] = useState(false);

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  const totalDone = sections.reduce((a,s) => a + s.items.filter(i => i.done).length, 0);
  const totalAll = sections.reduce((a,s) => a + s.items.length, 0);
  const pct = totalAll ? Math.round((totalDone/totalAll)*100) : 0;

  const openingSec = sections.find(s => s.name.toLowerCase() === 'opening');
  const closingSec = sections.find(s => s.name.toLowerCase() === 'closing');
  const openingDone = openingSec && openingSec.items.length > 0 && openingSec.items.every(i => i.done);
  const closingDone = closingSec && closingSec.items.length > 0 && closingSec.items.every(i => i.done);
  const canSend = openingDone && closingDone;

  const buildHTML = () => {
    const secs = sections.map(sec => {
      const done = sec.items.filter(i => i.done);
      const missed = sec.items.filter(i => !i.done);
      return `<div style="margin-bottom:20px">
        <div style="border-bottom:1px solid #252525;padding-bottom:8px;margin-bottom:10px;display:flex;gap:8px;align-items:center">
          <span style="width:8px;height:8px;border-radius:50%;background:${sec.color};display:inline-block"></span>
          <strong style="color:#e8e8e0;font-size:13px;text-transform:uppercase;letter-spacing:0.5px">${sec.name}</strong>
          <span style="color:#555;font-size:11px;margin-left:auto">${done.length}/${sec.items.length}</span>
        </div>
        ${done.map(i => `<div style="padding:5px 0;color:#666;font-size:13px">✓ ${i.text}</div>`).join('')}
        ${missed.map(i => `<div style="padding:5px 0;color:#ef4444;font-size:13px">✗ ${i.text}</div>`).join('')}
      </div>`;
    }).join('');
    const nextRows = nextShift.length > 0 ? `
      <div style="margin-top:20px;padding:14px;background:#1a1a1a;border-radius:8px;border:1px solid rgba(249,115,22,0.3)">
        <div style="color:#f97316;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px">→ Carried to next shift</div>
        ${nextShift.map(i => `<div style="padding:4px 0;color:#e8e8e0;font-size:13px">• ${i.text}</div>`).join('')}
      </div>` : '';
    return `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
    <body style="background:#0c0c0c;color:#e8e8e0;font-family:'Courier New',monospace;padding:32px;max-width:580px;margin:0 auto">
      <div style="margin-bottom:28px"><div style="font-size:26px;font-weight:800;letter-spacing:-1px">mis<span style="color:#f97316">.</span></div><div style="color:#555;font-size:11px;margin-top:3px;text-transform:uppercase;letter-spacing:0.5px">End of shift report</div></div>
      <div style="background:#141414;border-radius:10px;padding:18px;margin-bottom:24px;border:1px solid #252525">
        <div style="color:#555;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">${today}</div>
        <div style="font-size:42px;font-weight:700;color:#f97316;margin-top:6px;line-height:1">${pct}%</div>
        <div style="color:#888;font-size:13px;margin-top:4px">${totalDone} of ${totalAll} tasks completed</div>
      </div>
      ${secs}${nextRows}
      <div style="margin-top:28px;color:#333;font-size:10px;text-transform:uppercase;letter-spacing:0.5px">sent by mis — line cook app</div>
    </body></html>`;
  };

  const send = async () => {
    if (!email || !apiKey) { setError('Enter email and API key'); return; }
    setSending(true); setError('');
    save('mis_email', email); save('mis_resend_key', apiKey);
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: 'Mis App <onboarding@resend.dev>', to: [email], subject: `Shift report — ${today} (${pct}% done)`, html: buildHTML() })
      });
      if (res.ok) setSent(true);
      else { const d = await res.json(); setError(d.message || 'Send failed'); }
    } catch { setError('Network error'); }
    setSending(false);
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal report-modal">
        <div className="modal-header"><span>End of Shift Report</span><button className="action-btn del" onClick={onClose}>×</button></div>
        <div className="report-summary">
          <div className="report-pct">{pct}%</div>
          <div className="report-sub">{totalDone}/{totalAll} tasks · {today}</div>
        </div>
        <div className="report-sections">
          {sections.map(sec => {
            const done = sec.items.filter(i => i.done).length;
            const p = sec.items.length ? (done/sec.items.length)*100 : 0;
            return (
              <div key={sec.id} className="report-sec-row">
                <span className="section-dot" style={{ background: sec.color }}/>
                <span className="report-sec-name">{sec.name}</span>
                <div className="report-sec-bar"><div className="report-sec-fill" style={{ width: `${p}%`, background: sec.color }}/></div>
                <span className="report-sec-count">{done}/{sec.items.length}</span>
              </div>
            );
          })}
        </div>
        {nextShift.length > 0 && (
          <div className="report-next">
            <div className="report-next-label">→ Carried to next shift</div>
            {nextShift.map(i => (
              <div key={i.id} className="report-next-item">
                <span>{i.text}</span>
              </div>
            ))}
          </div>
        )}
        <div className="report-divider"/>
        {sent ? <div className="report-sent">✓ Report sent to {email}</div> : <>
          <div className="form-label">Email</div>
          <input className="form-input" type="email" placeholder="your@email.com" value={email} onChange={e => setEmail(e.target.value)}/>
          <div className="form-label"><span>Resend API Key</span><button className="link-btn" onClick={() => window.open('https://resend.com/api-keys','_blank')}>Get free key →</button></div>
          <input className="form-input" type={showKey?'text':'password'} placeholder="re_xxxxxxxxxxxx" value={apiKey} onChange={e => setApiKey(e.target.value)}/>
          <button className="link-btn small" onClick={() => setShowKey(s=>!s)}>{showKey?'Hide':'Show'} key</button>
          {!canSend && (
            <div className="report-error" style={{ background: '#1a1200', borderColor: '#F97316aa', color: '#F97316' }}>
              {!openingSec || !openingDone ? '✗ Opening not complete' : ''}
              {(!openingSec || !openingDone) && (!closingSec || !closingDone) ? ' · ' : ''}
              {!closingSec || !closingDone ? '✗ Closing not complete' : ''}
            </div>
          )}
          {error && <div className="report-error">{error}</div>}
          <button className="save-btn" onClick={send} disabled={sending || !canSend}>{sending ? 'Sending…' : 'Send Report'}</button>
        </>}
      </div>
    </div>
  );
}

function TodayScreen({ templates, userStation = 'Common' }) {
  const [sections, setSections] = useState(() => load('mis_today', []));
  const [nextShift, setNextShift] = useState(() => load('mis_next_shift', []));
  const [stationFilter, setStationFilter] = useState(userStation);
  const [activeSection, setActiveSection] = useState(null);
  const [newText, setNewText] = useState('');
  const [newStation, setNewStation] = useState('Common');
  const [showReport, setShowReport] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [showCustomSection, setShowCustomSection] = useState(false);
  const [customSectionName, setCustomSectionName] = useState('');
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const { timers, start, fmt } = useTimer();

  useEffect(() => { save('mis_today', sections); }, [sections]);
  useEffect(() => { save('mis_next_shift', nextShift); }, [nextShift]);
  useEffect(() => { setStationFilter(userStation); }, [userStation]);

  useEffect(() => {
    const carried = load('mis_carried', []);
    if (carried.length > 0) {
      setSections(s => s.find(x => x.id === 'carried') ? s : [{ id: 'carried', name: 'Carried Over', color: '#F97316', station: 'Common', items: carried }, ...s]);
      save('mis_carried', []);
    }
  }, []);

  const loadTemplate = (tpl) => {
    if (sections.find(s => s.templateId === tpl.id)) return;
    setSections(s => [...s, { id: uid(), templateId: tpl.id, name: tpl.name, color: tpl.color, station: tpl.station||'Common', items: tpl.items.map(i => ({ ...i, id: uid(), done: false })) }]);
  };

  const addItem = (secId) => {
    if (!newText.trim()) return;
    setSections(s => s.map(sec => sec.id === secId ? { ...sec, items: [...sec.items, { id: uid(), text: newText.trim(), done: false, station: newStation }] } : sec));
    setNewText(''); setActiveSection(null);
  };

  const toggleItem = (secId, itemId) => setSections(s => s.map(sec => sec.id === secId ? { ...sec, items: sec.items.map(i => i.id === itemId ? { ...i, done: !i.done } : i) } : sec));
  const deleteItem = (secId, itemId) => setSections(s => s.map(sec => sec.id === secId ? { ...sec, items: sec.items.filter(i => i.id !== itemId) } : sec));

  const deferItem = (secId, itemId) => {
    let deferred = null;
    setSections(s => s.map(sec => {
      if (sec.id !== secId) return sec;
      const item = sec.items.find(i => i.id === itemId);
      if (item) deferred = { ...item, id: uid(), done: false };
      return { ...sec, items: sec.items.filter(i => i.id !== itemId) };
    }));
    if (deferred) setNextShift(n => [...n, deferred]);
  };

  const totalDone = sections.reduce((a,s) => a + s.items.filter(i => i.done).length, 0);
  const totalAll = sections.reduce((a,s) => a + s.items.length, 0);
  const pct = totalAll ? Math.round((totalDone/totalAll)*100) : 0;
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

  const filteredSections = sections
    .map(sec => ({ ...sec, items: stationFilter === 'All' ? sec.items : sec.items.filter(i => (i.station||'Common') === stationFilter || (sec.station||'Common') === stationFilter) }))
    .filter(sec => stationFilter === 'All' || sec.items.length > 0);

  return (
    <div className="screen">
      <div className="screen-header">
        <div>
          <div className="screen-title">Today</div>
          <div className="screen-sub">{today}</div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <button className="report-trigger" onClick={() => setShowTemplatePicker(v => !v)} title="Add template">＋</button>
          {totalAll > 0 && <button className="report-trigger" onClick={() => setShowReport(true)}>📋</button>}
          {totalAll > 0 && (
            <div className="progress-ring">
              <svg viewBox="0 0 48 48">
                <circle cx="24" cy="24" r="20" fill="none" stroke="#1a1a1a" strokeWidth="4"/>
                <circle cx="24" cy="24" r="20" fill="none" stroke="#F97316" strokeWidth="4"
                  strokeDasharray={`${pct*1.257} 125.7`} strokeLinecap="round" transform="rotate(-90 24 24)"/>
              </svg>
              <span className="ring-pct">{pct}%</span>
            </div>
          )}
        </div>
      </div>

      <div className="station-filter">
        {['All', ...STATIONS].map(st => (
          <button key={st} className={`station-pill ${stationFilter===st?'active':''}`}
            style={stationFilter===st && st!=='All' ? { background: STATION_COLORS[st]||'#888', color:'#000', borderColor: STATION_COLORS[st]||'#888' } : {}}
            onClick={() => setStationFilter(st)}>{st}</button>
        ))}
      </div>

      {showTemplatePicker && (
        <div className="tpl-picker">
          {templates.map(tpl => (
            <button key={tpl.id} className="tpl-chip" style={{ borderColor: tpl.color, color: tpl.color }}
              onClick={() => { loadTemplate(tpl); setShowTemplatePicker(false); }}>
              + {tpl.name}
            </button>
          ))}
          {showCustomSection ? (
            <div className="inline-input-row">
              <input className="add-input" placeholder="Section name…" value={customSectionName} autoFocus
                onChange={e => setCustomSectionName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && customSectionName.trim()) {
                    setSections(s => [...s, { id: uid(), name: customSectionName.trim(), color: '#888', station: 'Common', items: [] }]);
                    setCustomSectionName(''); setShowCustomSection(false); setShowTemplatePicker(false);
                  }
                  if (e.key === 'Escape') { setCustomSectionName(''); setShowCustomSection(false); }
                }}/>
              <button className="add-confirm" onClick={() => {
                if (customSectionName.trim()) setSections(s => [...s, { id: uid(), name: customSectionName.trim(), color: '#888', station: 'Common', items: [] }]);
                setCustomSectionName(''); setShowCustomSection(false); setShowTemplatePicker(false);
              }}>+</button>
              <button className="action-btn" onClick={() => { setCustomSectionName(''); setShowCustomSection(false); }}>×</button>
            </div>
          ) : (
            <button className="tpl-chip plain" onClick={() => setShowCustomSection(true)}>+ Custom</button>
          )}
        </div>
      )}

      {nextShift.length > 0 && (
        <>
          <button className="next-shift-banner" onClick={() => setShowNext(s=>!s)}>
            <span>→ {nextShift.length} task{nextShift.length>1?'s':''} for next shift</span>
            <span>{showNext?'▲':'▼'}</span>
          </button>
          {showNext && (
            <div className="next-shift-panel">
              {nextShift.map(item => (
                <div key={item.id} className="check-item">
                  <div className="item-body">
                    <span className="item-text">{item.text}</span>
                  </div>
                  <button className="action-btn del" onClick={() => setNextShift(n => n.filter(i => i.id !== item.id))}>×</button>
                </div>
              ))}
              <button className="save-btn" style={{ marginTop:8 }} onClick={() => { save('mis_carried', nextShift); setNextShift([]); }}>
                Carry to next shift →
              </button>
            </div>
          )}
        </>
      )}

      {filteredSections.length === 0 && !nextShift.length && (
        <div className="empty-state"><div className="empty-icon">🔪</div><div className="empty-title">No tasks yet</div><div className="empty-sub">Load a template or add tasks manually</div></div>
      )}

      {filteredSections.map(sec => {
        const done = sec.items.filter(i => i.done).length;
        return (
          <div className="section" key={sec.id}>
            <div className="section-header">
              <div className="section-dot" style={{ background: sec.color }}/>
              <span className="section-name">{sec.name}</span>
              {sec.station && sec.station!=='Common' && <span className="item-station" style={{ background: STATION_COLORS[sec.station]||STATION_COLORS.Default, fontSize:10 }}>{sec.station}</span>}
              <span className="section-count">{done}/{sec.items.length}</span>
              <button className="action-btn del" onClick={() => setSections(s => s.filter(x => x.id !== sec.id))}>×</button>
            </div>
            {sec.items.map(item => (
              <CheckItem key={item.id} item={item}
                onToggle={id => toggleItem(sec.id, id)}
                onDelete={id => deleteItem(sec.id, id)}
                onDefer={id => deferItem(sec.id, id)}
                timer={timers[item.id]} onStartTimer={start} fmt={fmt}/>
            ))}
            {activeSection === sec.id ? (
              <div className="add-row">
                <select className="add-station-select" value={newStation} onChange={e => setNewStation(e.target.value)}>
                  {STATIONS.map(s => <option key={s}>{s}</option>)}
                </select>
                <input className="add-input" placeholder="New task..." value={newText}
                  onChange={e => setNewText(e.target.value)}
                  onKeyDown={e => { if (e.key==='Enter') addItem(sec.id); if (e.key==='Escape') { setActiveSection(null); setNewText(''); } }}
                  autoFocus/>
                <button className="add-confirm" onClick={() => addItem(sec.id)}>+</button>
              </div>
            ) : (
              <button className="add-task-btn" onClick={() => setActiveSection(sec.id)}>+ Add task</button>
            )}
          </div>
        );
      })}

      <div className="fab-area">
        {totalAll > 0 && !confirmReset && (
          <button className="reset-btn" onClick={() => setConfirmReset(true)}>Reset</button>
        )}
        {confirmReset && (
          <div className="confirm-row">
            <span className="confirm-text">Reset today?</span>
            <button className="confirm-yes" onClick={() => { setSections([]); setConfirmReset(false); }}>Yes, reset</button>
            <button className="confirm-no" onClick={() => setConfirmReset(false)}>Cancel</button>
          </div>
        )}
      </div>

      {Object.entries(timers).filter(([,t]) => t.running).length > 0 && (
        <div className="timer-bar">
          {sections.flatMap(s => s.items).filter(i => timers[i.id]?.running).map(i => (
            <span key={i.id} className="timer-chip">⏱ {i.text.slice(0,14)}… {fmt(timers[i.id].remaining)}</span>
          ))}
        </div>
      )}

      {showReport && <ReportModal sections={sections} nextShift={nextShift} onClose={() => setShowReport(false)}/>}
    </div>
  );
}

function RecipesScreen() {
  const [recipes, setRecipes] = useState(() => load('mis_recipes', DEFAULT_RECIPES));
  const [active, setActive] = useState(null);
  const [multiplier, setMultiplier] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [stationFilter, setStationFilter] = useState('All');

  useEffect(() => { save('mis_recipes', recipes); }, [recipes]);

  const filtered = recipes.filter(r => {
    const ms = r.name.toLowerCase().includes(search.toLowerCase()) || r.station.toLowerCase().includes(search.toLowerCase());
    return ms && (stationFilter === 'All' || r.station === stationFilter);
  });

  if (active) return (
    <div className="screen">
      <div className="screen-header">
        <button className="back-btn" onClick={() => setActive(null)}>← Back</button>
        <button className="action-btn del" onClick={() => { setRecipes(r => r.filter(x => x.id !== active.id)); setActive(null); }}>Delete</button>
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
      <div className="screen-header"><div className="screen-title">Recipes</div><button className="fab-btn" onClick={() => setShowForm(true)}>+</button></div>
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
      {showForm && <RecipeForm onSave={r => { setRecipes(rs => [...rs, r]); setShowForm(false); }} onCancel={() => setShowForm(false)}/>}
    </div>
  );
}

function RecipeForm({ onSave, onCancel }) {
  const [name, setName] = useState('');
  const [station, setStation] = useState('Hot');
  const [ings, setIngs] = useState([{ id: uid(), name: '', amount: '', unit: 'g' }]);
  const [steps, setSteps] = useState(['']);
  const addIng = () => setIngs(i => [...i, { id: uid(), name: '', amount: '', unit: 'g' }]);
  const updateIng = (id, f, v) => setIngs(i => i.map(x => x.id===id ? { ...x, [f]:v } : x));
  const addStep = () => setSteps(s => [...s, '']);
  const updateStep = (i, v) => setSteps(s => s.map((x,j) => j===i ? v : x));
  const handleSave = () => {
    if (!name.trim()) return;
    onSave({ id: uid(), name: name.trim(), station, portions: 1, ingredients: ings.filter(i=>i.name).map(i=>({...i,amount:parseFloat(i.amount)||0})), steps: steps.filter(Boolean) });
  };
  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header"><span>New Recipe</span><button className="action-btn del" onClick={onCancel}>×</button></div>
        <input className="form-input" placeholder="Recipe name" value={name} onChange={e => setName(e.target.value)}/>
        <select className="form-input" value={station} onChange={e => setStation(e.target.value)}>
          {STATIONS.map(s => <option key={s}>{s}</option>)}
        </select>
        <div className="form-label">Ingredients</div>
        {ings.map(ing => (
          <div key={ing.id} className="ing-form-row">
            <input className="form-input flex2" placeholder="Name" value={ing.name} onChange={e => updateIng(ing.id,'name',e.target.value)}/>
            <input className="form-input flex1" placeholder="Amt" type="number" value={ing.amount} onChange={e => updateIng(ing.id,'amount',e.target.value)}/>
            <select className="form-input flex1" value={ing.unit} onChange={e => updateIng(ing.id,'unit',e.target.value)}>
              {['g','kg','ml','l','pcs','tbsp','tsp'].map(u => <option key={u}>{u}</option>)}
            </select>
          </div>
        ))}
        <button className="add-task-btn" onClick={addIng}>+ Ingredient</button>
        <div className="form-label">Steps</div>
        {steps.map((s,i) => <textarea key={i} className="form-input" placeholder={`Step ${i+1}`} value={s} onChange={e => updateStep(i,e.target.value)} rows={2}/>)}
        <button className="add-task-btn" onClick={addStep}>+ Step</button>
        <button className="save-btn" onClick={handleSave}>Save Recipe</button>
      </div>
    </div>
  );
}

function TemplatesScreen({ templates, setTemplates }) {
  const [active, setActive] = useState(null);
  const [newItemText, setNewItemText] = useState('');
  const [newItemStation, setNewItemStation] = useState('Common');
  const [showNewTpl, setShowNewTpl] = useState(false);
  const [newTplName, setNewTplName] = useState('');
  const COLORS = ['#F97316','#6366F1','#22D3EE','#EF4444','#A78BFA','#10B981'];

  const addItem = async (tplId) => {
    if (!newItemText.trim()) return;
    const updated = templates.map(t => t.id===tplId ? { ...t, items: [...t.items, { id: uid(), text: newItemText.trim(), done: false, station: newItemStation }] } : t);
    setTemplates(updated);
    setNewItemText('');
    const tpl = updated.find(t => t.id === tplId);
    if (tpl?.created_by) await updateTemplate(tplId, { items: tpl.items }).catch(() => {});
  };

  const deleteItem = async (tplId, itemId) => {
    const updated = templates.map(t => t.id===tplId ? { ...t, items: t.items.filter(i=>i.id!==itemId) } : t);
    setTemplates(updated);
    const tpl = updated.find(t => t.id === tplId);
    if (tpl?.created_by) await updateTemplate(tplId, { items: tpl.items }).catch(() => {});
  };

  const handleCreateTemplate = async () => {
    if (!newTplName.trim()) return;
    const color = COLORS[Math.floor(Math.random()*COLORS.length)];
    try {
      const saved = await createTemplate({ name: newTplName.trim(), color, station: 'Common', items: [] });
      setTemplates(ts => [...ts, saved]);
    } catch {
      setTemplates(ts => [...ts, { id: uid(), name: newTplName.trim(), color, station: 'Common', items: [] }]);
    }
    setNewTplName(''); setShowNewTpl(false);
  };

  const handleDeleteTemplate = async (tpl) => {
    setTemplates(ts => ts.filter(t => t.id !== tpl.id));
    setActive(null);
    if (tpl.created_by) await deleteTemplate(tpl.id).catch(() => {});
  };

  const currentTpl = active ? templates.find(t => t.id === active.id) : null;

  if (currentTpl) return (
    <div className="screen">
      <div className="screen-header">
        <button className="back-btn" onClick={() => setActive(null)}>← Back</button>
        <button className="action-btn del" onClick={() => handleDeleteTemplate(currentTpl)}>Delete</button>
      </div>
      <div className="section-header" style={{ marginBottom:16 }}>
        <div className="section-dot" style={{ background: currentTpl.color }}/>
        <span className="section-name" style={{ fontSize:20 }}>{currentTpl.name}</span>
      </div>
      {currentTpl.items.map(item => (
        <div key={item.id} className="check-item">
          <div className="item-body">
            <span className="item-text">{item.text}</span>
          </div>
          <button className="action-btn del" onClick={() => deleteItem(currentTpl.id, item.id)}>×</button>
        </div>
      ))}
      <div className="add-row" style={{ marginTop:12 }}>
        <select className="add-station-select" value={newItemStation} onChange={e => setNewItemStation(e.target.value)}>
          {STATIONS.map(s => <option key={s}>{s}</option>)}
        </select>
        <input className="add-input" placeholder="New item..." value={newItemText}
          onChange={e => setNewItemText(e.target.value)}
          onKeyDown={e => { if (e.key==='Enter') addItem(currentTpl.id); }}/>
        <button className="add-confirm" onClick={() => addItem(currentTpl.id)}>+</button>
      </div>
    </div>
  );

  return (
    <div className="screen">
      <div className="screen-header">
        <div className="screen-title">Templates</div>
        {showNewTpl ? (
          <div className="inline-input-row">
            <input className="add-input" placeholder="Template name…" value={newTplName} autoFocus
              onChange={e => setNewTplName(e.target.value)}
              onKeyDown={e => { if (e.key==='Enter') handleCreateTemplate(); if (e.key==='Escape') { setNewTplName(''); setShowNewTpl(false); } }}/>
            <button className="add-confirm" onClick={handleCreateTemplate}>+</button>
            <button className="action-btn" onClick={() => { setNewTplName(''); setShowNewTpl(false); }}>×</button>
          </div>
        ) : (
          <button className="fab-btn" onClick={() => setShowNewTpl(true)}>+</button>
        )}
      </div>
      <div className="tpl-list">
        {templates.map(tpl => (
          <button key={tpl.id} className="tpl-card" onClick={() => setActive(tpl)}>
            <div className="tpl-card-bar" style={{ background: tpl.color }}/>
            <div className="tpl-card-body">
              <div className="tpl-card-name">{tpl.name}</div>
              <div className="tpl-card-meta">{tpl.items?.length ?? 0} items{tpl.station&&tpl.station!=='Common'?` · ${tpl.station}`:''}</div>
            </div>
            <div className="tpl-arrow">→</div>
          </button>
        ))}
        {templates.length === 0 && <div className="empty-state"><div className="empty-icon">📋</div><div className="empty-title">No templates yet</div></div>}
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
  const [templates, setTemplates] = useState(DEFAULT_TEMPLATES);
  const navigate = useNavigate();

  useEffect(() => {
    getTemplates().then(async rows => {
      if (rows && rows.length > 0) {
        setTemplates(rows);
      } else {
        // First run — seed default templates into Supabase
        try {
          await Promise.all(DEFAULT_TEMPLATES.map(tpl =>
            createTemplate({ name: tpl.name, color: tpl.color, station: tpl.station, items: tpl.items })
          ));
          const seeded = await getTemplates();
          if (seeded && seeded.length > 0) setTemplates(seeded);
        } catch {
          // Keep DEFAULT_TEMPLATES as fallback
        }
      }
    }).catch(() => {});
  }, []);
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
          {tab==='today' && <TodayScreen templates={templates} userStation={userStation}/>}
          {tab==='lineup' && <LineupScreen/>}
          {tab==='recipes' && <RecipesScreen/>}
          {tab==='templates' && <TemplatesScreen templates={templates} setTemplates={setTemplates}/>}
        </main>
        <nav className="bottom-nav">
          {[{id:'today',label:'Today',icon:'✓'},{id:'lineup',label:'Lineup',icon:'◈'},{id:'recipes',label:'Recipes',icon:'⚗'},{id:'templates',label:'Tmpls',icon:'◫'}].map(t => (
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
  :root{--bg:#0C0C0C;--surface:#141414;--surface2:#1C1C1C;--border:#252525;--text:#E8E8E0;--text-muted:#555;--accent:#F97316;--font-display:'Syne',sans-serif;--font-mono:'DM Mono',monospace;--radius:10px}
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
