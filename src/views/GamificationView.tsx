// ============================================================
// Gamification View
// Streaks, points, weekly goals, habit tracking
// ============================================================

import { useAppStore } from '../store/useAppStore';
import { getTodayISO } from '../utils/dateUtils';

export default function GamificationView() {
  const { state, dispatch } = useAppStore();
  const { gamification, weeklyGoals } = state;
  const today = getTodayISO();
  const todayDay = new Date().getDay(); // 0=Sun, 4=Thu, 5=Fri

  const isWorkoutDay = todayDay === 4 || todayDay === 5;
  const workedOutToday = gamification.workoutHistory[today] || false;

  const handleWorkout = () => {
    if (!workedOutToday) {
      dispatch({ type: 'RECORD_WORKOUT', payload: { date: today } });
    }
  };

  // Get recent point history (last 10 entries)
  const recentPoints = [...gamification.pointsHistory].reverse().slice(0, 10);

  return (
    <div className="gamification-view">
      <h1 className="view-title">Stats & Progress</h1>

      {/* Points Summary */}
      <div className="stats-grid">
        <div className="stat-card total-points">
          <span className="stat-value">{gamification.totalPoints}</span>
          <span className="stat-label">Total Points</span>
        </div>
        <div className="stat-card streak">
          <span className="stat-value">{gamification.workoutStreak}</span>
          <span className="stat-label">Workout Streak</span>
        </div>
        <div className="stat-card deep-work">
          <span className="stat-value">{gamification.weeklyDeepWorkSessions}</span>
          <span className="stat-label">Deep Work Sessions (Week)</span>
        </div>
        <div className="stat-card backlog">
          <span className="stat-value">{gamification.backlogItemsClearedThisMonth}</span>
          <span className="stat-label">Backlog Cleared (Month)</span>
        </div>
      </div>

      {/* Workout Tracker */}
      <section className="gamification-section">
        <h2 className="section-title">Workout Tracker</h2>
        <div className="workout-tracker">
          <div className="workout-days">
            <WorkoutDayBox
              label="Thursday"
              dayNum={4}
              todayNum={todayDay}
              history={gamification.workoutHistory}
            />
            <WorkoutDayBox
              label="Friday"
              dayNum={5}
              todayNum={todayDay}
              history={gamification.workoutHistory}
            />
          </div>

          {isWorkoutDay && (
            <button
              className={`btn-workout ${workedOutToday ? 'completed' : ''}`}
              onClick={handleWorkout}
              disabled={workedOutToday}
            >
              {workedOutToday ? 'Workout Logged!' : 'Log Workout'}
            </button>
          )}

          {!isWorkoutDay && (
            <p className="workout-rest-note">
              Next workout: {todayDay < 4 ? 'Thursday' : 'Next Thursday'}
            </p>
          )}

          {gamification.workoutStreak > 0 && (
            <div className="streak-display">
              <span className="streak-fire">&#x1F525;</span>
              <span>{gamification.workoutStreak} workout streak!</span>
              {gamification.workoutStreak >= 4 && (
                <span className="streak-bonus">+{gamification.workoutStreak * 5} streak bonus per session</span>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Weekly Goals */}
      <section className="gamification-section">
        <h2 className="section-title">Weekly Goals</h2>
        {gamification.weeklyGoalMet && (
          <div className="goals-met-banner">
            All weekly goals met! +50 bonus points
          </div>
        )}
        <div className="goals-list">
          {weeklyGoals.map(goal => {
            const progress = Math.min(goal.current / goal.target, 1) * 100;
            const met = goal.current >= goal.target;
            return (
              <div key={goal.id} className={`goal-card ${met ? 'met' : ''}`}>
                <div className="goal-header">
                  <span className="goal-desc">{goal.description}</span>
                  <span className="goal-count">{goal.current}/{goal.target}</span>
                </div>
                <div className="goal-progress-bar">
                  <div
                    className="goal-progress-fill"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                {met && <span className="goal-check">&#x2713;</span>}
              </div>
            );
          })}
        </div>
      </section>

      {/* Prime Window Multiplier */}
      <section className="gamification-section">
        <h2 className="section-title">Bonus Multipliers</h2>
        <div className="multiplier-info">
          <div className="multiplier-card">
            <span className="multiplier-value">x{gamification.primeWindowMultiplier}</span>
            <span className="multiplier-label">Monday Prime Window</span>
            <p className="multiplier-desc">Complete tasks during Monday's Rockland window for 1.5x points</p>
          </div>
        </div>
      </section>

      {/* Recent Activity */}
      {recentPoints.length > 0 && (
        <section className="gamification-section">
          <h2 className="section-title">Recent Activity</h2>
          <div className="activity-log">
            {recentPoints.map((entry, i) => (
              <div key={i} className="activity-entry">
                <span className="activity-points">+{entry.points}</span>
                <span className="activity-reason">{entry.reason}</span>
                <span className="activity-date">{new Date(entry.date).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// --- Workout Day Box ---
function WorkoutDayBox({
  label,
  dayNum,
  todayNum,
  history,
}: {
  label: string;
  dayNum: number;
  todayNum: number;
  history: Record<string, boolean>;
}) {
  // Find most recent occurrence of this day
  const today = new Date();
  const diff = todayNum >= dayNum ? todayNum - dayNum : 7 - dayNum + todayNum;
  const targetDate = new Date(today);
  targetDate.setDate(today.getDate() - diff);
  const dateKey = targetDate.toISOString().split('T')[0];
  const completed = history[dateKey] || false;
  const isToday = todayNum === dayNum;

  return (
    <div className={`workout-day-box ${completed ? 'completed' : ''} ${isToday ? 'today' : ''}`}>
      <span className="workout-day-label">{label}</span>
      <div className={`workout-checkbox ${completed ? 'checked' : ''}`}>
        {completed ? '\u2713' : ''}
      </div>
    </div>
  );
}
