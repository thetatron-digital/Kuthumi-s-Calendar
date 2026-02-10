// ============================================================
// Weekly View
// Monday through Saturday with assigned tasks and time blocks
// ============================================================

import { useAppStore } from '../store/useAppStore';
import { WEEKLY_WINDOWS, getDayMeta } from '../engine/schedule';
import { getTasksForDay } from '../engine/autoScheduler';
import { getTodayDayOfWeek, getWeekDates, dayLabel } from '../utils/dateUtils';
import type { DayOfWeek, TimeWindow } from '../types';
import TaskCard from '../components/TaskCard';
import EnergyIndicator from '../components/EnergyIndicator';

const DISPLAY_ORDER: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export default function WeeklyView() {
  const { state } = useAppStore();
  const today = getTodayDayOfWeek();
  const weekDates = getWeekDates();

  return (
    <div className="weekly-view">
      <h1 className="view-title">Weekly Schedule</h1>
      <div className="week-grid">
        {DISPLAY_ORDER.map(day => {
          const meta = getDayMeta(day);
          const windows = WEEKLY_WINDOWS[day];
          const tasks = getTasksForDay(state.tasks, day);
          const dateInfo = weekDates.find(d => d.day === day);
          const isToday = day === today;

          return (
            <div key={day} className={`day-column ${isToday ? 'today' : ''} ${meta.isRestDay ? 'rest-day' : ''}`}>
              <div className="day-column-header">
                <div className="day-name-row">
                  <h3 className="day-name">{dayLabel(day)}</h3>
                  {isToday && <span className="today-badge">TODAY</span>}
                </div>
                {dateInfo && (
                  <span className="day-date">
                    {new Date(dateInfo.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                )}
                <EnergyIndicator level={meta.energyLevel} showLabel={false} />
                <span className="day-location">{meta.location}</span>
              </div>

              <div className="day-column-body">
                {meta.isRestDay ? (
                  <div className="rest-day-label">
                    <span>{day === 'saturday' ? 'Girlfriend Day' : 'Rest & Recovery'}</span>
                  </div>
                ) : (
                  <>
                    {windows.map((window, i) => (
                      <div key={i} className={`week-window ${window.isPrime ? 'prime' : ''}`}>
                        <div className="week-window-header">
                          <span className="week-window-time">{formatTimeBlock(window)}</span>
                          {window.isPrime && <span className="prime-badge-sm">PRIME</span>}
                        </div>
                        <span className="week-window-label">{window.label}</span>
                      </div>
                    ))}

                    {tasks.length > 0 ? (
                      <div className="day-tasks">
                        {tasks.map(task => (
                          <TaskCard key={task.id} task={task} showScheduling={false} compact />
                        ))}
                      </div>
                    ) : (
                      windows.length > 0 && (
                        <p className="no-tasks-label">No tasks assigned</p>
                      )
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatTimeBlock(window: TimeWindow): string {
  const formatHour = (h: number): string => {
    const normalized = h >= 24 ? h - 24 : h;
    if (normalized === 0) return '12AM';
    if (normalized === 12) return '12PM';
    if (normalized < 12) return `${normalized}AM`;
    return `${normalized - 12}PM`;
  };
  return `${formatHour(window.startHour)}-${formatHour(window.endHour)}`;
}
