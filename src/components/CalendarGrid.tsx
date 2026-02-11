// ============================================================
// Calendar Grid Component
// Monthly calendar with day cells, navigation, and status
// ============================================================

import { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { getHolidaysForDate } from '../engine/holidays';
import { getDayMeta } from '../engine/schedule';
import { getDayOfWeekFromDate } from '../utils/dateUtils';

export default function CalendarGrid() {
  const { state, dispatch } = useAppStore();
  const selected = new Date(state.selectedDate + 'T12:00:00');
  const [viewMonth, setViewMonth] = useState(selected.getMonth());
  const [viewYear, setViewYear] = useState(selected.getFullYear());

  const todayISO = new Date().toISOString().split('T')[0];

  // Build calendar grid for the month
  const firstDay = new Date(viewYear, viewMonth, 1);
  const lastDay = new Date(viewYear, viewMonth + 1, 0);
  const startDayOfWeek = firstDay.getDay(); // 0=Sun
  // Start on Monday: Sun=6, Mon=0, Tue=1, ...
  const startOffset = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;

  const days: (Date | null)[] = [];
  for (let i = 0; i < startOffset; i++) days.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) days.push(new Date(viewYear, viewMonth, d));
  while (days.length % 7 !== 0) days.push(null);

  const getCompletionStatus = (dateISO: string): 'none' | 'partial' | 'complete' | 'empty' => {
    const dayTasks = state.tasks.filter(t => t.scheduledDate === dateISO && !t.isBacklog);
    if (dayTasks.length === 0) return 'empty';
    const completed = dayTasks.filter(t => t.completed).length;
    if (completed === dayTasks.length) return 'complete';
    if (completed > 0) return 'partial';
    return 'none';
  };

  const getTaskCount = (dateISO: string): number => {
    return state.tasks.filter(t => t.scheduledDate === dateISO && !t.isBacklog && !t.completed).length;
  };

  const handlePrev = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
    else setViewMonth(viewMonth - 1);
  };

  const handleNext = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
    else setViewMonth(viewMonth + 1);
  };

  const handleToday = () => {
    const now = new Date();
    setViewMonth(now.getMonth());
    setViewYear(now.getFullYear());
    dispatch({ type: 'SELECT_DATE', payload: { date: todayISO } });
  };

  const handleSelectDay = (date: Date) => {
    const iso = dateToISO(date);
    dispatch({ type: 'SELECT_DATE', payload: { date: iso } });
  };

  const monthName = new Date(viewYear, viewMonth).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="calendar-grid">
      <div className="cal-header">
        <button className="cal-nav-btn" onClick={handlePrev}>&lsaquo;</button>
        <h2 className="cal-month-title">{monthName}</h2>
        <button className="cal-nav-btn" onClick={handleNext}>&rsaquo;</button>
        <button className="cal-today-btn" onClick={handleToday}>Today</button>
      </div>

      <div className="cal-weekdays">
        {WEEKDAY_LABELS.map(d => (
          <div key={d} className="cal-weekday">{d}</div>
        ))}
      </div>

      <div className="cal-days">
        {days.map((date, i) => {
          if (!date) return <div key={`empty-${i}`} className="cal-day empty" />;

          const iso = dateToISO(date);
          const isToday = iso === todayISO;
          const isSelected = iso === state.selectedDate;
          const status = getCompletionStatus(iso);
          const count = getTaskCount(iso);
          const holidays = getHolidaysForDate(iso);
          const dayOfWeek = getDayOfWeekFromDate(date);
          const meta = getDayMeta(dayOfWeek);
          const isWeekend = dayOfWeek === 'saturday' || dayOfWeek === 'sunday';

          return (
            <button
              key={iso}
              className={[
                'cal-day',
                isToday ? 'today' : '',
                isSelected ? 'selected' : '',
                `status-${status}`,
                meta.isRestDay ? 'rest' : '',
                isWeekend ? 'weekend' : '',
              ].filter(Boolean).join(' ')}
              onClick={() => handleSelectDay(date)}
            >
              <span className="cal-day-num">{date.getDate()}</span>
              {holidays.length > 0 && (
                <span className="cal-holiday-dot" title={holidays.map(h => h.name).join(', ')}>
                  {holidays[0].emoji}
                </span>
              )}
              {count > 0 && <span className="cal-task-count">{count}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function dateToISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
