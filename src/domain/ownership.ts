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
    return t.station === profile.station;
  });
}
