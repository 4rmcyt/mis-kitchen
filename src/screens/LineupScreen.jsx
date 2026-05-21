import { useState, useEffect } from "react";
import { getRestaurantProfiles } from "../lib/supabase.js";
import { STATIONS, STATION_COLORS } from "../lib/constants.js";

export function LineupScreen() {
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
