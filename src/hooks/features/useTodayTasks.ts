import { useState, useEffect } from 'react';
import {
  getTasks, createTask, createTasksBatch, completeTask,
  uncompleteTask, commentTask, deleteTask, getDefaultDayTemplate,
  getShiftExperiment, getImprovementLogs, getPrepItemsMap,
} from '../../lib/supabase.js';
import { SECTIONS } from '../../lib/constants.js';
import { filterByStation, groupBySection, calcProgress, buildTasksFromTemplate } from '../../domain/tasks.js';
import type { Task, ImprovementLog, Station } from '../../lib/types.js';

function dateStr(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().split('T')[0];
}

export function useTodayTasks(dateOffset: number, stationFilter: string) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [experiment, setExperiment] = useState<string | null>(null);
  const [improvements, setImprovements] = useState<ImprovementLog[]>([]);

  const selectedDate = dateStr(dateOffset);

  useEffect(() => {
    getShiftExperiment().then(setExperiment).catch(() => {});
    getImprovementLogs(3).then(setImprovements).catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getTasks(selectedDate).then(async (rows: Task[]) => {
      if (cancelled) return;

      // Only skip generation when today already has prep tasks (prep_item_id set).
      // Non-prep tasks existing is not sufficient — prep generation must still run
      // so prep tasks get prep_item_id seeded from the catalog.
      const hasPrepTasks = rows.some(r => r.section === 'Prep');

      if (hasPrepTasks) {
        setTasks(rows);
        return;
      }
      if (selectedDate !== dateStr(0)) {
        setTasks(rows);
        return;
      }
      const [tpl, prepMap] = await Promise.all([
        getDefaultDayTemplate().catch(() => null),
        getPrepItemsMap().catch(() => new Map<string, number | null>()),
      ]);
      if (cancelled) return;
      if (!tpl || !tpl.entries?.length) {
        setTasks(rows);
        return;
      }
      // Enrich entries that carry prep_item_id with current default_quantity from the
      // catalog. The upsert is idempotent (ignoreDuplicates), so existing non-prep
      // tasks are not duplicated and existing prep tasks keep their quantity as-is.
      const enrichedEntries = tpl.entries.map((e: { text: string; station: string; section: string; prep_item_id?: string | null }) => ({
        ...e,
        default_quantity: e.prep_item_id ? (prepMap.get(e.prep_item_id) ?? null) : null,
      }));
      const batch = buildTasksFromTemplate(enrichedEntries, selectedDate, tpl.id);
      const created = await createTasksBatch(batch).catch(() => null);
      if (cancelled) return;
      setTasks(created || rows);
    }).catch(() => { if (!cancelled) setTasks([]); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [selectedDate]);

  const toggle = async (task: Task) => {
    try {
      const updated = task.done ? await uncompleteTask(task.id) : await completeTask(task.id);
      setTasks(ts => ts.map(t => t.id === task.id ? { ...t, ...updated } : t));
    } catch { /* noop */ }
  };

  const addTask = async ({ text, station, section, date }: { text: string; station: string; section: string; date: string }) => {
    try {
      const task = await createTask({ text, station: station as Station, section, date, source: 'manual' });
      if (date === selectedDate) setTasks(ts => [...ts, task]);
    } catch { /* noop */ }
  };

  const saveComment = async (taskId: string, comment: string) => {
    try {
      const updated = await commentTask(taskId, comment);
      setTasks(ts => ts.map(t => t.id === taskId ? { ...t, ...updated } : t));
    } catch { /* noop */ }
  };

  const removeTask = async (taskId: string) => {
    try {
      await deleteTask(taskId);
      setTasks(ts => ts.filter(t => t.id !== taskId));
    } catch { /* noop — caller shows no feedback by design */ }
  };

  // Prep section is shown on the dedicated PrepScreen, not Today
  const todayTasks = tasks.filter(t => t.section !== 'Prep');
  const filtered = filterByStation(todayTasks, stationFilter);
  const bySection = groupBySection(filtered, SECTIONS);
  const progress = calcProgress(filtered);

  return {
    tasks,
    filtered,
    bySection,
    progress,
    loading,
    experiment,
    improvements,
    selectedDate,
    toggle,
    addTask,
    saveComment,
    removeTask,
  };
}
