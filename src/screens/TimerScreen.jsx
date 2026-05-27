import { useState, useEffect, useRef } from "react";

let globalTimers = [];
let globalListeners = [];

function notifyListeners() {
  globalListeners.forEach(fn => fn([...globalTimers]));
}

function addTimer(label) {
  const id = Date.now();
  globalTimers = [...globalTimers, { id, label, seconds: 0, running: false, done: false }];
  notifyListeners();
  return id;
}

function startTimer(id) {
  globalTimers = globalTimers.map(t => t.id === id ? { ...t, running: true, done: false } : t);
  notifyListeners();
}

function pauseTimer(id) {
  globalTimers = globalTimers.map(t => t.id === id ? { ...t, running: false } : t);
  notifyListeners();
}

function resetTimer(id) {
  globalTimers = globalTimers.map(t => t.id === id ? { ...t, seconds: 0, running: false, done: false } : t);
  notifyListeners();
}

function removeTimer(id) {
  globalTimers = globalTimers.filter(t => t.id !== id);
  notifyListeners();
}

function setTimerDuration(id, seconds) {
  globalTimers = globalTimers.map(t => t.id === id ? { ...t, seconds, running: false, done: false } : t);
  notifyListeners();
}

function useGlobalTimers() {
  const [timers, setTimers] = useState([...globalTimers]);
  useEffect(() => {
    globalListeners.push(setTimers);
    return () => { globalListeners = globalListeners.filter(fn => fn !== setTimers); };
  }, []);
  return timers;
}

function useTimerTick() {
  useEffect(() => {
    const interval = setInterval(() => {
      let changed = false;
      globalTimers = globalTimers.map(t => {
        if (!t.running || t.done) return t;
        if (t.seconds <= 1) { changed = true; return { ...t, seconds: 0, running: false, done: true }; }
        changed = true;
        return { ...t, seconds: t.seconds - 1 };
      });
      if (changed) notifyListeners();
    }, 1000);
    return () => clearInterval(interval);
  }, []);
}

function formatDuration(s) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

function TimerCard({ timer }) {
  const [inputMin, setInputMin] = useState('');
  const [inputSec, setInputSec] = useState('');
  const beepRef = useRef(false);

  useEffect(() => {
    if (timer.done && !beepRef.current) {
      beepRef.current = true;
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        [0, 0.15, 0.3].forEach(delay => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain); gain.connect(ctx.destination);
          osc.frequency.value = 880;
          gain.gain.setValueAtTime(0.3, ctx.currentTime + delay);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.12);
          osc.start(ctx.currentTime + delay);
          osc.stop(ctx.currentTime + delay + 0.12);
        });
      } catch (_e) { /* noop */ }
    }
    if (!timer.done) beepRef.current = false;
  }, [timer.done]);

  function applyInput() {
    const m = parseInt(inputMin) || 0;
    const s = parseInt(inputSec) || 0;
    const total = m * 60 + s;
    if (total > 0) setTimerDuration(timer.id, total);
  }

  const isSet = timer.seconds > 0 || timer.done;

  return (
    <div className={`timer-card ${timer.done ? 'timer-done' : ''}`}>
      <div className="timer-card-top">
        <span className="timer-card-label">{timer.label}</span>
        <button className="action-btn del" onClick={() => removeTimer(timer.id)}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>

      {timer.done ? (
        <div className="timer-done-display">
          <span>Done!</span>
          <button className="timer-ctrl-btn" onClick={() => resetTimer(timer.id)}>Reset</button>
        </div>
      ) : (
        <>
          <div className="timer-display">{formatDuration(timer.seconds)}</div>
          {!isSet && (
            <div className="timer-set-row">
              <input
                className="timer-input" type="number" inputMode="numeric"
                placeholder="min" value={inputMin}
                onChange={e => setInputMin(e.target.value)}
                style={{ width: 52 }}
              />
              <span className="timer-unit">:</span>
              <input
                className="timer-input" type="number" inputMode="numeric"
                placeholder="sec" value={inputSec}
                onChange={e => setInputSec(e.target.value)}
                style={{ width: 52 }}
              />
              <button className="timer-go" onClick={applyInput}>Set</button>
            </div>
          )}
          {isSet && (
            <div className="timer-ctrl-row">
              {timer.running
                ? <button className="timer-ctrl-btn" onClick={() => pauseTimer(timer.id)}>Pause</button>
                : <button className="timer-ctrl-btn primary" onClick={() => startTimer(timer.id)}>Start</button>
              }
              <button className="timer-ctrl-btn" onClick={() => resetTimer(timer.id)}>Reset</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export function TimerScreen() {
  const timers = useGlobalTimers();
  useTimerTick();
  const [newLabel, setNewLabel] = useState('');

  function handleAdd() {
    const label = newLabel.trim() || `Timer ${timers.length + 1}`;
    addTimer(label);
    setNewLabel('');
  }

  return (
    <div className="screen">
      <div className="screen-header">
        <div className="screen-title">Timers</div>
      </div>

      <div className="add-row" style={{ marginBottom: 20 }}>
        <input
          className="add-input"
          placeholder="Timer name..."
          value={newLabel}
          onChange={e => setNewLabel(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
        />
        <button className="add-confirm" onClick={handleAdd}>+</button>
      </div>

      {timers.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">⏱</div>
          <div className="empty-title">No timers</div>
          <div className="empty-sub">Add a timer above</div>
        </div>
      )}

      <div className="timer-cards">
        {timers.map(t => <TimerCard key={t.id} timer={t} />)}
      </div>
    </div>
  );
}
