// ============================================================
// Timeline View - Vertical time-blocking day view
// Clean hour labels on left, task blocks on right, real-time
// now line, drag-to-move, drag-to-resize, + button with popup
// ============================================================

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '../store/useAppStore';
import { getDayMeta, WEEKLY_WINDOWS } from '../engine/schedule';
import { getDayOfWeekFromDate } from '../utils/dateUtils';
import { getTaskIcon, getTaskColor } from '../utils/taskIcons';
import { getHolidaysForDate } from '../engine/holidays';
import type { Task } from '../types';

const HOUR_HEIGHT = 64;
const SNAP_MINUTES = 15;

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(mins: number): string {
  const clamped = Math.max(0, Math.min(mins, 23 * 60 + 59));
  const h = Math.floor(clamped / 60) % 24;
  const m = clamped % 60;
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

  const date = new Date(dateISO + 'T12:00:00');
  const dayOfWeek = getDayOfWeekFromDate(date);
  const meta = getDayMeta(dayOfWeek);
  const holidays = getHolidaysForDate(dateISO);
  const windows = WEEKLY_WINDOWS[dayOfWeek];

  const todayISO = new Date().toISOString().split('T')[0];
  const isToday = dateISO === todayISO;

  // Determine visible hour range
  const windowStarts = windows.map(w => w.startHour);
  const windowEnds = windows.map(w => w.endHour);
  const defaultStart = 8;
  const defaultEnd = 24;
  const rangeStart = windows.length > 0 ? Math.min(...windowStarts, defaultStart) : defaultStart;
  const rawEnd = windows.length > 0 ? Math.max(...windowEnds, defaultEnd) : defaultEnd;
  const rangeEnd = Math.min(rawEnd, 30);
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
    const interval = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(interval);
  }, []);

  const nowHour = now.getHours() + now.getMinutes() / 60;
  const nowInRange = isToday && nowHour >= rangeStart && nowHour < rangeEnd;
  const nowTop = (nowHour - rangeStart) * HOUR_HEIGHT;

  // Drag-to-move state
  const [dragTaskId, setDragTaskId] = useState<string | null>(null);
  const [dragPreviewTop, setDragPreviewTop] = useState<number | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef<number>(0);
  const dragTaskStartTop = useRef<number>(0);

  // Drag-to-resize state
  const [resizeTaskId, setResizeTaskId] = useState<string | null>(null);
  const [resizePreviewHeight, setResizePreviewHeight] = useState<number | null>(null);
  const resizeStartY = useRef<number>(0);
  const resizeStartHeight = useRef<number>(0);

  // New task popup
  const [showAddPopup, setShowAddPopup] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newStartHour, setNewStartHour] = useState(9);
  const [newStartMin, setNewStartMin] = useState(0);
  const [newDuration, setNewDuration] = useState(30);

  // Expanded task
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

  const dateLabel = date.toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });

  // Duration presets
  const DURATION_PRESETS = [15, 30, 45, 60, 90, 120, 180];

  // Task positioning helpers
  const getTaskTop = useCallback((task: Task): number => {
    if (!task.startTime) return 0;
    const mins = timeToMinutes(task.startTime);
    return (mins / 60 - rangeStart) * HOUR_HEIGHT;
  }, [rangeStart]);

  const getTaskHeight = useCallback((task: Task): number => {
    const duration = task.estimatedMinutes || 30;
    return (duration / 60) * HOUR_HEIGHT;
  }, []);

  // Store ref for async access
  const storeRef = useRef({ state, dispatch });
  storeRef.current = { state, dispatch };

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
    const minutes = snapToInterval((y / HOUR_HEIGHT) * 60 + rangeStart * 60);
    const startTime = minutesToTime(minutes);
    dispatch({ type: 'SET_TASK_TIME', payload: { taskId, startTime, estimatedMinutes: 30 } });
  };

  const handleTimelineDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  // Drag-to-move handlers
  const handleMoveStart = (e: React.PointerEvent, taskId: string) => {
    // Don't start drag if clicking on buttons/inputs
    const target = e.target as HTMLElement;
    if (target.closest('.tl-check') || target.closest('.tl-block-chevron') || target.closest('.tl-block-body') || target.closest('.tl-resize-handle')) return;

    e.preventDefault();
    const task = scheduledTasks.find(t => t.id === taskId);
    if (!task) return;

    setDragTaskId(taskId);
    dragStartY.current = e.clientY;
    dragTaskStartTop.current = getTaskTop(task);

    const onMove = (ev: PointerEvent) => {
      const deltaY = ev.clientY - dragStartY.current;
      const newTop = Math.max(0, Math.min(dragTaskStartTop.current + deltaY, totalHours * HOUR_HEIGHT - 16));
      setDragPreviewTop(newTop);
    };

    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      // Use the latest preview value via ref
      const previewEl = document.querySelector(`[data-task-id="${taskId}"]`);
      const currentTop = previewEl ? parseFloat(previewEl.getAttribute('style')?.match(/top:\s*([\d.]+)px/)?.[1] || '0') : dragTaskStartTop.current;
      const finalTop = dragPreviewTop ?? currentTop;
      const newMinutes = snapToInterval((finalTop / HOUR_HEIGHT) * 60 + rangeStart * 60);
      const newTime = minutesToTime(newMinutes);
      storeRef.current.dispatch({ type: 'SET_TASK_TIME', payload: { taskId, startTime: newTime } });
      setDragTaskId(null);
      setDragPreviewTop(null);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  // Drag-to-resize handlers
  const handleResizeStart = (e: React.PointerEvent, taskId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const task = scheduledTasks.find(t => t.id === taskId);
    if (!task) return;

    setResizeTaskId(taskId);
    resizeStartY.current = e.clientY;
    resizeStartHeight.current = getTaskHeight(task);

    const onMove = (ev: PointerEvent) => {
      const deltaY = ev.clientY - resizeStartY.current;
      const newHeight = Math.max(HOUR_HEIGHT / 4, resizeStartHeight.current + deltaY);
      setResizePreviewHeight(newHeight);
    };

    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      if (resizePreviewHeight !== null) {
        const newMinutes = snapToInterval((resizePreviewHeight / HOUR_HEIGHT) * 60);
        const clampedMinutes = Math.max(15, Math.min(newMinutes, 480));
        storeRef.current.dispatch({
          type: 'SET_TASK_TIME',
          payload: { taskId, startTime: task.startTime!, estimatedMinutes: clampedMinutes },
        });
      }
      setResizeTaskId(null);
      setResizePreviewHeight(null);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  // Auto-scroll to now line on mount
  const scrolledRef = useRef(false);
  useEffect(() => {
    if (isToday && nowInRange && timelineRef.current && !scrolledRef.current) {
      timelineRef.current.scrollTop = Math.max(0, nowTop - 120);
      scrolledRef.current = true;
    }
  }, [isToday, nowInRange, nowTop]);

  // Handle add task from popup
  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const startTime = minutesToTime(newStartHour * 60 + newStartMin);
    dispatch({
      type: 'ADD_TASK_SIMPLE',
      payload: { title: newTitle.trim(), scheduledDate: dateISO },
    });
    // Set start time on the newly created task
    setTimeout(() => {
      const { state: s } = storeRef.current;
      const created = s.tasks.find(t =>
        t.title === newTitle.trim() && t.scheduledDate === dateISO && !t.startTime
      );
      if (created) {
        storeRef.current.dispatch({
          type: 'SET_TASK_TIME',
          payload: { taskId: created.id, startTime, estimatedMinutes: newDuration },
        });
      }
    }, 50);
    setNewTitle('');
    setShowAddPopup(false);
  };

  // Open popup with sensible defaults
  const openAddPopup = () => {
    const currentHour = new Date().getHours();
    const nextHour = Math.min(currentHour + 1, 23);
    setNewStartHour(nextHour);
    setNewStartMin(0);
    setNewDuration(30);
    setNewTitle('');
    setShowAddPopup(true);
  };

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

  // Generate hour options for picker
  const hourOptions: number[] = [];
  for (let h = rangeStart; h < rangeEnd; h++) hourOptions.push(h % 24);

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
        </div>

        {holidays.length > 0 && (
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

      {/* Inbox */}
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

      {/* Timeline body */}
      <div
        className="tl-body"
        ref={timelineRef}
        onDrop={handleTimelineDrop}
        onDragOver={handleTimelineDragOver}
      >
        {/* Now line — full width, above the track layout */}
        {nowInRange && (
          <div className="tl-now-wrapper" style={{ top: `${nowTop}px` }}>
            <span className="tl-now-label">{formatTime12(minutesToTime(Math.round(nowHour * 60)))}</span>
            <div className="tl-now-dot" />
            <div className="tl-now-line" />
          </div>
        )}

        <div className="tl-track-layout" style={{ height: `${totalHours * HOUR_HEIGHT}px` }}>
          {/* Hour labels column */}
          <div className="tl-hours-col">
            {Array.from({ length: totalHours + 1 }, (_, i) => {
              const hour = rangeStart + i;
              const displayHour = hour % 24;
              return (
                <div key={hour} className="tl-hour-row" style={{ top: `${i * HOUR_HEIGHT}px` }}>
                  <span className="tl-hour-label">
                    {formatTime12(`${String(displayHour).padStart(2, '0')}:00`)}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Track column */}
          <div className="tl-track-col">
            {/* Hour gridlines */}
            {Array.from({ length: totalHours + 1 }, (_, i) => (
              <div key={i} className="tl-gridline" style={{ top: `${i * HOUR_HEIGHT}px` }} />
            ))}

            {/* Time window backgrounds */}
            {windows.map((w, i) => {
              const top = (w.startHour - rangeStart) * HOUR_HEIGHT;
              const height = (w.endHour - w.startHour) * HOUR_HEIGHT;
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

            {/* Task blocks */}
            {scheduledTasks.map(task => {
              const top = dragTaskId === task.id && dragPreviewTop !== null
                ? dragPreviewTop
                : getTaskTop(task);
              const height = resizeTaskId === task.id && resizePreviewHeight !== null
                ? resizePreviewHeight
                : getTaskHeight(task);
              const color = getTaskColor(task.category, task.taskColor);
              const project = task.projectId
                ? state.projects.find(p => p.id === task.projectId)
                : null;
              const blockColor = project?.color || color;
              const isExpanded = expandedTaskId === task.id;
              const isDragging = dragTaskId === task.id;
              const isResizing = resizeTaskId === task.id;
              const isPastTime = isToday && task.startTime && nowHour > (timeToMinutes(task.startTime) + (task.estimatedMinutes || 30)) / 60;
              const isActive = isToday && task.startTime && !isPastTime
                && nowHour >= timeToMinutes(task.startTime) / 60
                && nowHour < (timeToMinutes(task.startTime) + (task.estimatedMinutes || 30)) / 60;
              const hasSubs = task.subtasks.length > 0;
              const doneSubs = task.subtasks.filter(s => s.completed).length;

              return (
                <div
                  key={task.id}
                  data-task-id={task.id}
                  className={[
                    'tl-block',
                    task.completed ? 'done' : '',
                    isDragging ? 'dragging' : '',
                    isResizing ? 'resizing' : '',
                    isPastTime && !task.completed ? 'past-time' : '',
                    isActive ? 'active-now' : '',
                  ].filter(Boolean).join(' ')}
                  style={{
                    top: `${top}px`,
                    height: `${Math.max(height, 28)}px`,
                    '--block-color': blockColor,
                    '--block-color-bg': `${blockColor}22`,
                  } as React.CSSProperties}
                  onPointerDown={(e) => handleMoveStart(e, task.id)}
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
                      {task.startTime && (
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

                  {/* Expanded body */}
                  {isExpanded && (
                    <div className="tl-block-body" onPointerDown={(e) => e.stopPropagation()}>
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

                  {/* Resize handle at bottom */}
                  <div
                    className="tl-resize-handle"
                    onPointerDown={(e) => handleResizeStart(e, task.id)}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Completed unscheduled */}
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

      {/* Footer: quick add to inbox */}
      <div className="tl-footer">
        <QuickAddTimeline dateISO={dateISO} />
      </div>

      {/* Floating add button */}
      <button className="tl-fab" onClick={openAddPopup} title="Add scheduled task">
        +
      </button>

      {/* Add task popup */}
      {showAddPopup && (
        <div className="tl-popup-backdrop" onClick={() => setShowAddPopup(false)}>
          <div className="tl-popup" onClick={(e) => e.stopPropagation()}>
            <h3 className="tl-popup-title">Schedule a task</h3>
            <form onSubmit={handleAddTask}>
              <input
                type="text"
                className="tl-popup-input"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                placeholder="Task name..."
                autoFocus
                autoComplete="off"
              />

              <div className="tl-popup-row">
                <label className="tl-popup-label">Start time</label>
                <div className="tl-popup-time-pick">
                  <select
                    className="tl-popup-select"
                    value={newStartHour}
                    onChange={e => setNewStartHour(Number(e.target.value))}
                  >
                    {hourOptions.map(h => (
                      <option key={h} value={h}>
                        {formatTime12(`${String(h).padStart(2, '0')}:00`).replace(/ (AM|PM)/, '')}
                      </option>
                    ))}
                  </select>
                  <span className="tl-popup-colon">:</span>
                  <select
                    className="tl-popup-select"
                    value={newStartMin}
                    onChange={e => setNewStartMin(Number(e.target.value))}
                  >
                    {[0, 15, 30, 45].map(m => (
                      <option key={m} value={m}>{String(m).padStart(2, '0')}</option>
                    ))}
                  </select>
                  <span className="tl-popup-period">
                    {newStartHour >= 12 ? 'PM' : 'AM'}
                  </span>
                </div>
              </div>

              <div className="tl-popup-row">
                <label className="tl-popup-label">Duration</label>
                <div className="tl-popup-durations">
                  {DURATION_PRESETS.map(d => (
                    <button
                      key={d}
                      type="button"
                      className={`tl-dur-preset ${newDuration === d ? 'active' : ''}`}
                      onClick={() => setNewDuration(d)}
                    >
                      {d >= 60 ? `${d / 60}h` : `${d}m`}
                    </button>
                  ))}
                </div>
              </div>

              <div className="tl-popup-actions">
                <button type="button" className="tl-popup-cancel" onClick={() => setShowAddPopup(false)}>
                  Cancel
                </button>
                <button type="submit" className="tl-popup-submit" disabled={!newTitle.trim()}>
                  Add
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Quick Add (to inbox, no time) ---
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
