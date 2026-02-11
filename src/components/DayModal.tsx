// ============================================================
// Day Modal - Popup when clicking a calendar day
// Shows tasks, subtasks, progress, and add task input
// ============================================================

import { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { getDayMeta } from '../engine/schedule';
import { getDayOfWeekFromDate } from '../utils/dateUtils';
import { getHolidaysForDate } from '../engine/holidays';
import type { Task } from '../types';

interface DayModalProps {
  dateISO: string;
  onClose: () => void;
}

export default function DayModal({ dateISO, onClose }: DayModalProps) {
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
  const completedCount = completedTasks.length;
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

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

  // Progress bar color
  const progressColor = progress === 100 ? 'var(--color-green)' :
    progress > 0 ? 'var(--color-amber)' : 'var(--color-red)';

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-header-top">
            <div>
              <h2 className="modal-date">{dateLabel}</h2>
              <div className="modal-meta">
                <span className="modal-location">{meta.location}</span>
                {isToday && <span className="modal-badge today">TODAY</span>}
                {meta.isRestDay && <span className="modal-badge rest">REST</span>}
              </div>
            </div>
            <button className="modal-close" onClick={onClose}>&times;</button>
          </div>

          {holidays.length > 0 && (
            <div className="modal-holidays">
              {holidays.map((h, i) => (
                <span key={i} className={`modal-holiday-tag type-${h.type}`}>
                  {h.emoji} {h.name}
                </span>
              ))}
            </div>
          )}

          {/* Progress */}
          {totalCount > 0 && (
            <div className="modal-progress">
              <div className="modal-progress-bar">
                <div
                  className="modal-progress-fill"
                  style={{ width: `${progress}%`, background: progressColor }}
                />
              </div>
              <span className="modal-progress-text">{completedCount}/{totalCount} done</span>
            </div>
          )}
        </div>

        {/* Body */}
        <div className="modal-body">
          {meta.isRestDay && totalCount === 0 ? (
            <div className="modal-rest">
              <p className="modal-rest-title">Rest & Recovery</p>
              <p className="modal-rest-desc">{meta.notes}</p>
            </div>
          ) : (
            <>
              {activeTasks.length === 0 && completedTasks.length === 0 && (
                <p className="modal-empty">No tasks. Add one below.</p>
              )}

              {activeTasks.map(task => (
                <ModalTaskItem
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
                <div className="modal-completed-section">
                  <h3 className="modal-section-label">Completed ({completedTasks.length})</h3>
                  {completedTasks.map(task => (
                    <ModalTaskItem
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
          )}
        </div>

        {/* Add Task Footer */}
        {!meta.isRestDay && (
          <form className="modal-footer" onSubmit={handleAddTask}>
            <span className="modal-add-icon">+</span>
            <input
              type="text"
              value={newTaskTitle}
              onChange={e => setNewTaskTitle(e.target.value)}
              placeholder="Add a task..."
              className="modal-add-input"
              autoComplete="off"
              autoFocus
            />
          </form>
        )}
      </div>
    </div>
  );
}

// --- Task item within the modal ---

function ModalTaskItem({
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
