// ============================================================
// Day Panel - Inline panel that slides down from calendar
// Shows tasks, subtasks, progress, and add task input
// ============================================================

import { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { getDayMeta } from '../engine/schedule';
import { getDayOfWeekFromDate } from '../utils/dateUtils';
import { getHolidaysForDate } from '../engine/holidays';
import type { Task } from '../types';

interface DayPanelProps {
  dateISO: string;
  onClose: () => void;
}

export default function DayPanel({ dateISO, onClose }: DayPanelProps) {
  const { state, dispatch } = useAppStore();
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [subInputs, setSubInputs] = useState<Record<string, string>>({});

  const date = new Date(dateISO + 'T12:00:00');
  const dayOfWeek = getDayOfWeekFromDate(date);
  const meta = getDayMeta(dayOfWeek);
  const holidays = getHolidaysForDate(dateISO);
  const todayISO = new Date().toISOString().split('T')[0];
  const isToday = dateISO === todayISO;

  const dateTasks = state.tasks.filter(t => t.scheduledDate === dateISO && !t.isBacklog);
  const activeTasks = dateTasks.filter(t => !t.completed);
  const completedTasks = dateTasks.filter(t => t.completed);
  const totalCount = dateTasks.length;

  // Count every subtask as an individual unit; tasks without subtasks count as 1 unit
  let progress = 0;
  if (totalCount > 0) {
    let totalUnits = 0;
    let doneUnits = 0;
    for (const t of dateTasks) {
      if (t.subtasks.length > 0) {
        totalUnits += t.subtasks.length;
        doneUnits += t.subtasks.filter(s => s.completed).length;
      } else {
        totalUnits += 1;
        if (t.completed) doneUnits += 1;
      }
    }
    progress = totalUnits > 0 ? Math.round((doneUnits / totalUnits) * 100) : 0;
  }

  const dateLabel = date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const toggleExpand = (id: string) => {
    setExpandedTasks(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    dispatch({
      type: 'ADD_TASK_SIMPLE',
      payload: { title: newTaskTitle.trim(), scheduledDate: dateISO },
    });
    setNewTaskTitle('');
  };

  const handleAddSubtask = (taskId: string) => {
    const title = (subInputs[taskId] || '').trim();
    if (!title) return;
    dispatch({ type: 'ADD_SUBTASK', payload: { taskId, title } });
    setSubInputs(prev => ({ ...prev, [taskId]: '' }));
  };

  // Progress bar style: solid green at 100%, developing gradient otherwise
  const panelBarStyle: React.CSSProperties = progress >= 100
    ? { width: '100%', background: '#22c55e' }
    : progress <= 0
      ? { width: `${Math.max(progress, 4)}%`, background: '#ef4444' }
      : {
          width: `${Math.max(progress, 4)}%`,
          background: 'linear-gradient(90deg, #ef4444, #f59e0b, #22c55e)',
          backgroundSize: `${Math.round((1 / (progress / 100)) * 100)}% 100%`,
        };

  return (
    <div className="day-panel">
      {/* Header */}
      <div className="panel-header">
        <div className="panel-header-top">
          <div>
            <h2 className="panel-date">{dateLabel}</h2>
            <div className="panel-meta">
              <span className="panel-location">{meta.location}</span>
              {isToday && <span className="panel-badge today">TODAY</span>}
              {meta.isRestDay && <span className="panel-badge rest">REST</span>}
            </div>
          </div>
          <button className="panel-close" onClick={onClose}>&times;</button>
        </div>

        {holidays.length > 0 && (
          <div className="panel-holidays">
            {holidays.map((h, i) => (
              <span key={i} className={`modal-holiday-tag type-${h.type}`}>
                {h.emoji} {h.name}
              </span>
            ))}
          </div>
        )}

        {/* Progress */}
        {totalCount > 0 && (
          <div className="panel-progress">
            <div className="panel-progress-bar">
              <div
                className="panel-progress-fill"
                style={panelBarStyle}
              />
            </div>
            <span className="panel-progress-text">{progress}%</span>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="panel-body">
        {meta.isRestDay && totalCount === 0 && (
          <div className="panel-rest">
            <p className="panel-rest-title">Rest & Recovery</p>
            <p className="panel-rest-desc">{meta.notes}</p>
          </div>
        )}

        <>
          {!meta.isRestDay && activeTasks.length === 0 && completedTasks.length === 0 && (
            <p className="panel-empty">No tasks. Add one below.</p>
          )}

          {activeTasks.map(task => (
            <PanelTaskItem
              key={task.id}
              task={task}
              expanded={expandedTasks.has(task.id)}
              onToggle={() => toggleExpand(task.id)}
              subInput={subInputs[task.id] || ''}
              onSubChange={v => setSubInputs(p => ({ ...p, [task.id]: v }))}
              onSubAdd={() => handleAddSubtask(task.id)}
              mode={state.mode}
            />
          ))}

          {completedTasks.length > 0 && (
            <div className="panel-completed-section">
              <h3 className="panel-section-label">Completed ({completedTasks.length})</h3>
              {completedTasks.map(task => (
                <PanelTaskItem
                  key={task.id}
                  task={task}
                  expanded={expandedTasks.has(task.id)}
                  onToggle={() => toggleExpand(task.id)}
                  subInput=""
                  onSubChange={() => {}}
                  onSubAdd={() => {}}
                  mode={state.mode}
                />
              ))}
            </div>
          )}
        </>
      </div>

      {/* Add Task Footer - no autoFocus */}
      <form className="panel-footer" onSubmit={handleAddTask}>
        <span className="panel-add-icon">+</span>
        <input
          type="text"
          value={newTaskTitle}
          onChange={e => setNewTaskTitle(e.target.value)}
          placeholder="Add a task..."
          className="panel-add-input"
          autoComplete="off"
        />
      </form>
    </div>
  );
}

// --- Task item within the panel ---

function PanelTaskItem({
  task,
  expanded,
  onToggle,
  subInput,
  onSubChange,
  onSubAdd,
  mode,
}: {
  task: Task;
  expanded: boolean;
  onToggle: () => void;
  subInput: string;
  onSubChange: (v: string) => void;
  onSubAdd: () => void;
  mode: string;
}) {
  const { dispatch } = useAppStore();
  const hasSubs = task.subtasks.length > 0;
  const doneSubs = task.subtasks.filter(s => s.completed).length;

  return (
    <div className={`mtask ${task.completed ? 'done' : ''} ${task.isRoutine ? 'routine' : ''}`}>
      <div className="mtask-row">
        <button
          className={`mtask-check ${task.completed ? 'checked' : ''}`}
          onClick={() => dispatch({
            type: task.completed ? 'UNCOMPLETE_TASK' : 'COMPLETE_TASK',
            payload: { taskId: task.id },
          })}
        >
          {task.completed && '\u2713'}
        </button>

        <button className={`mtask-title ${task.completed ? 'struck' : ''}`} onClick={onToggle}>
          {task.title}
        </button>

        {hasSubs && <span className="mtask-sub-badge">{doneSubs}/{task.subtasks.length}</span>}

        {(hasSubs || !task.completed) && (
          <button className={`mtask-chevron ${expanded ? 'open' : ''}`} onClick={onToggle}>
            &rsaquo;
          </button>
        )}
      </div>

      {expanded && (
        <div className="mtask-subs">
          {task.subtasks.map(sub => (
            <div key={sub.id} className={`msub ${sub.completed ? 'done' : ''}`}>
              <button
                className={`msub-check ${sub.completed ? 'checked' : ''}`}
                onClick={() => dispatch({
                  type: 'TOGGLE_SUBTASK',
                  payload: { taskId: task.id, subtaskId: sub.id },
                })}
              >
                {sub.completed && '\u2713'}
              </button>
              <span className={`msub-title ${sub.completed ? 'struck' : ''}`}>{sub.title}</span>
              {mode === 'edit' && !task.completed && (
                <button
                  className="msub-del"
                  onClick={() => dispatch({
                    type: 'DELETE_SUBTASK',
                    payload: { taskId: task.id, subtaskId: sub.id },
                  })}
                >
                  &times;
                </button>
              )}
            </div>
          ))}

          {!task.completed && (
            <div className="msub-add">
              <input
                type="text"
                value={subInput}
                onChange={e => onSubChange(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); onSubAdd(); } }}
                placeholder="Add subtask..."
                className="msub-input"
                autoComplete="off"
              />
            </div>
          )}

          {mode === 'edit' && !task.completed && (
            <div className="mtask-actions">
              <button
                className="mtask-act-btn delete"
                onClick={() => dispatch({ type: 'DELETE_TASK', payload: { taskId: task.id } })}
              >
                Delete
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
