// ============================================================
// Edit Panel Component
// Full task management: add, edit, organize, manage projects
// "Backend" mode for heavy lifting
// ============================================================

import { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { getDayOfWeekFromDate } from '../utils/dateUtils';
import { getDayMeta } from '../engine/schedule';
import { getHolidaysForDate } from '../engine/holidays';
import QuickAdd from './QuickAdd';
import type { Task, TaskCategory, Priority, WorkType } from '../types';

const CATEGORY_LABELS: Record<TaskCategory, string> = {
  documentary_writing: 'Doc Writing',
  documentary_editing: 'Doc Editing',
  documentary_research: 'Doc Research',
  livestream_editing: 'Stream Edit',
  livestream_publishing: 'Stream Publish',
  virtual_production_planning: 'VP Planning',
  virtual_production_creative: 'VP Creative',
  networking: 'Networking',
  admin: 'Admin',
  phone_call: 'Phone Call',
  other: 'Other',
};

export default function EditPanel() {
  const { state, dispatch } = useAppStore();
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [newSubtaskInputs, setNewSubtaskInputs] = useState<Record<string, string>>({});

  const selectedDate = state.selectedDate;
  const date = new Date(selectedDate + 'T12:00:00');
  const dayOfWeek = getDayOfWeekFromDate(date);
  const meta = getDayMeta(dayOfWeek);
  const holidays = getHolidaysForDate(selectedDate);

  // All tasks for this date
  const dateTasks = state.tasks.filter(t => t.scheduledDate === selectedDate && !t.isBacklog);
  const backlogTasks = state.tasks.filter(t => t.isBacklog);

  const dateLabel = date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const handleAddSubtask = (taskId: string) => {
    const title = (newSubtaskInputs[taskId] || '').trim();
    if (!title) return;
    dispatch({ type: 'ADD_SUBTASK', payload: { taskId, title } });
    setNewSubtaskInputs(prev => ({ ...prev, [taskId]: '' }));
  };

  return (
    <div className="edit-panel">
      {/* Header */}
      <div className="edit-header">
        <h2 className="edit-date">{dateLabel}</h2>
        <div className="edit-meta">
          <span className="edit-location">{meta.location}</span>
          {meta.isRestDay && <span className="edit-rest-badge">REST</span>}
        </div>
        {holidays.length > 0 && (
          <div className="edit-holidays">
            {holidays.map((h, i) => (
              <span key={i} className={`edit-holiday holiday-${h.type}`}>
                {h.emoji} {h.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Quick Add */}
      <div className="edit-quick-add">
        <QuickAdd />
      </div>

      {/* Tasks for this date */}
      <div className="edit-tasks-section">
        <h3 className="edit-section-title">
          Tasks ({dateTasks.length})
        </h3>

        {dateTasks.length === 0 ? (
          <p className="edit-empty">No tasks for this day. Use Quick Add above.</p>
        ) : (
          <div className="edit-task-list">
            {dateTasks.map(task => (
              <EditTaskCard
                key={task.id}
                task={task}
                isEditing={editingTask === task.id}
                onToggleEdit={() => setEditingTask(editingTask === task.id ? null : task.id)}
                subtaskInput={newSubtaskInputs[task.id] || ''}
                onSubtaskInputChange={(v) => setNewSubtaskInputs(prev => ({ ...prev, [task.id]: v }))}
                onAddSubtask={() => handleAddSubtask(task.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Backlog preview */}
      {backlogTasks.length > 0 && (
        <div className="edit-tasks-section">
          <h3 className="edit-section-title">
            Backlog ({backlogTasks.length})
          </h3>
          <div className="edit-task-list">
            {backlogTasks.slice(0, 5).map(task => (
              <div key={task.id} className="edit-backlog-item">
                <span className="edit-backlog-title">{task.title}</span>
                <button
                  className="btn-sm btn-activate"
                  onClick={() => {
                    dispatch({ type: 'MOVE_FROM_BACKLOG', payload: { taskId: task.id } });
                    dispatch({
                      type: 'EDIT_TASK',
                      payload: { taskId: task.id, updates: { scheduledDate: selectedDate } },
                    });
                  }}
                >
                  Pull In
                </button>
              </div>
            ))}
            {backlogTasks.length > 5 && (
              <p className="edit-backlog-more">+{backlogTasks.length - 5} more in backlog</p>
            )}
          </div>
        </div>
      )}

      {/* Projects overview */}
      <div className="edit-tasks-section">
        <h3 className="edit-section-title">Projects</h3>
        <div className="edit-projects-list">
          {state.projects.filter(p => p.status === 'active').map(project => {
            const pTasks = state.tasks.filter(t => t.projectId === project.id && !t.completed);
            return (
              <div key={project.id} className="edit-project-item" style={{ borderLeftColor: project.color }}>
                <span className="edit-project-name">{project.name}</span>
                <span className="edit-project-count">{pTasks.length} active</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// --- Edit Task Card ---

function EditTaskCard({
  task,
  isEditing,
  onToggleEdit,
  subtaskInput,
  onSubtaskInputChange,
  onAddSubtask,
}: {
  task: Task;
  isEditing: boolean;
  onToggleEdit: () => void;
  subtaskInput: string;
  onSubtaskInputChange: (v: string) => void;
  onAddSubtask: () => void;
}) {
  const { state, dispatch } = useAppStore();
  const project = task.projectId ? state.projects.find(p => p.id === task.projectId) : null;

  return (
    <div className={`edit-task-card ${task.completed ? 'completed' : ''} priority-${task.priority}`}>
      <div className="edit-task-header" onClick={onToggleEdit}>
        <button
          className={`edit-checkbox ${task.completed ? 'checked' : ''}`}
          onClick={e => {
            e.stopPropagation();
            dispatch({
              type: task.completed ? 'UNCOMPLETE_TASK' : 'COMPLETE_TASK',
              payload: { taskId: task.id },
            });
          }}
        >
          {task.completed && '\u2713'}
        </button>

        <div className="edit-task-info">
          <span className={`edit-task-title ${task.completed ? 'done' : ''}`}>
            {task.title}
          </span>
          <div className="edit-task-badges">
            {project && (
              <span className="edit-badge project" style={{ color: project.color }}>
                {project.name}
              </span>
            )}
            <span className="edit-badge category">{CATEGORY_LABELS[task.category]}</span>
            <span className={`edit-badge priority-${task.priority}`}>
              {task.priority.toUpperCase()}
            </span>
          </div>
        </div>

        {task.subtasks.length > 0 && (
          <span className="edit-sub-indicator">
            {task.subtasks.filter(s => s.completed).length}/{task.subtasks.length}
          </span>
        )}

        <span className={`edit-expand ${isEditing ? 'open' : ''}`}>&rsaquo;</span>
      </div>

      {isEditing && (
        <div className="edit-task-body">
          {/* Subtasks */}
          <div className="edit-subtasks">
            {task.subtasks.map(sub => (
              <div key={sub.id} className={`edit-subtask ${sub.completed ? 'completed' : ''}`}>
                <button
                  className={`edit-sub-check ${sub.completed ? 'checked' : ''}`}
                  onClick={() =>
                    dispatch({
                      type: 'TOGGLE_SUBTASK',
                      payload: { taskId: task.id, subtaskId: sub.id },
                    })
                  }
                >
                  {sub.completed && '\u2713'}
                </button>
                <span className={sub.completed ? 'done' : ''}>{sub.title}</span>
                <button
                  className="edit-sub-delete"
                  onClick={() =>
                    dispatch({
                      type: 'DELETE_SUBTASK',
                      payload: { taskId: task.id, subtaskId: sub.id },
                    })
                  }
                >
                  &times;
                </button>
              </div>
            ))}

            <div className="edit-add-subtask">
              <input
                type="text"
                value={subtaskInput}
                onChange={e => onSubtaskInputChange(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') { e.preventDefault(); onAddSubtask(); }
                }}
                placeholder="Add subtask..."
                className="edit-sub-input"
                autoComplete="off"
              />
              <button className="edit-sub-add-btn" onClick={onAddSubtask}>+</button>
            </div>
          </div>

          {/* Quick edit fields */}
          <div className="edit-fields">
            <div className="edit-field">
              <label>Priority</label>
              <select
                value={task.priority}
                onChange={e =>
                  dispatch({
                    type: 'EDIT_TASK',
                    payload: { taskId: task.id, updates: { priority: e.target.value as Priority } },
                  })
                }
              >
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div className="edit-field">
              <label>Category</label>
              <select
                value={task.category}
                onChange={e =>
                  dispatch({
                    type: 'EDIT_TASK',
                    payload: { taskId: task.id, updates: { category: e.target.value as TaskCategory } },
                  })
                }
              >
                {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
            <div className="edit-field">
              <label>Work Type</label>
              <select
                value={task.workType}
                onChange={e =>
                  dispatch({
                    type: 'EDIT_TASK',
                    payload: { taskId: task.id, updates: { workType: e.target.value as WorkType } },
                  })
                }
              >
                <option value="deep_focus">Deep Focus</option>
                <option value="moderate_focus">Moderate Focus</option>
                <option value="light">Light</option>
                <option value="phone_only">Phone Only</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>

          {/* Actions */}
          <div className="edit-actions">
            {!task.completed && (
              <button
                className="btn-sm btn-backlog"
                onClick={() => dispatch({ type: 'MOVE_TO_BACKLOG', payload: { taskId: task.id } })}
              >
                To Backlog
              </button>
            )}
            <button
              className="btn-sm btn-delete"
              onClick={() => dispatch({ type: 'DELETE_TASK', payload: { taskId: task.id } })}
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
