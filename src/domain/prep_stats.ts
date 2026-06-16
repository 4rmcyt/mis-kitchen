export interface PrepStatRow {
  done_by_id: string;
  done_by_name: string | null;
  prep_item_id: string;
  prep_item_name: string;
  task_count: number;
  total_quantity: number;
}

export interface ByPersonEntry {
  person_id: string;
  person_name: string | null;
  items: Array<{ prep_item_id: string; prep_item_name: string; task_count: number; total_quantity: number }>;
  total_tasks: number;
  total_units: number;
}

export interface ByPrepEntry {
  prep_item_id: string;
  prep_item_name: string;
  people: Array<{ person_id: string; person_name: string | null; task_count: number; total_quantity: number }>;
  total_tasks: number;
  total_units: number;
}

/** Group flat rows by person (done_by). */
export function groupByPerson(rows: PrepStatRow[]): ByPersonEntry[] {
  const map = new Map<string, ByPersonEntry>();
  for (const r of rows) {
    let entry = map.get(r.done_by_id);
    if (!entry) {
      entry = { person_id: r.done_by_id, person_name: r.done_by_name, items: [], total_tasks: 0, total_units: 0 };
      map.set(r.done_by_id, entry);
    }
    entry.items.push({ prep_item_id: r.prep_item_id, prep_item_name: r.prep_item_name, task_count: r.task_count, total_quantity: r.total_quantity });
    entry.total_tasks += r.task_count;
    entry.total_units += r.total_quantity;
  }
  return Array.from(map.values()).sort((a, b) => b.total_tasks - a.total_tasks);
}

/** Group flat rows by prep item. */
export function groupByPrepItem(rows: PrepStatRow[]): ByPrepEntry[] {
  const map = new Map<string, ByPrepEntry>();
  for (const r of rows) {
    let entry = map.get(r.prep_item_id);
    if (!entry) {
      entry = { prep_item_id: r.prep_item_id, prep_item_name: r.prep_item_name, people: [], total_tasks: 0, total_units: 0 };
      map.set(r.prep_item_id, entry);
    }
    entry.people.push({ person_id: r.done_by_id, person_name: r.done_by_name, task_count: r.task_count, total_quantity: r.total_quantity });
    entry.total_tasks += r.task_count;
    entry.total_units += r.total_quantity;
  }
  return Array.from(map.values()).sort((a, b) => b.total_tasks - a.total_tasks);
}
