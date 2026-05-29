import { useState, useEffect } from "react";
import { STATIONS, STATION_COLORS } from "../lib/constants.js";
import { getTempLogs, logTemperature } from "../lib/temp_logs.js";
import type { TempLog, Station } from "../lib/types.js";

function today() {
  return new Date().toISOString().slice(0, 10);
}

function formatTime(ts: string) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function TempScreen() {
  const [station, setStation]   = useState<Station>(STATIONS[0] as Station);
  const [temp, setTemp]         = useState('');
  const [logs, setLogs]         = useState<TempLog[]>([]);
  const [saving, setSaving]     = useState(false);
  const [flash, setFlash]       = useState<string | null>(null);

  useEffect(() => {
    getTempLogs(today()).then((data: TempLog[]) => setLogs(data || [])).catch(() => {});
  }, []);

  async function handleSave() {
    const val = parseFloat(temp);
    if (isNaN(val)) return;
    setSaving(true);
    const entry = await logTemperature(station, val);
    if (entry) {
      setLogs(prev => [entry, ...prev]);
      setFlash('Saved');
      setTemp('');
      setTimeout(() => setFlash(null), 1500);
    }
    setSaving(false);
  }

  return (
    <div className="screen">
      <div className="screen-header">
        <div>
          <div className="screen-title">Temp Log</div>
          <div className="screen-sub">3× daily — before lunch, between services, after dinner</div>
        </div>
      </div>

      <div className="temp-form">
        <div className="station-filter station-filter-mb">
          {STATIONS.map(s => (
            <button
              key={s}
              className={`station-pill ${station === s ? 'active' : ''}`}
              onClick={() => setStation(s as Station)}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="temp-input-row">
          <div className="temp-station-badge" style={{ background: STATION_COLORS[station] || STATION_COLORS.Default }}>
            {station}
          </div>
          <input
            className="form-input temp-input"
            type="number"
            inputMode="decimal"
            placeholder="°C"
            value={temp}
            onChange={e => setTemp(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
          />
          <button
            className="save-btn save-btn-inline"
            onClick={handleSave}
            disabled={saving || temp === ''}
          >
            {flash || 'Save'}
          </button>
        </div>
      </div>

      <div className="temp-logs-block">
        <div className="section-header section-header-mb">
          <div className="section-name">Today</div>
          <div className="section-count">{logs.length} entries</div>
        </div>
        {logs.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">🌡️</div>
            <div className="empty-title">No logs yet</div>
          </div>
        )}
        {logs.map(log => (
          <div key={log.id} className="temp-log-row">
            <div
              className="temp-log-dot"
              style={{ background: STATION_COLORS[log.station] || STATION_COLORS.Default }}
            />
            <span className="temp-log-station">{log.station}</span>
            <span className="temp-log-val">{log.temperature}°C</span>
            <span className="temp-log-time">{formatTime(log.recorded_at)}</span>
            <span className="temp-log-who">{log.profiles?.name || ''}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
