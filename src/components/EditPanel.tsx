// ============================================================
// Edit Panel - Planning Mode
// Two tabs: This Month | Routine
// Monthly goals/worries + editable weekly routine
// ============================================================

import { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import type { Task, DayOfWeek, RoutineTemplate } from '../types';
import { v4 as uuidv4 } from 'uuid';

type EditTab = 'month' | 'routine';

const DAY_LABELS: Record<DayOfWeek, string> = {
  sunday: 'Sunday',
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
};

const DAY_ORDER: DayOfWeek[] = [
  'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday',
];

export default function EditPanel() {
  const { state, dispatch } = useAppStore();
  const [activeTab, setActiveTab] = useState<EditTab>('month');
  const [newMonthlyTitle, setNewMonthlyTitle] = useState('');

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthLabel = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const todayISO = now.toISOString().split('T')[0];

  // Monthly tasks: those tagged with targetMonth matching current month
  const monthlyTasks = state.tasks.filter(
    t => t.targetMonth === currentMonth && !t.completed
  );
  const monthlyCompleted = state.tasks.filter(
    t => t.targetMonth === currentMonth && t.completed
  );

  // Routine templates from state, grouped by day
  const routineByDay = DAY_ORDER.map(day => ({
    day,
    label: DAY_LABELS[day],
    templates: state.routineTemplates.filter(t => t.dayOfWeek === day),
  }));

  const handleAddMonthly = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMonthlyTitle.trim()) return;
    dispatch({
      type: 'ADD_TASK_SIMPLE',
      payload: { title: newMonthlyTitle.trim(), targetMonth: currentMonth },
    });
    setNewMonthlyTitle('');
  };

  const scheduleToday = (taskId: string) => {
    dispatch({ type: 'SCHEDULE_TASK', payload: { taskId, dateISO: todayISO } });
  };

  const removeFromMonth = (taskId: string) => {
    dispatch({ type: 'SET_TARGET_MONTH', payload: { taskId, month: undefined } });
  };

  return (
    <div className="edit-panel">
      {/* Tabs */}
      <div className="edit-tabs">
        <button
          className={`edit-tab ${activeTab === 'month' ? 'active' : ''}`}
          onClick={() => setActiveTab('month')}
        >
          This Month
        </button>
        <button
          className={`edit-tab ${activeTab === 'routine' ? 'active' : ''}`}
          onClick={() => setActiveTab('routine')}
        >
          Routine
        </button>
      </div>

      {/* Tab Content */}
      <div className="edit-body">
        {/* ===== THIS MONTH ===== */}
        {activeTab === 'month' && (
          <div className="edit-section">
            <h3 className="edit-section-title">{monthLabel}</h3>
            <p className="edit-section-desc">
              Things to worry about this month. Schedule them to a day when ready.
            </p>

            {monthlyTasks.length === 0 && monthlyCompleted.length === 0 && (
              <p className="edit-empty">Nothing for this month yet. Add goals or reminders below.</p>
            )}

            {monthlyTasks.map(task => (
              <MonthlyItem
                key={task.id}
                task={task}
                onSchedule={() => scheduleToday(task.id)}
                onRemove={() => removeFromMonth(task.id)}
              />
            ))}

            {monthlyCompleted.length > 0 && (
              <div className="edit-completed-section">
                <h4 className="edit-completed-label">Done ({monthlyCompleted.length})</h4>
                {monthlyCompleted.map(task => (
                  <div key={task.id} className="monthly-item done">
                    <span className="monthly-check completed">{'\u2713'}</span>
                    <span className="monthly-title struck">{task.title}</span>
                  </div>
                ))}
              </div>
            )}

            <form className="edit-add-form" onSubmit={handleAddMonthly}>
              <input
                type="text"
                value={newMonthlyTitle}
                onChange={e => setNewMonthlyTitle(e.target.value)}
                placeholder="Add something for this month..."
                className="edit-add-input"
                autoComplete="off"
              />
              <button type="submit" className="edit-add-btn">+</button>
            </form>
          </div>
        )}

        {/* ===== ROUTINE EDITOR ===== */}
        {activeTab === 'routine' && (
          <div className="edit-section">
            <h3 className="edit-section-title">Weekly Routine</h3>
            <p className="edit-section-desc">
              Edit your recurring weekly schedule. Changes apply to future weeks.
            </p>

            {routineByDay.map(group => (
              <RoutineDayEditor
                key={group.day}
                day={group.day}
                label={group.label}
                templates={group.templates}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// --- Monthly goal item ---
function MonthlyItem({
  task,
  onSchedule,
  onRemove,
}: {
  task: Task;
  onSchedule: () => void;
  onRemove: () => void;
}) {
  const { dispatch } = useAppStore();
  const hasSubs = task.subtasks.length > 0;
  const doneSubs = task.subtasks.filter(s => s.completed).length;
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="monthly-item">
      <div className="monthly-row">
        <button
          className={`monthly-check ${task.completed ? 'completed' : ''}`}
          onClick={() => dispatch({
            type: task.completed ? 'UNCOMPLETE_TASK' : 'COMPLETE_TASK',
            payload: { taskId: task.id },
          })}
        >
          {task.completed && '\u2713'}
        </button>
        <button className="monthly-title" onClick={() => setExpanded(!expanded)}>
          {task.title}
        </button>
        {hasSubs && <span className="monthly-sub-badge">{doneSubs}/{task.subtasks.length}</span>}
        <div className="monthly-actions">
          <button className="monthly-btn schedule" onClick={onSchedule} title="Schedule today">+</button>
          <button className="monthly-btn remove" onClick={onRemove} title="Remove from month">&times;</button>
        </div>
      </div>
      {expanded && hasSubs && (
        <div className="monthly-subs">
          {task.subtasks.map(sub => (
            <div key={sub.id} className={`monthly-sub ${sub.completed ? 'done' : ''}`}>
              <button
                className={`msub-check ${sub.completed ? 'checked' : ''}`}
                onClick={() => dispatch({
                  type: 'TOGGLE_SUBTASK',
                  payload: { taskId: task.id, subtaskId: sub.id },
                })}
              >
                {sub.completed && '\u2713'}
              </button>
              <span className={sub.completed ? 'struck' : ''}>{sub.title}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// --- Routine Day Editor ---
function RoutineDayEditor({
  day,
  label,
  templates,
}: {
  day: DayOfWeek;
  label: string;
  templates: RoutineTemplate[];
}) {
  const { dispatch } = useAppStore();
  const [addingNew, setAddingNew] = useState(false);
  const [newTitle, setNewTitle] = useState('');

  const handleAdd = () => {
    if (!newTitle.trim()) return;
    const tmpl: RoutineTemplate = {
      id: uuidv4(),
      dayOfWeek: day,
      title: newTitle.trim(),
      category: 'other',
      workType: 'light',
      priority: 'medium',
      defaultSubtasks: [],
      isPhoneTask: false,
    };
    dispatch({ type: 'ADD_ROUTINE_TEMPLATE', payload: tmpl });
    setNewTitle('');
    setAddingNew(false);
  };

  return (
    <div className="routine-day">
      <div className="routine-day-header">
        <h4 className="routine-day-label">{label}</h4>
        <button
          className="routine-day-add"
          onClick={() => setAddingNew(!addingNew)}
          title="Add routine item"
        >
          {addingNew ? '\u2212' : '+'}
        </button>
      </div>

      {templates.length === 0 && !addingNew && (
        <p className="routine-empty">No routine items for {label}.</p>
      )}

      {templates.map(tmpl => (
        <RoutineItemEditor key={tmpl.id} template={tmpl} />
      ))}

      {addingNew && (
        <div className="routine-add-form">
          <input
            type="text"
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAdd(); } }}
            placeholder="New routine task..."
            className="routine-add-input"
            autoComplete="off"
            autoFocus
          />
          <button className="routine-add-btn" onClick={handleAdd}>Add</button>
        </div>
      )}
    </div>
  );
}

// --- Routine Item Editor ---
function RoutineItemEditor({ template }: { template: RoutineTemplate }) {
  const { dispatch } = useAppStore();
  const [expanded, setExpanded] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [title, setTitle] = useState(template.title);
  const [newSub, setNewSub] = useState('');

  const update = (updates: Partial<RoutineTemplate>) => {
    dispatch({ type: 'UPDATE_ROUTINE_TEMPLATE', payload: { templateId: template.id, updates } });
  };

  const handleTitleSave = () => {
    if (title.trim() && title.trim() !== template.title) {
      update({ title: title.trim() });
    } else {
      setTitle(template.title);
    }
    setEditingTitle(false);
  };

  const handleAddSub = () => {
    if (!newSub.trim()) return;
    update({ defaultSubtasks: [...template.defaultSubtasks, newSub.trim()] });
    setNewSub('');
  };

  const handleRemoveSub = (idx: number) => {
    update({ defaultSubtasks: template.defaultSubtasks.filter((_, i) => i !== idx) });
  };

  const handleDelete = () => {
    dispatch({ type: 'DELETE_ROUTINE_TEMPLATE', payload: { templateId: template.id } });
  };

  const formatMinutes = (min?: number) => {
    if (!min) return '';
    if (min < 60) return `${min}m`;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  return (
    <div className="routine-item">
      <div className="routine-item-header">
        {editingTitle ? (
          <input
            className="routine-title-input"
            value={title}
            onChange={e => setTitle(e.target.value)}
            onBlur={handleTitleSave}
            onKeyDown={e => { if (e.key === 'Enter') handleTitleSave(); if (e.key === 'Escape') { setTitle(template.title); setEditingTitle(false); } }}
            autoFocus
            autoComplete="off"
          />
        ) : (
          <button className="routine-item-title" onClick={() => setExpanded(!expanded)}>
            {template.title}
          </button>
        )}
        {template.estimatedMinutes && !editingTitle && (
          <span className="routine-item-time">{formatMinutes(template.estimatedMinutes)}</span>
        )}
        <button
          className="routine-item-expand"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? '\u25B4' : '\u25BE'}
        </button>
      </div>

      {!expanded && template.defaultSubtasks.length > 0 && (
        <div className="routine-sub-preview">
          {template.defaultSubtasks.length} subtask{template.defaultSubtasks.length !== 1 ? 's' : ''}
        </div>
      )}

      {expanded && (
        <div className="routine-item-body">
          {/* Edit title */}
          {!editingTitle && (
            <button className="routine-edit-title-btn" onClick={() => setEditingTitle(true)}>
              Rename
            </button>
          )}

          {/* Time estimate */}
          <div className="routine-field">
            <label className="routine-field-label">Est. minutes</label>
            <input
              type="number"
              className="routine-field-input"
              value={template.estimatedMinutes || ''}
              onChange={e => update({ estimatedMinutes: e.target.value ? parseInt(e.target.value) : undefined })}
              placeholder="0"
              min="0"
            />
          </div>

          {/* Subtasks */}
          <div className="routine-subs-edit">
            <label className="routine-field-label">Default subtasks</label>
            {template.defaultSubtasks.map((sub, i) => (
              <div key={i} className="routine-sub-row">
                <span className="routine-sub-dot">&middot;</span>
                <span className="routine-sub-text">{sub}</span>
                <button className="routine-sub-del" onClick={() => handleRemoveSub(i)}>&times;</button>
              </div>
            ))}
            <div className="routine-sub-add">
              <input
                type="text"
                value={newSub}
                onChange={e => setNewSub(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddSub(); } }}
                placeholder="Add subtask..."
                className="routine-sub-input"
                autoComplete="off"
              />
              {newSub.trim() && (
                <button className="routine-sub-add-btn" onClick={handleAddSub}>+</button>
              )}
            </div>
          </div>

          {/* Delete */}
          <button className="routine-delete-btn" onClick={handleDelete}>
            Remove from routine
          </button>
        </div>
      )}
    </div>
  );
}
