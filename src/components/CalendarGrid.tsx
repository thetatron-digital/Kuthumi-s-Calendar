// ============================================================
// Calendar Grid Component (DOMINANT UI)
// Large monthly calendar with progress bars per day
// ============================================================

import { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { getHolidaysForDate } from '../engine/holidays';
import { getDayMeta } from '../engine/schedule';
import { getDayOfWeekFromDate } from '../utils/dateUtils';

interface CalendarGridProps {
  onDayClick: (dateISO: string) => void;
}

export default function CalendarGrid({ onDayClick }: CalendarGridProps) {
  const { state, dispatch } = useAppStore();
  const [viewMonth, setViewMonth] = useState(() => {
    const d = new Date(state.selectedDate + 'T12:00:00');
    return d.getMonth();
  });
  const [viewYear, setViewYear] = useState(() => {
    const d = new Date(state.selectedDate + 'T12:00:00');
    return d.getFullYear();
  });

  const todayISO = new Date().toISOString().split('T')[0];

  // Generate routine when navigating months
  useEffect(() => {
    const firstDay = new Date(viewYear, viewMonth, 1);
    const day = firstDay.getDay();
    // Week starts on Sunday, so offset back to Sunday
    const weekSunday = new Date(firstDay);
    weekSunday.setDate(firstDay.getDate() - day);

    // Generate routine for all visible weeks (up to 6 weeks)
    for (let w = 0; w < 6; w++) {
      const ws = new Date(weekSunday);
      ws.setDate(weekSunday.getDate() + w * 7);
      dispatch({ type: 'GENERATE_ROUTINE', payload: { weekSunday: ws } });
    }
  }, [viewMonth, viewYear, dispatch]);

  // Build grid
  const firstDay = new Date(viewYear, viewMonth, 1);
  const lastDay = new Date(viewYear, viewMonth + 1, 0);
  const startDow = firstDay.getDay();
  const startOffset = startDow; // Sunday = 0, so no offset needed for Sunday-first grid

  const days: (Date | null)[] = [];
  for (let i = 0; i < startOffset; i++) days.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) days.push(new Date(viewYear, viewMonth, d));
  while (days.length % 7 !== 0) days.push(null);

  const getDayProgress = (iso: string): { total: number; done: number; pct: number } => {
    const tasks = state.tasks.filter(t => t.scheduledDate === iso && !t.isBacklog);
    const total = tasks.length;
    if (total === 0) return { total: 0, done: 0, pct: -1 };

    // Subtask-level progress: each task contributes equally
    let progressSum = 0;
    let doneCount = 0;
    for (const t of tasks) {
      if (t.completed) {
        progressSum += 1;
        doneCount++;
      } else if (t.subtasks.length > 0) {
        const subDone = t.subtasks.filter(s => s.completed).length;
        progressSum += subDone / t.subtasks.length;
      }
      // tasks with no subtasks and not completed contribute 0
    }
    return { total, done: doneCount, pct: Math.round((progressSum / total) * 100) };
  };

  const handlePrev = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const handleNext = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };
  const handleToday = () => {
    const now = new Date();
    setViewMonth(now.getMonth());
    setViewYear(now.getFullYear());
    dispatch({ type: 'SELECT_DATE', payload: { date: todayISO } });
  };

  const monthLabel = new Date(viewYear, viewMonth).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="cal">
      {/* Nav */}
      <div className="cal-nav">
        <button className="cal-arrow" onClick={handlePrev}>&lsaquo;</button>
        <h2 className="cal-title">{monthLabel}</h2>
        <button className="cal-arrow" onClick={handleNext}>&rsaquo;</button>
        <button className="cal-today" onClick={handleToday}>Today</button>
      </div>

      {/* Weekday headers */}
      <div className="cal-hdr">
        {DAYS.map(d => <div key={d} className="cal-hdr-day">{d}</div>)}
      </div>

      {/* Day cells */}
      <div className="cal-grid">
        {days.map((date, i) => {
          if (!date) return <div key={`e-${i}`} className="cal-cell empty" />;

          const iso = toISO(date);
          const isToday = iso === todayISO;
          const isSelected = iso === state.selectedDate;
          const { total, done, pct } = getDayProgress(iso);
          const holidays = getHolidaysForDate(iso);
          const dow = getDayOfWeekFromDate(date);
          const meta = getDayMeta(dow);

          return (
            <button
              key={iso}
              className={[
                'cal-cell',
                isToday ? 'today' : '',
                isSelected ? 'selected' : '',
                meta.isRestDay ? 'rest' : '',
              ].filter(Boolean).join(' ')}
              onClick={() => {
                dispatch({ type: 'SELECT_DATE', payload: { date: iso } });
                onDayClick(iso);
              }}
            >
              <span className="cal-num">{date.getDate()}</span>

              {holidays.length > 0 && (
                <span className="cal-emoji">{holidays[0].emoji}</span>
              )}

              {total > 0 && (
                <span className="cal-count">
                  {done === total ? '\u2713' : `${total - done}`}
                </span>
              )}

              {/* Progress bar with developing gradient */}
              <div className="cal-bar">
                <div
                  className="cal-bar-fill"
                  style={{
                    width: pct >= 0 ? `${Math.max(pct, 4)}%` : '0%',
                    background: total > 0 ? progressGradient(pct) : 'transparent',
                  }}
                />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Developing gradient: red → amber → green based on completion %
function progressGradient(pct: number): string {
  if (pct <= 0) return '#ef4444';
  if (pct >= 100) return 'linear-gradient(90deg, #f59e0b, #22c55e)';
  if (pct < 50) {
    return `linear-gradient(90deg, #ef4444, #f59e0b)`;
  }
  return `linear-gradient(90deg, #f59e0b, #22c55e)`;
}

function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
