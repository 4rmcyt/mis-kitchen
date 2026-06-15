import type { Task, Station } from '../lib/types.js';

export function selectOwnedTasks(
  tasks: Task[],
  profile: { id: string; station: Station | null },
): Task[] {
  return tasks.filter((t) => {
    if (t.assigned_to === profile.id) return true;
    if (t.assigned_to !== null) return false;
    // Unassigned Common is lead-only (Prep Board), never in a cook's personal view.
    if (t.station === 'Common') return false;
    // 'All' is the DB default for floaters (bug #22). No station match → only explicit assignments.
    if (profile.station === null || (profile.station as string) === 'All') return false;
    // TODO(shifts): derive station ownership from shifts table instead of profile.station.
    // When shifts has data, resolve "who holds station S on date D" from the shift row
    // whose station matches and whose time window covers now. Keep profile.station as
    // fallback when no shift row exists for that date/station. Handle two cooks on one
    // station in a day (morning + evening) — product decision needed: current-shift-holder
    // or both. See backlog Item 4 (gated on shifts table being populated).
    return t.station === profile.station;
  });
}
