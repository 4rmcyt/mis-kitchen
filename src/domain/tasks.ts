import type { Task, Station } from '../lib/types.js';

export interface TaskProgress {
  done: number;
  total: number;
  pct: number;
}

export interface TaskCreateInput {
  text: string;
  station: Station;
  section: string;
  date: string;
  source?: 'manual' | 'template';
  template_id?: string | null;
  day_template_id?: string | null;
}

/** Filter tasks by station: 'All' returns everything; any other station returns that station + Common. */
export function filterByStation(tasks: Task[], station: string): Task[] {
  if (station === 'All') return tasks;
  return tasks.filter(t => t.station === station || t.station === 'Common');
}

/** Group a flat task list into a map keyed by section, preserving section order. */
export function groupBySection(tasks: Task[], sections: string[]): Record<string, Task[]> {
  return sections.reduce<Record<string, Task[]>>((acc, sec) => {
    acc[sec] = tasks.filter(t => t.section === sec);
    return acc;
  }, {});
}

/** Compute done/total/pct for a task list. */
export function calcProgress(tasks: Task[]): TaskProgress {
  const total = tasks.length;
  const done = tasks.filter(t => t.done).length;
  return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
}

/** Build the batch input rows from a day_template's entries for a given date. */
export function buildTasksFromTemplate(
  entries: Array<{ text: string; station: string; section: string }>,
  date: string,
  dayTemplateId: string,
): TaskCreateInput[] {
  return entries.map(e => ({
    text: e.text,
    station: e.station as Station,
    section: e.section,
    date,
    source: 'template' as const,
    day_template_id: dayTemplateId,
  }));
}
