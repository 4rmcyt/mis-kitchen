import { useState, useEffect } from 'react';
import {
  getTasks, createTask, createTasksBatch, completeTask,
  uncompleteTask, commentTask, deleteTask, getDefaultDayTemplate,
  getShiftExperiment, getImprovementLogs,
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
      if (rows && rows.length > 0) {
        setTasks(rows);
        return;
      }
      if (selectedDate !== dateStr(0)) {
        setTasks([]);
        return;
      }
      const tpl = await getDefaultDayTemplate().catch(() => null);
      if (cancelled) return;
      if (!tpl || !tpl.entries?.length) {
        setTasks([]);
        return;
      }
      const batch = buildTasksFromTemplate(tpl.entries, selectedDate);
      const created = await createTasksBatch(batch).catch(() => null);
      if (cancelled) return;
      setTasks(created || []);
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
    } catch { /* noop */ }
  };

  const filtered = filterByStation(tasks, stationFilter);
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
