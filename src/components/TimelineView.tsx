// ============================================================
// Timeline View - Vertical time-blocking day view
// Structured-inspired: color-coded blocks, real-time now line,
// drag-to-reschedule, inbox for unscheduled tasks
// ============================================================

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '../store/useAppStore';
import { getDayMeta, WEEKLY_WINDOWS } from '../engine/schedule';
import { getDayOfWeekFromDate } from '../utils/dateUtils';
import { getTaskIcon, getTaskColor } from '../utils/taskIcons';
import { getHolidaysForDate } from '../engine/holidays';
import type { Task, TimelineLayout } from '../types';

const HOUR_HEIGHTS: Record<TimelineLayout, number> = {
  full: 64,
  simplified: 52,
  minimal: 44,
};

const SNAP_MINUTES = 15;

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function formatTime12(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return m === 0 ? `${h12} ${period}` : `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

function snapToInterval(minutes: number): number {
  return Math.round(minutes / SNAP_MINUTES) * SNAP_MINUTES;
}

interface TimelineViewProps {
  dateISO: string;
}

export default function TimelineView({ dateISO }: TimelineViewProps) {
  const { state, dispatch } = useAppStore();
  const layout = state.settings.timelineLayout;
  const hourHeight = HOUR_HEIGHTS[layout];

  const date = new Date(dateISO + 'T12:00:00');
  const dayOfWeek = getDayOfWeekFromDate(date);
  const meta = getDayMeta(dayOfWeek);
  const holidays = getHolidaysForDate(dateISO);
  const windows = WEEKLY_WINDOWS[dayOfWeek];

  const todayISO = new Date().toISOString().split('T')[0];
  const isToday = dateISO === todayISO;

  // Determine visible hour range based on day's time windows
  const windowStarts = windows.map(w => w.startHour);
  const windowEnds = windows.map(w => w.endHour);
  const defaultStart = 8;
  const defaultEnd = 24;
  const rangeStart = windows.length > 0 ? Math.min(...windowStarts, defaultStart) : defaultStart;
  // Handle hours > 24 (overnight windows like 9PM-3AM = 21-27)
  const rawEnd = windows.length > 0 ? Math.max(...windowEnds, defaultEnd) : defaultEnd;
  const rangeEnd = Math.min(rawEnd, 30); // Cap at 6AM next day

  const totalHours = rangeEnd - rangeStart;

  // Tasks for this day
  const dayTasks = state.tasks.filter(t => t.scheduledDate === dateISO && !t.isBacklog);
  const scheduledTasks = dayTasks.filter(t => t.startTime);
  const unscheduledTasks = dayTasks.filter(t => !t.startTime);
  const completedUnscheduled = unscheduledTasks.filter(t => t.completed);
  const activeUnscheduled = unscheduledTasks.filter(t => !t.completed);

  // Real-time now line
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  const nowHour = now.getHours() + now.getMinutes() / 60;
  const nowInRange = isToday && nowHour >= rangeStart && nowHour < rangeEnd;
  const nowTop = (nowHour - rangeStart) * hourHeight;

  // Drag state
  const [dragTaskId, setDragTaskId] = useState<string | null>(null);
  const [dragPreviewTop, setDragPreviewTop] = useState<number | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef<number>(0);
  const dragTaskStartTop = useRef<number>(0);

  // New task creation
  const [newTaskInput, setNewTaskInput] = useState('');
  const [showNewTaskAt, setShowNewTaskAt] = useState<number | null>(null);

  // Expanded task (show subtasks)
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

  const dateLabel = date.toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });

  // Get task position on timeline
  const getTaskTop = (task: Task): number => {
    if (!task.startTime) return 0;
    const mins = timeToMinutes(task.startTime);
    const hours = mins / 60;
    return (hours - rangeStart) * hourHeight;
  };

  const getTaskHeight = (task: Task): number => {
    const duration = task.estimatedMinutes || 30;
    return (duration / 60) * hourHeight;
  };

  // Handle click on empty timeline area to create task
  const handleTimelineClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (dragTaskId) return;
    const target = e.target as HTMLElement;
    if (target.closest('.tl-block') || target.closest('.tl-inbox')) return;

    const rect = timelineRef.current?.getBoundingClientRect();
    if (!rect) return;
    const y = e.clientY - rect.top + (timelineRef.current?.scrollTop || 0);
    const minutes = snapToInterval((y / hourHeight) * 60 + rangeStart * 60);
    setShowNewTaskAt(minutes);
    setNewTaskInput('');
  }, [dragTaskId, hourHeight, rangeStart]);

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskInput.trim() || showNewTaskAt === null) return;
    dispatch({
      type: 'ADD_TASK_SIMPLE',
      payload: { title: newTaskInput.trim(), scheduledDate: dateISO },
    });
    // After creating, set the startTime on the new task (we need to find it by title since it was just created)
    // We'll use a timeout to let the state update
    const startTime = minutesToTime(showNewTaskAt);
    setTimeout(() => {
      const { state: newState } = store();
      const newTask = newState.tasks.find(t =>
        t.title === newTaskInput.trim() && t.scheduledDate === dateISO && !t.startTime
      );
      if (newTask) {
        dispatch({ type: 'SET_TASK_TIME', payload: { taskId: newTask.id, startTime, estimatedMinutes: 30 } });
      }
    }, 50);
    setShowNewTaskAt(null);
    setNewTaskInput('');
  };

  // We need a ref to access the store — workaround using a wrapper
  const storeRef = useRef({ state, dispatch });
  storeRef.current = { state, dispatch };
  const store = () => storeRef.current;

  // Drag handlers for rescheduling
  const handleDragStart = (e: React.PointerEvent, taskId: string) => {
    e.preventDefault();
    const task = scheduledTasks.find(t => t.id === taskId);
    if (!task) return;

    setDragTaskId(taskId);
    dragStartY.current = e.clientY;
    dragTaskStartTop.current = getTaskTop(task);

    const handleMove = (ev: PointerEvent) => {
      const deltaY = ev.clientY - dragStartY.current;
      const newTop = Math.max(0, dragTaskStartTop.current + deltaY);
      setDragPreviewTop(newTop);
    };

    const handleUp = () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);

      if (dragPreviewTop !== null) {
        const newMinutes = snapToInterval((dragPreviewTop / hourHeight) * 60 + rangeStart * 60);
        const newTime = minutesToTime(Math.max(0, Math.min(newMinutes, 23 * 60 + 45)));
        dispatch({ type: 'SET_TASK_TIME', payload: { taskId, startTime: newTime } });
      }
      setDragTaskId(null);
      setDragPreviewTop(null);
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
  };

  // Schedule an unscheduled task by dropping onto timeline
  const handleInboxDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleTimelineDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');
    if (!taskId) return;

    const rect = timelineRef.current?.getBoundingClientRect();
    if (!rect) return;
    const y = e.clientY - rect.top + (timelineRef.current?.scrollTop || 0);
    const minutes = snapToInterval((y / hourHeight) * 60 + rangeStart * 60);
    const startTime = minutesToTime(Math.max(0, Math.min(minutes, 23 * 60 + 45)));

    dispatch({ type: 'SET_TASK_TIME', payload: { taskId, startTime, estimatedMinutes: 30 } });
  };

  const handleTimelineDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  // Duration presets
  const DURATION_PRESETS = [15, 30, 45, 60, 90, 120, 180];

  // Auto-scroll to now line on mount
  const scrolledRef = useRef(false);
  useEffect(() => {
    if (isToday && nowInRange && timelineRef.current && !scrolledRef.current) {
      const scrollTarget = nowTop - 100;
      timelineRef.current.scrollTop = Math.max(0, scrollTarget);
      scrolledRef.current = true;
    }
  }, [isToday, nowInRange, nowTop]);

  // Progress calculation
  let progress = 0;
  if (dayTasks.length > 0) {
    let totalUnits = 0;
    let doneUnits = 0;
    for (const t of dayTasks) {
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

  return (
    <div className="timeline-view">
      {/* Header */}
      <div className="tl-header">
        <div className="tl-header-top">
          <div>
            <h2 className="tl-date">{dateLabel}</h2>
            <div className="tl-meta">
              <span className="tl-location">{meta.location}</span>
              {isToday && <span className="tl-badge today">TODAY</span>}
              {meta.isRestDay && <span className="tl-badge rest">REST</span>}
            </div>
          </div>
          <div className="tl-header-actions">
            {layout !== 'minimal' && (
              <LayoutToggle
                layout={layout}
                onChange={(l) => dispatch({ type: 'SET_TIMELINE_LAYOUT', payload: { layout: l } })}
              />
            )}
            {layout === 'minimal' && (
              <button
                className="tl-layout-btn"
                onClick={() => dispatch({ type: 'SET_TIMELINE_LAYOUT', payload: { layout: 'full' } })}
                title="Show more"
              >
                +
              </button>
            )}
          </div>
        </div>

        {holidays.length > 0 && layout !== 'minimal' && (
          <div className="tl-holidays">
            {holidays.map((h, i) => (
              <span key={i} className={`modal-holiday-tag type-${h.type}`}>
                {h.emoji} {h.name}
              </span>
            ))}
          </div>
        )}

        {dayTasks.length > 0 && (
          <div className="tl-progress">
            <div className="tl-progress-bar">
              <div className="tl-progress-fill" style={progressStyle(progress)} />
            </div>
            <span className="tl-progress-text">{progress}%</span>
          </div>
        )}
      </div>

      {/* Inbox — unscheduled tasks */}
      {activeUnscheduled.length > 0 && (
        <div className="tl-inbox">
          <h3 className="tl-inbox-label">
            Inbox
            <span className="tl-inbox-count">{activeUnscheduled.length}</span>
          </h3>
          <p className="tl-inbox-hint">Drag to timeline to schedule</p>
          {activeUnscheduled.map(task => (
            <div
              key={task.id}
              className="tl-inbox-item"
              draggable
              onDragStart={(e) => handleInboxDragStart(e, task.id)}
            >
              <span className="tl-inbox-icon">{getTaskIcon(task.category)}</span>
              <span className="tl-inbox-title">{task.title}</span>
              <button
                className={`tl-check ${task.completed ? 'checked' : ''}`}
                onClick={() => dispatch({
                  type: task.completed ? 'UNCOMPLETE_TASK' : 'COMPLETE_TASK',
                  payload: { taskId: task.id },
                })}
              >
                {task.completed && '\u2713'}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Timeline */}
      <div
        className="tl-body"
        ref={timelineRef}
        onClick={handleTimelineClick}
        onDrop={handleTimelineDrop}
        onDragOver={handleTimelineDragOver}
      >
        <div className="tl-track" style={{ height: `${totalHours * hourHeight}px` }}>

          {/* Hour lines & labels */}
          {Array.from({ length: totalHours + 1 }, (_, i) => {
            const hour = rangeStart + i;
            const displayHour = hour % 24;
            const isFullHour = true;
            return (
              <div
                key={hour}
                className="tl-hour-line"
                style={{ top: `${i * hourHeight}px` }}
              >
                {layout !== 'minimal' && isFullHour && (
                  <span className="tl-hour-label">
                    {formatTime12(`${String(displayHour).padStart(2, '0')}:00`)}
                  </span>
                )}
              </div>
            );
          })}

          {/* Time window backgrounds */}
          {layout === 'full' && windows.map((w, i) => {
            const top = (w.startHour - rangeStart) * hourHeight;
            const height = (w.endHour - w.startHour) * hourHeight;
            return (
              <div
                key={i}
                className={`tl-window energy-${w.energyLevel}`}
                style={{ top: `${top}px`, height: `${height}px` }}
              >
                <span className="tl-window-label">{w.label}</span>
              </div>
            );
          })}

          {/* Now line */}
          {nowInRange && (
            <div className="tl-now" style={{ top: `${nowTop}px` }}>
              <div className="tl-now-dot" />
              <div className="tl-now-line" />
              {layout !== 'minimal' && (
                <span className="tl-now-time">{formatTime12(minutesToTime(nowHour * 60))}</span>
              )}
            </div>
          )}

          {/* Scheduled task blocks */}
          {scheduledTasks.map(task => {
            const top = dragTaskId === task.id && dragPreviewTop !== null
              ? dragPreviewTop
              : getTaskTop(task);
            const height = getTaskHeight(task);
            const color = getTaskColor(task.category, task.taskColor);
            const project = task.projectId
              ? state.projects.find(p => p.id === task.projectId)
              : null;
            const blockColor = project?.color || color;
            const isExpanded = expandedTaskId === task.id;
            const isDragging = dragTaskId === task.id;
            const isPastTime = isToday && task.startTime && nowHour > (timeToMinutes(task.startTime) + (task.estimatedMinutes || 30)) / 60;
            const isActive = isToday && task.startTime && !isPastTime
              && nowHour >= timeToMinutes(task.startTime) / 60
              && nowHour < (timeToMinutes(task.startTime) + (task.estimatedMinutes || 30)) / 60;
            const hasSubs = task.subtasks.length > 0;
            const doneSubs = task.subtasks.filter(s => s.completed).length;

            return (
              <div
                key={task.id}
                className={[
                  'tl-block',
                  task.completed ? 'done' : '',
                  isDragging ? 'dragging' : '',
                  isPastTime && !task.completed ? 'past-time' : '',
                  isActive ? 'active-now' : '',
                ].filter(Boolean).join(' ')}
                style={{
                  top: `${top}px`,
                  height: `${Math.max(height, 32)}px`,
                  borderLeftColor: blockColor,
                  '--block-color': blockColor,
                  '--block-color-bg': `${blockColor}18`,
                } as React.CSSProperties}
                onPointerDown={(e) => handleDragStart(e, task.id)}
              >
                <div className="tl-block-header">
                  <button
                    className={`tl-check ${task.completed ? 'checked' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      dispatch({
                        type: task.completed ? 'UNCOMPLETE_TASK' : 'COMPLETE_TASK',
                        payload: { taskId: task.id },
                      });
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                  >
                    {task.completed && '\u2713'}
                  </button>
                  <span className="tl-block-icon">{getTaskIcon(task.category)}</span>
                  <div className="tl-block-info">
                    <span className={`tl-block-title ${task.completed ? 'struck' : ''}`}>
                      {task.title}
                    </span>
                    {layout !== 'minimal' && task.startTime && (
                      <span className="tl-block-time">
                        {formatTime12(task.startTime)}
                        {task.estimatedMinutes && ` \u2022 ${task.estimatedMinutes}m`}
                      </span>
                    )}
                  </div>
                  {hasSubs && (
                    <span className="tl-block-badge">{doneSubs}/{task.subtasks.length}</span>
                  )}
                  <button
                    className={`tl-block-chevron ${isExpanded ? 'open' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedTaskId(isExpanded ? null : task.id);
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                  >
                    &rsaquo;
                  </button>
                </div>

                {/* Expanded: subtasks + duration editor */}
                {isExpanded && (
                  <div className="tl-block-body" onPointerDown={(e) => e.stopPropagation()}>
                    {/* Duration slider */}
                    <div className="tl-duration-row">
                      <span className="tl-duration-label">Duration:</span>
                      <div className="tl-duration-presets">
                        {DURATION_PRESETS.map(d => (
                          <button
                            key={d}
                            className={`tl-dur-preset ${task.estimatedMinutes === d ? 'active' : ''}`}
                            onClick={() => dispatch({
                              type: 'SET_TASK_TIME',
                              payload: { taskId: task.id, startTime: task.startTime!, estimatedMinutes: d },
                            })}
                          >
                            {d >= 60 ? `${d / 60}h` : `${d}m`}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Subtasks */}
                    {task.subtasks.map(sub => (
                      <div key={sub.id} className={`tl-sub ${sub.completed ? 'done' : ''}`}>
                        <button
                          className={`tl-sub-check ${sub.completed ? 'checked' : ''}`}
                          onClick={() => dispatch({
                            type: 'TOGGLE_SUBTASK',
                            payload: { taskId: task.id, subtaskId: sub.id },
                          })}
                        >
                          {sub.completed && '\u2713'}
                        </button>
                        <span className={`tl-sub-title ${sub.completed ? 'struck' : ''}`}>
                          {sub.title}
                        </span>
                      </div>
                    ))}

                    {/* Actions */}
                    <div className="tl-block-actions">
                      <button
                        className="tl-act-btn unschedule"
                        onClick={() => dispatch({ type: 'CLEAR_TASK_TIME', payload: { taskId: task.id } })}
                      >
                        Move to Inbox
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Click-to-create new task overlay */}
          {showNewTaskAt !== null && (
            <div
              className="tl-new-task"
              style={{
                top: `${((showNewTaskAt / 60) - rangeStart) * hourHeight}px`,
              }}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <form onSubmit={handleCreateTask} className="tl-new-task-form">
                <span className="tl-new-task-time">{formatTime12(minutesToTime(showNewTaskAt))}</span>
                <input
                  type="text"
                  value={newTaskInput}
                  onChange={e => setNewTaskInput(e.target.value)}
                  placeholder="New task..."
                  className="tl-new-task-input"
                  autoFocus
                  autoComplete="off"
                  onBlur={() => {
                    if (!newTaskInput.trim()) setShowNewTaskAt(null);
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Escape') setShowNewTaskAt(null);
                  }}
                />
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Completed unscheduled at bottom */}
      {completedUnscheduled.length > 0 && (
        <div className="tl-completed-inbox">
          <h3 className="tl-inbox-label">Completed ({completedUnscheduled.length})</h3>
          {completedUnscheduled.map(task => (
            <div key={task.id} className="tl-inbox-item done">
              <span className="tl-inbox-icon">{getTaskIcon(task.category)}</span>
              <span className="tl-inbox-title struck">{task.title}</span>
              <button
                className="tl-check checked"
                onClick={() => dispatch({ type: 'UNCOMPLETE_TASK', payload: { taskId: task.id } })}
              >
                {'\u2713'}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Quick add footer */}
      <div className="tl-footer">
        <QuickAddTimeline dateISO={dateISO} />
      </div>
    </div>
  );
}

// --- Layout density toggle ---
function LayoutToggle({
  layout,
  onChange,
}: {
  layout: TimelineLayout;
  onChange: (layout: TimelineLayout) => void;
}) {
  const layouts: TimelineLayout[] = ['full', 'simplified', 'minimal'];
  return (
    <div className="tl-layout-toggle">
      {layouts.map(l => (
        <button
          key={l}
          className={`tl-layout-opt ${layout === l ? 'active' : ''}`}
          onClick={() => onChange(l)}
          title={l.charAt(0).toUpperCase() + l.slice(1)}
        >
          {l === 'full' ? '\u2630' : l === 'simplified' ? '\u2261' : '\u2014'}
        </button>
      ))}
    </div>
  );
}

// --- Quick Add at bottom ---
function QuickAddTimeline({ dateISO }: { dateISO: string }) {
  const { dispatch } = useAppStore();
  const [title, setTitle] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    dispatch({
      type: 'ADD_TASK_SIMPLE',
      payload: { title: title.trim(), scheduledDate: dateISO },
    });
    setTitle('');
  };

  return (
    <form className="tl-quick-add" onSubmit={handleSubmit}>
      <span className="tl-quick-add-icon">+</span>
      <input
        type="text"
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="Add task to inbox..."
        className="tl-quick-add-input"
        autoComplete="off"
      />
    </form>
  );
}

// Progress bar style helper
function progressStyle(pct: number): React.CSSProperties {
  if (pct >= 100) return { width: '100%', background: '#22c55e' };
  if (pct <= 0) return { width: `${Math.max(pct, 4)}%`, background: '#ef4444' };
  const bgSize = Math.round((1 / (pct / 100)) * 100);
  return {
    width: `${Math.max(pct, 4)}%`,
    background: 'linear-gradient(90deg, #ef4444, #f59e0b, #22c55e)',
    backgroundSize: `${bgSize}% 100%`,
  };
}
