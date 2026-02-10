// ============================================================
// Daily Briefing View
// "Open the app and immediately know what to work on"
// ============================================================

import { useAppStore } from '../store/useAppStore';
import { getDaySchedule, getDayMeta, isPhoneDay } from '../engine/schedule';
import { getTasksForDay, getPhoneTasks } from '../engine/autoScheduler';
import { getHolidaysForDate, getUpcomingHolidays } from '../engine/holidays';
import type { CalendarEvent } from '../engine/holidays';
import { getTodayDayOfWeek, getTodayISO } from '../utils/dateUtils';
import TaskCard from '../components/TaskCard';
import EnergyIndicator from '../components/EnergyIndicator';
import type { DayOfWeek, TimeWindow } from '../types';

export default function DailyBriefing() {
  const { state } = useAppStore();
  const today = getTodayDayOfWeek();
  const todayISO = getTodayISO();
  const schedule = getDaySchedule(today, todayISO);
  const meta = getDayMeta(today);
  const dayTasks = getTasksForDay(state.tasks, today);
  const phoneTasks = isPhoneDay(today) ? getPhoneTasks(state.tasks) : [];

  const now = new Date();
  const currentHour = now.getHours();

  const greeting = getGreeting(today, currentHour);
  const todayHolidays = getHolidaysForDate(todayISO);
  const upcoming = getUpcomingHolidays(14).filter(h => h.date !== todayISO);

  return (
    <div className="daily-briefing">
      <header className="briefing-header">
        <div className="briefing-top-row">
          <div>
            <h1 className="briefing-title">
              {now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </h1>
            <p className="briefing-subtitle">{greeting}</p>
          </div>
          <EnergyIndicator level={schedule.energyLevel} />
        </div>

        <div className="briefing-location">
          <span className="location-icon">&#x1F4CD;</span>
          <span>{schedule.location}</span>
        </div>

        {meta.departTime && (
          <div className="briefing-schedule-info">
            <div className="schedule-info-item">
              <span className="info-label">Wake</span>
              <span className="info-value">{schedule.wakeTime}</span>
            </div>
            <div className="schedule-info-item">
              <span className="info-label">Depart</span>
              <span className="info-value">{meta.departTime}</span>
            </div>
            {meta.arriveTime && (
              <div className="schedule-info-item">
                <span className="info-label">Arrive</span>
                <span className="info-value">{meta.arriveTime}</span>
              </div>
            )}
          </div>
        )}

        {todayHolidays.length > 0 && (
          <div className="holiday-banner">
            {todayHolidays.map((h, i) => (
              <div key={i} className={`holiday-item holiday-${h.type}`}>
                <span className="holiday-emoji">{h.emoji}</span>
                <span className="holiday-name">{h.name}</span>
                <span className="holiday-type-badge">{h.type === 'federal' ? 'Federal Holiday' : h.type === 'seasonal' ? 'Seasonal' : ''}</span>
              </div>
            ))}
          </div>
        )}
      </header>

      {upcoming.length > 0 && (
        <section className="briefing-section upcoming-holidays">
          <h2 className="section-title">Upcoming</h2>
          <div className="upcoming-list">
            {upcoming.map(({ date, events }) => (
              <UpcomingHolidayRow key={date} dateISO={date} events={events} />
            ))}
          </div>
        </section>
      )}

      {schedule.isRestDay ? (
        <div className="rest-day-notice">
          <h2>Rest Day</h2>
          <p>{meta.notes}</p>
          <p className="rest-message">No tasks scheduled. Recharge for the week ahead.</p>
        </div>
      ) : (
        <>
          {/* Current / Next Window */}
          {schedule.windows.length > 0 && (
            <section className="briefing-section">
              <h2 className="section-title">
                {getCurrentWindowTitle(schedule.windows, currentHour)}
              </h2>
              <div className="time-windows">
                {schedule.windows.map((window, i) => (
                  <TimeWindowCard
                    key={i}
                    window={window}
                    currentHour={currentHour}
                    tasks={dayTasks.filter(t => t.assignedTimeBlock === formatTimeBlock(window))}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Today's Tasks */}
          <section className="briefing-section">
            <h2 className="section-title">
              Today's Tasks ({dayTasks.length})
            </h2>
            {dayTasks.length === 0 ? (
              <p className="empty-state">No tasks assigned for today. Add tasks using Quick Add above.</p>
            ) : (
              <div className="task-list">
                {dayTasks.map(task => (
                  <TaskCard key={task.id} task={task} showScheduling />
                ))}
              </div>
            )}
          </section>

          {/* Phone Call Queue (drive days) */}
          {phoneTasks.length > 0 && schedule.isDrivingDay && (
            <section className="briefing-section phone-queue">
              <h2 className="section-title">Phone Call Queue</h2>
              <p className="section-subtitle">Tasks you can do while driving</p>
              <div className="task-list">
                {phoneTasks.map(task => (
                  <TaskCard key={task.id} task={task} compact />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {/* Notes for the day */}
      <section className="briefing-section">
        <div className="day-notes">
          <p>{meta.notes}</p>
        </div>
      </section>
    </div>
  );
}

// --- Sub-components ---

function TimeWindowCard({
  window,
  currentHour,
  tasks,
}: {
  window: TimeWindow;
  currentHour: number;
  tasks: ReturnType<typeof getTasksForDay>;
}) {
  const isActive = currentHour >= window.startHour && currentHour < (window.endHour > 24 ? window.endHour - 24 : window.endHour);
  const isPast = currentHour >= (window.endHour > 24 ? window.endHour - 24 : window.endHour);

  return (
    <div className={`time-window-card ${isActive ? 'active' : ''} ${isPast ? 'past' : ''} ${window.isPrime ? 'prime' : ''}`}>
      <div className="window-header">
        <span className="window-time">{formatTimeBlock(window)}</span>
        <span className="window-label">{window.label}</span>
        {window.isPrime && <span className="prime-badge">PRIME</span>}
        {isActive && <span className="active-badge">NOW</span>}
      </div>
      <p className="window-description">{window.description}</p>
      <div className="window-location">{window.location}</div>
      {tasks.length > 0 && (
        <div className="window-tasks">
          {tasks.map(t => (
            <div key={t.id} className="window-task-item">
              {t.title}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// --- Helpers ---

function getGreeting(day: DayOfWeek, hour: number): string {
  const greetings: Record<DayOfWeek, string> = {
    sunday: "Drive day. Denver to Tooele. Light prep after arrival.",
    monday: "PRIME DAY. Your best deep work window is tonight in Rockland.",
    tuesday: "Drive day back to Tooele. Queue up your phone calls.",
    wednesday: "Rest and recovery. You earned it.",
    thursday: "Home day in Denver. Workout then deep work.",
    friday: "Workout, light tasks, then livestream tonight!",
    saturday: "Girlfriend day. No work. Enjoy!",
  };

  const timeGreeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  return `${timeGreeting}, Kuthumi. ${greetings[day]}`;
}

function getCurrentWindowTitle(windows: TimeWindow[], currentHour: number): string {
  for (const w of windows) {
    const endNorm = w.endHour > 24 ? w.endHour - 24 : w.endHour;
    if (currentHour >= w.startHour || (w.endHour > 24 && currentHour < endNorm)) {
      return `Current Window: ${w.label}`;
    }
  }
  return 'Available Windows';
}

function UpcomingHolidayRow({ dateISO, events }: { dateISO: string; events: CalendarEvent[] }) {
  const d = new Date(dateISO + 'T12:00:00');
  const dayName = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const today = new Date();
  const diff = Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const daysLabel = diff === 1 ? 'tomorrow' : `in ${diff} days`;

  return (
    <div className="upcoming-row">
      <span className="upcoming-emojis">{events.map(e => e.emoji).join(' ')}</span>
      <span className="upcoming-names">{events.map(e => e.name).join(', ')}</span>
      <span className="upcoming-date">{dayName}</span>
      <span className="upcoming-days">{daysLabel}</span>
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
