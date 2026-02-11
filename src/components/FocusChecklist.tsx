// ============================================================
// Focus Checklist Component
// Simple daily task list with collapsible subtasks
// "Front-facing" mode - just check off tasks
// ============================================================

import { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { getDayMeta } from '../engine/schedule';
import { getDayOfWeekFromDate } from '../utils/dateUtils';
import { getHolidaysForDate } from '../engine/holidays';
import type { Task } from '../types';

export default function FocusChecklist() {
  const { state, dispatch } = useAppStore();
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [newSubtaskInputs, setNewSubtaskInputs] = useState<Record<string, string>>({});

  const selectedDate = state.selectedDate;
  const date = new Date(selectedDate + 'T12:00:00');
  const dayOfWeek = getDayOfWeekFromDate(date);
  const meta = getDayMeta(dayOfWeek);
  const holidays = getHolidaysForDate(selectedDate);
  const todayISO = new Date().toISOString().split('T')[0];
  const isToday = selectedDate === todayISO;

  // Get tasks for selected date
  const dateTasks = state.tasks.filter(t => t.scheduledDate === selectedDate && !t.isBacklog);
  const activeTasks = dateTasks.filter(t => !t.completed);
  const completedTasks = dateTasks.filter(t => t.completed);

  const dateLabel = date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const toggleExpand = (taskId: string) => {
    setExpandedTasks(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    dispatch({
      type: 'ADD_TASK_SIMPLE',
      payload: { title: newTaskTitle.trim(), scheduledDate: selectedDate },
    });
    setNewTaskTitle('');
  };

  const handleAddSubtask = (taskId: string) => {
    const title = (newSubtaskInputs[taskId] || '').trim();
    if (!title) return;
    dispatch({ type: 'ADD_SUBTASK', payload: { taskId, title } });
    setNewSubtaskInputs(prev => ({ ...prev, [taskId]: '' }));
  };

  const completedCount = completedTasks.length;
  const totalCount = dateTasks.length;
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="focus-checklist">
      {/* Date Header */}
      <div className="focus-header">
        <div className="focus-date-row">
          <h2 className="focus-date">{dateLabel}</h2>
          {isToday && <span className="focus-today-badge">TODAY</span>}
        </div>

        <div className="focus-meta">
          <span className="focus-location">{meta.location}</span>
          {meta.isRestDay && <span className="focus-rest-badge">REST DAY</span>}
        </div>

        {holidays.length > 0 && (
          <div className="focus-holidays">
            {holidays.map((h, i) => (
              <span key={i} className={`focus-holiday holiday-${h.type}`}>
                {h.emoji} {h.name}
              </span>
            ))}
          </div>
        )}

        {/* Progress bar */}
        {totalCount > 0 && (
          <div className="focus-progress">
            <div className="focus-progress-bar">
              <div className="focus-progress-fill" style={{ width: `${progress}%` }} />
            </div>
            <span className="focus-progress-text">{completedCount}/{totalCount}</span>
          </div>
        )}
      </div>

      {/* Rest day message */}
      {meta.isRestDay ? (
        <div className="focus-rest-message">
          <p>{meta.notes}</p>
          <p className="focus-rest-sub">No tasks scheduled. Recharge.</p>
        </div>
      ) : (
        <>
          {/* Active tasks */}
          <div className="focus-tasks">
            {activeTasks.length === 0 && completedTasks.length === 0 && (
              <p className="focus-empty">No tasks for this day. Add one below.</p>
            )}

            {activeTasks.map(task => (
              <FocusTaskItem
                key={task.id}
                task={task}
                expanded={expandedTasks.has(task.id)}
                onToggleExpand={() => toggleExpand(task.id)}
                subtaskInput={newSubtaskInputs[task.id] || ''}
                onSubtaskInputChange={(v) => setNewSubtaskInputs(prev => ({ ...prev, [task.id]: v }))}
                onAddSubtask={() => handleAddSubtask(task.id)}
              />
            ))}
          </div>

          {/* Completed tasks (collapsed) */}
          {completedTasks.length > 0 && (
            <div className="focus-completed-section">
              <h3 className="focus-completed-header">
                Completed ({completedTasks.length})
              </h3>
              {completedTasks.map(task => (
                <FocusTaskItem
                  key={task.id}
                  task={task}
                  expanded={expandedTasks.has(task.id)}
                  onToggleExpand={() => toggleExpand(task.id)}
                  subtaskInput=""
                  onSubtaskInputChange={() => {}}
                  onAddSubtask={() => {}}
                />
              ))}
            </div>
          )}

          {/* Add task input */}
          <form className="focus-add-form" onSubmit={handleAddTask}>
            <span className="focus-add-icon">+</span>
            <input
              type="text"
              value={newTaskTitle}
              onChange={e => setNewTaskTitle(e.target.value)}
              placeholder="Add a task..."
              className="focus-add-input"
              autoComplete="off"
            />
          </form>
        </>
      )}
    </div>
  );
}

// --- Task Item Sub-component ---

function FocusTaskItem({
  task,
  expanded,
  onToggleExpand,
  subtaskInput,
  onSubtaskInputChange,
  onAddSubtask,
}: {
  task: Task;
  expanded: boolean;
  onToggleExpand: () => void;
  subtaskInput: string;
  onSubtaskInputChange: (v: string) => void;
  onAddSubtask: () => void;
}) {
  const { dispatch } = useAppStore();
  const hasSubtasks = task.subtasks.length > 0;
  const completedSubs = task.subtasks.filter(s => s.completed).length;
  const totalSubs = task.subtasks.length;

  return (
    <div className={`focus-task ${task.completed ? 'completed' : ''}`}>
      <div className="focus-task-row">
        <button
          className={`focus-checkbox ${task.completed ? 'checked' : ''}`}
          onClick={() =>
            dispatch({
              type: task.completed ? 'UNCOMPLETE_TASK' : 'COMPLETE_TASK',
              payload: { taskId: task.id },
            })
          }
        >
          {task.completed && '\u2713'}
        </button>

        <button
          className={`focus-task-title ${task.completed ? 'done' : ''}`}
          onClick={onToggleExpand}
        >
          {task.title}
        </button>

        {hasSubtasks && (
          <span className="focus-sub-count">
            {completedSubs}/{totalSubs}
          </span>
        )}

        {(hasSubtasks || !task.completed) && (
          <button className={`focus-expand-btn ${expanded ? 'open' : ''}`} onClick={onToggleExpand}>
            &rsaquo;
          </button>
        )}
      </div>

      {/* Subtasks */}
      {expanded && (
        <div className="focus-subtasks">
          {task.subtasks.map(sub => (
            <div key={sub.id} className={`focus-subtask ${sub.completed ? 'completed' : ''}`}>
              <button
                className={`focus-sub-checkbox ${sub.completed ? 'checked' : ''}`}
                onClick={() =>
                  dispatch({
                    type: 'TOGGLE_SUBTASK',
                    payload: { taskId: task.id, subtaskId: sub.id },
                  })
                }
              >
                {sub.completed && '\u2713'}
              </button>
              <span className={`focus-sub-title ${sub.completed ? 'done' : ''}`}>
                {sub.title}
              </span>
              {!task.completed && (
                <button
                  className="focus-sub-delete"
                  onClick={() =>
                    dispatch({
                      type: 'DELETE_SUBTASK',
                      payload: { taskId: task.id, subtaskId: sub.id },
                    })
                  }
                >
                  &times;
                </button>
              )}
            </div>
          ))}

          {/* Add subtask input */}
          {!task.completed && (
            <div className="focus-add-subtask">
              <input
                type="text"
                value={subtaskInput}
                onChange={e => onSubtaskInputChange(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    onAddSubtask();
                  }
                }}
                placeholder="Add subtask..."
                className="focus-sub-input"
                autoComplete="off"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
