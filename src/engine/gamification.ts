// ============================================================
// Gamification Engine
// Tracks streaks, points, weekly goals, and achievements
// ============================================================

import type { GamificationState, PointEntry, Task, WeeklyGoal } from '../types';

// --- Point Values ---
const POINTS = {
  TASK_COMPLETE: 10,
  DEEP_WORK_SESSION: 25,
  PRIME_WINDOW_BONUS: 15,      // Extra for completing in Monday prime
  PRIME_MULTIPLIER: 1.5,       // Multiplier for Monday tasks
  WORKOUT_COMPLETE: 15,
  STREAK_BONUS_PER_DAY: 5,    // Extra per consecutive workout day
  BACKLOG_ITEM_CLEAR: 20,
  WEEKLY_GOAL_MET: 50,
};

export function createInitialGamification(): GamificationState {
  return {
    workoutStreak: 0,
    totalPoints: 0,
    weeklyDeepWorkSessions: 0,
    weeklyClipEditingSessions: 0,
    weeklyGoalMet: false,
    backlogItemsClearedThisMonth: 0,
    primeWindowMultiplier: POINTS.PRIME_MULTIPLIER,
    workoutHistory: {},
    pointsHistory: [],
  };
}

export function createDefaultWeeklyGoals(): WeeklyGoal[] {
  return [
    {
      id: 'deep-work-goal',
      description: 'Complete 2 deep work sessions',
      target: 2,
      current: 0,
      type: 'deep_work',
    },
    {
      id: 'clip-editing-goal',
      description: 'Complete 1 clip editing session',
      target: 1,
      current: 0,
      type: 'clip_editing',
    },
  ];
}

// --- Award points for completing a task ---
export function awardTaskPoints(
  state: GamificationState,
  task: Task,
  today: string
): GamificationState {
  let points = POINTS.TASK_COMPLETE;
  let multiplier = 1;
  const reasons: string[] = ['Task completed'];

  // Deep work bonus
  if (task.workType === 'deep_focus') {
    points += POINTS.DEEP_WORK_SESSION;
    reasons.push('deep work session');
  }

  // Prime window bonus (Monday)
  if (task.assignedDay === 'monday') {
    points += POINTS.PRIME_WINDOW_BONUS;
    multiplier = POINTS.PRIME_MULTIPLIER;
    reasons.push('PRIME window bonus x1.5');
  }

  // Backlog bonus
  if (task.isBacklog) {
    points += POINTS.BACKLOG_ITEM_CLEAR;
    reasons.push('backlog item cleared');
  }

  const totalPoints = Math.round(points * multiplier);
  const entry: PointEntry = {
    date: today,
    points: totalPoints,
    reason: reasons.join(' + '),
    multiplier,
  };

  return {
    ...state,
    totalPoints: state.totalPoints + totalPoints,
    weeklyDeepWorkSessions: task.workType === 'deep_focus'
      ? state.weeklyDeepWorkSessions + 1
      : state.weeklyDeepWorkSessions,
    weeklyClipEditingSessions:
      task.category === 'livestream_editing' || task.category === 'documentary_editing'
        ? state.weeklyClipEditingSessions + 1
        : state.weeklyClipEditingSessions,
    backlogItemsClearedThisMonth: task.isBacklog
      ? state.backlogItemsClearedThisMonth + 1
      : state.backlogItemsClearedThisMonth,
    pointsHistory: [...state.pointsHistory, entry],
  };
}

// --- Record workout ---
export function recordWorkout(state: GamificationState, date: string): GamificationState {
  const newHistory = { ...state.workoutHistory, [date]: true };

  // Calculate streak
  const streak = calculateWorkoutStreak(newHistory, date);
  const streakBonus = streak > 1 ? POINTS.STREAK_BONUS_PER_DAY * streak : 0;
  const points = POINTS.WORKOUT_COMPLETE + streakBonus;

  const entry: PointEntry = {
    date,
    points,
    reason: `Workout completed${streak > 1 ? ` (${streak} streak! +${streakBonus} bonus)` : ''}`,
    multiplier: 1,
  };

  return {
    ...state,
    workoutStreak: streak,
    totalPoints: state.totalPoints + points,
    lastWorkoutDate: date,
    workoutHistory: newHistory,
    pointsHistory: [...state.pointsHistory, entry],
  };
}

// --- Calculate workout streak ---
function calculateWorkoutStreak(history: Record<string, boolean>, currentDate: string): number {
  // Workouts expected on Thursday and Friday
  // Check backwards from current date
  let streak = 0;
  const date = new Date(currentDate);

  // Count current
  if (history[currentDate]) streak++;

  // Go backwards checking each previous workout day
  for (let i = 1; i <= 52; i++) { // up to 52 weeks back
    const checkDate = new Date(date);
    checkDate.setDate(checkDate.getDate() - i);
    const key = checkDate.toISOString().split('T')[0];
    const dayOfWeek = checkDate.getDay(); // 0=Sun, 4=Thu, 5=Fri

    // Only count Thursday (4) and Friday (5) as expected workout days
    if (dayOfWeek === 4 || dayOfWeek === 5) {
      if (history[key]) {
        streak++;
      } else {
        break; // Streak broken
      }
    }
  }

  return streak;
}

// --- Update weekly goals ---
export function updateWeeklyGoals(
  goals: WeeklyGoal[],
  state: GamificationState
): WeeklyGoal[] {
  return goals.map(goal => {
    switch (goal.type) {
      case 'deep_work':
        return { ...goal, current: state.weeklyDeepWorkSessions };
      case 'clip_editing':
        return { ...goal, current: state.weeklyClipEditingSessions };
      default:
        return goal;
    }
  });
}

// --- Check if all weekly goals are met ---
export function areWeeklyGoalsMet(goals: WeeklyGoal[]): boolean {
  return goals.every(g => g.current >= g.target);
}

// --- Reset weekly stats (call on Sunday/start of week) ---
export function resetWeeklyStats(state: GamificationState): GamificationState {
  return {
    ...state,
    weeklyDeepWorkSessions: 0,
    weeklyClipEditingSessions: 0,
    weeklyGoalMet: false,
  };
}
