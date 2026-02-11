// ============================================================
// Edit Panel - Planning Mode
// Three tabs: This Month | Routine | Backlog
// Monthly goals, routine overview, backlog management
// ============================================================

import { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { getRoutineTemplates } from '../engine/routine';
import type { Task, DayOfWeek } from '../types';

type EditTab = 'month' | 'routine' | 'backlog';

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

  // Backlog tasks
  const backlogTasks = state.tasks.filter(t => t.isBacklog && !t.completed);

  // Routine templates grouped by day
  const routineTemplates = getRoutineTemplates();
  const routineByDay = DAY_ORDER.map(day => ({
    day,
    label: DAY_LABELS[day],
    templates: routineTemplates.filter(t => t.dayOfWeek === day),
  })).filter(g => g.templates.length > 0);

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

  const assignToMonth = (taskId: string) => {
    dispatch({ type: 'SET_TARGET_MONTH', payload: { taskId, month: currentMonth } });
  };

  const removeFromMonth = (taskId: string) => {
    dispatch({ type: 'SET_TARGET_MONTH', payload: { taskId, month: undefined } });
  };

  const formatMinutes = (min?: number) => {
    if (!min) return '';
    if (min < 60) return `${min}m`;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
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
        <button
          className={`edit-tab ${activeTab === 'backlog' ? 'active' : ''}`}
          onClick={() => setActiveTab('backlog')}
        >
          Backlog
        </button>
      </div>

      {/* Tab Content */}
      <div className="edit-body">
        {/* ===== THIS MONTH ===== */}
        {activeTab === 'month' && (
          <div className="edit-section">
            <h3 className="edit-section-title">{monthLabel} Goals</h3>
            <p className="edit-section-desc">
              Tasks to complete this month. These won't clutter your daily view.
            </p>

            {monthlyTasks.length === 0 && monthlyCompleted.length === 0 && (
              <p className="edit-empty">No monthly goals yet. Add one below or assign from backlog.</p>
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
                <h4 className="edit-completed-label">Completed ({monthlyCompleted.length})</h4>
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
                placeholder="Add a monthly goal..."
                className="edit-add-input"
                autoComplete="off"
              />
              <button type="submit" className="edit-add-btn">+</button>
            </form>
          </div>
        )}

        {/* ===== ROUTINE ===== */}
        {activeTab === 'routine' && (
          <div className="edit-section">
            <h3 className="edit-section-title">Weekly Routine</h3>
            <p className="edit-section-desc">
              Your recurring schedule. These tasks auto-generate each week.
            </p>

            {routineByDay.map(group => (
              <div key={group.day} className="routine-day">
                <h4 className="routine-day-label">{group.label}</h4>
                {group.templates.map(tmpl => (
                  <div key={tmpl.id} className="routine-item">
                    <div className="routine-item-header">
                      <span className="routine-item-title">{tmpl.title}</span>
                      {tmpl.estimatedMinutes && (
                        <span className="routine-item-time">{formatMinutes(tmpl.estimatedMinutes)}</span>
                      )}
                    </div>
                    {tmpl.defaultSubtasks.length > 0 && (
                      <ul className="routine-subtasks">
                        {tmpl.defaultSubtasks.map((sub, i) => (
                          <li key={i} className="routine-sub">{sub}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* ===== BACKLOG ===== */}
        {activeTab === 'backlog' && (
          <div className="edit-section">
            <h3 className="edit-section-title">Backlog ({backlogTasks.length})</h3>
            <p className="edit-section-desc">
              Unscheduled tasks. Assign to this month or pull into today.
            </p>

            {backlogTasks.length === 0 && (
              <p className="edit-empty">Backlog is empty. Nice work!</p>
            )}

            {backlogTasks.map(task => (
              <BacklogItem
                key={task.id}
                task={task}
                onSchedule={() => scheduleToday(task.id)}
                onAssignMonth={() => assignToMonth(task.id)}
                onDelete={() => dispatch({ type: 'DELETE_TASK', payload: { taskId: task.id } })}
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

// --- Backlog item ---
function BacklogItem({
  task,
  onSchedule,
  onAssignMonth,
  onDelete,
}: {
  task: Task;
  onSchedule: () => void;
  onAssignMonth: () => void;
  onDelete: () => void;
}) {
  const hasSubs = task.subtasks.length > 0;

  return (
    <div className="backlog-item">
      <div className="backlog-item-row">
        <span className="backlog-title">{task.title}</span>
        {hasSubs && (
          <span className="backlog-sub-count">{task.subtasks.length} sub</span>
        )}
        {task.targetMonth && (
          <span className="backlog-month-tag">{task.targetMonth}</span>
        )}
        <div className="backlog-actions">
          <button className="backlog-btn month" onClick={onAssignMonth} title="Assign to this month">Mo</button>
          <button className="backlog-btn schedule" onClick={onSchedule} title="Schedule today">+</button>
          <button className="backlog-btn delete" onClick={onDelete} title="Delete">&times;</button>
        </div>
      </div>
    </div>
  );
}
