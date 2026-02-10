// ============================================================
// Task Card Component
// Displays a single task with actions
// ============================================================

import type { Task } from '../types';
import { useAppStore } from '../store/useAppStore';
import { formatDeadline, dayLabel } from '../utils/dateUtils';

interface TaskCardProps {
  task: Task;
  showScheduling?: boolean;
  compact?: boolean;
}

export default function TaskCard({ task, showScheduling = true, compact = false }: TaskCardProps) {
  const { state, dispatch } = useAppStore();

  const project = task.projectId
    ? state.projects.find(p => p.id === task.projectId)
    : null;

  const handleComplete = () => {
    dispatch({ type: 'COMPLETE_TASK', payload: { taskId: task.id } });
  };

  const handleUncomplete = () => {
    dispatch({ type: 'UNCOMPLETE_TASK', payload: { taskId: task.id } });
  };

  const handleDelete = () => {
    dispatch({ type: 'DELETE_TASK', payload: { taskId: task.id } });
  };

  const handleMoveToBacklog = () => {
    dispatch({ type: 'MOVE_TO_BACKLOG', payload: { taskId: task.id } });
  };

  const handleMoveFromBacklog = () => {
    dispatch({ type: 'MOVE_FROM_BACKLOG', payload: { taskId: task.id } });
  };

  const priorityClass = `priority-${task.priority}`;
  const categoryLabel = task.category.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  return (
    <div className={`task-card ${priorityClass} ${task.completed ? 'completed' : ''} ${compact ? 'compact' : ''}`}>
      <div className="task-card-header">
        <button
          className={`task-checkbox ${task.completed ? 'checked' : ''}`}
          onClick={task.completed ? handleUncomplete : handleComplete}
          title={task.completed ? 'Mark incomplete' : 'Mark complete'}
        >
          {task.completed ? '\u2713' : ''}
        </button>
        <div className="task-card-title-area">
          <h4 className={`task-title ${task.completed ? 'line-through' : ''}`}>
            {task.title}
          </h4>
          <div className="task-meta">
            {project && (
              <span className="task-project-badge" style={{ borderColor: project.color, color: project.color }}>
                {project.name}
              </span>
            )}
            <span className="task-category-badge">{categoryLabel}</span>
            {task.isPhoneTask && <span className="task-phone-badge">Phone</span>}
          </div>
        </div>
      </div>

      {!compact && (
        <div className="task-card-body">
          <div className="task-details">
            <span className={`task-deadline ${task.deadline.type === 'asap' ? 'urgent' : ''}`}>
              {formatDeadline(task.deadline)}
            </span>
            {showScheduling && task.assignedDay && (
              <span className="task-assignment">
                {dayLabel(task.assignedDay)} {task.assignedTimeBlock}
              </span>
            )}
          </div>

          {showScheduling && task.schedulingReason && (
            <p className="task-reason">{task.schedulingReason}</p>
          )}

          <div className="task-actions">
            {!task.completed && (
              <>
                {task.isBacklog ? (
                  <button className="btn-sm btn-activate" onClick={handleMoveFromBacklog}>
                    Activate
                  </button>
                ) : (
                  <button className="btn-sm btn-backlog" onClick={handleMoveToBacklog}>
                    To Backlog
                  </button>
                )}
              </>
            )}
            <button className="btn-sm btn-delete" onClick={handleDelete}>
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
