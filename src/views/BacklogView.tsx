// ============================================================
// Backlog View
// Admin and long-term tasks with monthly review
// ============================================================

import { useAppStore } from '../store/useAppStore';
import TaskCard from '../components/TaskCard';

export default function BacklogView() {
  const { state } = useAppStore();

  const backlogTasks = state.tasks.filter(t => t.isBacklog && !t.completed);
  const completedBacklog = state.tasks.filter(t => t.isBacklog && t.completed);

  // Next monthly review date (first of next month)
  const now = new Date();
  const nextReview = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const daysUntilReview = Math.ceil((nextReview.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  return (
    <div className="backlog-view">
      <header className="backlog-header">
        <h1 className="view-title">Backlog</h1>
        <p className="view-subtitle">
          Admin tasks, long-term items, and tasks without deadlines.
          These are not auto-scheduled — move them to active when ready.
        </p>
        <div className="review-notice">
          <span className="review-icon">&#x1F4C5;</span>
          Next monthly review: {nextReview.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
          <span className="review-days">({daysUntilReview} days)</span>
        </div>
      </header>

      <section className="backlog-section">
        <h2 className="section-title">Pending ({backlogTasks.length})</h2>
        {backlogTasks.length === 0 ? (
          <p className="empty-state">No backlog items. Add admin or long-term tasks with "whenever" deadline.</p>
        ) : (
          <div className="task-list">
            {backlogTasks.map(task => (
              <TaskCard key={task.id} task={task} showScheduling={false} />
            ))}
          </div>
        )}
      </section>

      {completedBacklog.length > 0 && (
        <section className="backlog-section">
          <h2 className="section-title">Completed ({completedBacklog.length})</h2>
          <div className="task-list">
            {completedBacklog.map(task => (
              <TaskCard key={task.id} task={task} showScheduling={false} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
