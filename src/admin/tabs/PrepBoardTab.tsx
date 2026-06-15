import { useState } from 'react';
import { usePrepBoard } from '../../hooks/features/usePrepBoard.js';
import { useToast } from '../components/Toast.js';
import type { Task, Profile } from '../../lib/types.js';

export function PrepBoardTab() {
  const { tasks, people, loading, error, assign, addTask } = usePrepBoard();
  const { show } = useToast();
  const [selected, setSelected] = useState<string | null>(null);
  const [newText, setNewText] = useState('');
  const [adding, setAdding] = useState(false);

  const selectedTask = tasks.find(t => t.id === selected) ?? null;

  async function handleAssign(userId: string | null) {
    if (!selected) return;
    try {
      await assign(selected, userId);
      setSelected(null);
    } catch (e) {
      show((e as Error).message, 'error');
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const text = newText.trim();
    if (!text) return;
    setAdding(true);
    try {
      await addTask(text);
      setNewText('');
    } catch (e) {
      show((e as Error).message, 'error');
    } finally {
      setAdding(false);
    }
  }

  if (loading) return <div className="prep-board-loading">Loading…</div>;
  if (error)   return <div className="prep-board-error">{error}</div>;

  const unassigned = tasks.filter(t => !t.assigned_to);
  const assigned   = tasks.filter(t =>  t.assigned_to);

  const assigneePeople = people.filter(p => assigned.some(t => t.assigned_to === p.id));
  const otherPeople    = people.filter(p => !assigneePeople.find(a => a.id === p.id));

  return (
    <div className="prep-board">
      {/* Instruction bar */}
      <div className="prep-board-hint">
        {selected
          ? <><strong>"{selectedTask?.text}"</strong> — tap a person to assign, or tap <button className="prep-unassign-btn" onClick={() => setSelected(null)}>cancel</button></>
          : 'Tap a task to select it, then tap a person to assign.'}
      </div>

      <div className="prep-board-columns">
        {/* Unassigned pool */}
        <div className="prep-column prep-column--unassigned">
          <div className="prep-column-header">Unassigned</div>
          <div className="prep-column-tasks">
            {unassigned.length === 0
              ? <div className="prep-empty">All assigned</div>
              : unassigned.map(t => (
                  <TaskChip
                    key={t.id}
                    task={t}
                    selected={selected === t.id}
                    onClick={() => setSelected(t.id === selected ? null : t.id)}
                  />
                ))}
          </div>

          {/* Add ad-hoc task */}
          <form className="prep-add-form" onSubmit={handleAdd}>
            <input
              className="prep-add-input"
              placeholder="Add prep item…"
              value={newText}
              onChange={e => setNewText(e.target.value)}
              disabled={adding}
            />
            <button className="prep-add-btn" type="submit" disabled={adding || !newText.trim()}>+</button>
          </form>
        </div>

        {/* Person columns */}
        {people.map(person => {
          const personTasks = tasks.filter(t => t.assigned_to === person.id);
          return (
            <PersonColumn
              key={person.id}
              person={person}
              tasks={personTasks}
              canReceive={!!selected}
              onReceive={() => handleAssign(person.id)}
              onTaskClick={taskId => setSelected(taskId === selected ? null : taskId)}
              selectedId={selected}
            />
          );
        })}
      </div>
    </div>
  );
}

function TaskChip({ task, selected, onClick }: { task: Task; selected: boolean; onClick: () => void }) {
  return (
    <button
      className={`prep-task-chip ${selected ? 'prep-task-chip--selected' : ''} ${task.done ? 'prep-task-chip--done' : ''}`}
      onClick={onClick}
    >
      {task.done && <span className="prep-task-done-mark">✓ </span>}
      {task.text}
    </button>
  );
}

function PersonColumn({
  person, tasks, canReceive, onReceive, onTaskClick, selectedId
}: {
  person: Profile;
  tasks: Task[];
  canReceive: boolean;
  onReceive: () => void;
  onTaskClick: (id: string) => void;
  selectedId: string | null;
}) {
  const done  = tasks.filter(t =>  t.done).length;
  const total = tasks.length;

  return (
    <div
      className={`prep-column ${canReceive ? 'prep-column--droppable' : ''}`}
      onClick={canReceive ? onReceive : undefined}
    >
      <div className="prep-column-header">
        <span className="prep-column-name">{person.name || '—'}</span>
        {total > 0 && <span className="prep-column-count">{done}/{total}</span>}
      </div>
      <div className="prep-column-tasks" onClick={e => e.stopPropagation()}>
        {tasks.length === 0
          ? <div className="prep-empty">{canReceive ? 'Drop here' : 'No tasks'}</div>
          : tasks.map(t => (
              <TaskChip
                key={t.id}
                task={t}
                selected={selectedId === t.id}
                onClick={() => onTaskClick(t.id)}
              />
            ))}
      </div>
    </div>
  );
}
