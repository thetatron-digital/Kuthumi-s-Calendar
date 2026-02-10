// ============================================================
// Projects View
// Active, On Hold, and Archived projects with task management
// ============================================================

import { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import type { ProjectStatus } from '../types';
import TaskCard from '../components/TaskCard';

const PROJECT_COLORS = [
  '#8B5CF6', '#EC4899', '#06B6D4', '#10B981', '#F59E0B',
  '#EF4444', '#6366F1', '#14B8A6', '#F97316', '#84CC16',
];

export default function ProjectsView() {
  const { state, dispatch } = useAppStore();
  const [showAddProject, setShowAddProject] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newColor, setNewColor] = useState(PROJECT_COLORS[0]);
  const [expandedProject, setExpandedProject] = useState<string | null>(null);

  const activeProjects = state.projects.filter(p => p.status === 'active');
  const onHoldProjects = state.projects.filter(p => p.status === 'on_hold');
  const archivedProjects = state.projects.filter(p => p.status === 'archived');

  const handleAddProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    dispatch({
      type: 'ADD_PROJECT',
      payload: { name: newName.trim(), description: newDesc.trim() || undefined, color: newColor },
    });
    setNewName('');
    setNewDesc('');
    setShowAddProject(false);
  };

  const getProjectTasks = (projectId: string) => {
    return state.tasks.filter(t => t.projectId === projectId);
  };

  const handleStatusChange = (projectId: string, status: ProjectStatus) => {
    dispatch({ type: 'UPDATE_PROJECT_STATUS', payload: { projectId, status } });
  };

  return (
    <div className="projects-view">
      <header className="projects-header">
        <h1 className="view-title">Projects</h1>
        <button className="btn-primary" onClick={() => setShowAddProject(!showAddProject)}>
          {showAddProject ? 'Cancel' : '+ New Project'}
        </button>
      </header>

      {showAddProject && (
        <form className="add-project-form" onSubmit={handleAddProject}>
          <input
            type="text"
            placeholder="Project name"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            className="input"
            autoFocus
          />
          <input
            type="text"
            placeholder="Description (optional)"
            value={newDesc}
            onChange={e => setNewDesc(e.target.value)}
            className="input"
          />
          <div className="color-picker">
            {PROJECT_COLORS.map(color => (
              <button
                key={color}
                type="button"
                className={`color-swatch ${newColor === color ? 'selected' : ''}`}
                style={{ background: color }}
                onClick={() => setNewColor(color)}
              />
            ))}
          </div>
          <button type="submit" className="btn-primary" disabled={!newName.trim()}>
            Create Project
          </button>
        </form>
      )}

      {/* Active Projects */}
      <section className="projects-section">
        <h2 className="section-title">Active Projects ({activeProjects.length})</h2>
        {activeProjects.length === 0 ? (
          <p className="empty-state">No active projects. Create one to start organizing tasks.</p>
        ) : (
          <div className="projects-list">
            {activeProjects.map(project => {
              const tasks = getProjectTasks(project.id);
              const activeTasks = tasks.filter(t => !t.completed);
              const completedTasks = tasks.filter(t => t.completed);
              const isExpanded = expandedProject === project.id;

              return (
                <div key={project.id} className="project-card">
                  <div
                    className="project-card-header"
                    onClick={() => setExpandedProject(isExpanded ? null : project.id)}
                    style={{ borderLeftColor: project.color }}
                  >
                    <div className="project-info">
                      <h3 className="project-name">{project.name}</h3>
                      {project.description && <p className="project-desc">{project.description}</p>}
                      <span className="project-task-count">
                        {activeTasks.length} active / {completedTasks.length} completed
                      </span>
                    </div>
                    <div className="project-actions">
                      <button
                        className="btn-sm btn-hold"
                        onClick={e => { e.stopPropagation(); handleStatusChange(project.id, 'on_hold'); }}
                      >
                        Hold
                      </button>
                      <button
                        className="btn-sm btn-archive"
                        onClick={e => { e.stopPropagation(); handleStatusChange(project.id, 'archived'); }}
                      >
                        Archive
                      </button>
                      <span className="expand-arrow">{isExpanded ? '\u25B2' : '\u25BC'}</span>
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="project-card-body">
                      {activeTasks.length > 0 ? (
                        activeTasks.map(task => (
                          <TaskCard key={task.id} task={task} />
                        ))
                      ) : (
                        <p className="empty-state">No active tasks. Add tasks using Quick Add.</p>
                      )}
                      {completedTasks.length > 0 && (
                        <details className="completed-tasks-details">
                          <summary>Completed ({completedTasks.length})</summary>
                          {completedTasks.map(task => (
                            <TaskCard key={task.id} task={task} compact />
                          ))}
                        </details>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* On Hold & Archived */}
      {(onHoldProjects.length > 0 || archivedProjects.length > 0) && (
        <section className="projects-section historical">
          <h2 className="section-title">Historical</h2>

          {onHoldProjects.length > 0 && (
            <div className="projects-subsection">
              <h3 className="subsection-title">On Hold ({onHoldProjects.length})</h3>
              {onHoldProjects.map(project => (
                <div key={project.id} className="project-card muted" style={{ borderLeftColor: project.color }}>
                  <div className="project-card-header">
                    <div className="project-info">
                      <h3 className="project-name">{project.name}</h3>
                      <span className="project-status-badge on-hold">ON HOLD</span>
                    </div>
                    <div className="project-actions">
                      <button
                        className="btn-sm btn-activate"
                        onClick={() => handleStatusChange(project.id, 'active')}
                      >
                        Reactivate
                      </button>
                      <button
                        className="btn-sm btn-archive"
                        onClick={() => handleStatusChange(project.id, 'archived')}
                      >
                        Archive
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {archivedProjects.length > 0 && (
            <div className="projects-subsection">
              <h3 className="subsection-title">Archived ({archivedProjects.length})</h3>
              {archivedProjects.map(project => (
                <div key={project.id} className="project-card muted" style={{ borderLeftColor: project.color }}>
                  <div className="project-card-header">
                    <div className="project-info">
                      <h3 className="project-name">{project.name}</h3>
                      <span className="project-status-badge archived">ARCHIVED</span>
                    </div>
                    <div className="project-actions">
                      <button
                        className="btn-sm btn-activate"
                        onClick={() => handleStatusChange(project.id, 'active')}
                      >
                        Reactivate
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
