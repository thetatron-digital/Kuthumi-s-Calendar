// ============================================================
// Kuthumi's Calendar - Core Type Definitions
// ============================================================

// --- Day of Week ---
export type DayOfWeek = 'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday';

// --- Energy Levels ---
export type EnergyLevel = 'high' | 'secondary' | 'low' | 'rest';

// --- Task Categories ---
export type TaskCategory =
  | 'documentary_writing'
  | 'documentary_editing'
  | 'documentary_research'
  | 'livestream_editing'
  | 'livestream_publishing'
  | 'virtual_production_planning'
  | 'virtual_production_creative'
  | 'networking'
  | 'admin'
  | 'phone_call'
  | 'other';

// --- Work Type ---
export type WorkType = 'deep_focus' | 'moderate_focus' | 'light' | 'phone_only' | 'admin';

// --- Priority ---
export type Priority = 'high' | 'medium' | 'low';

// --- Deadline ---
export type DeadlineType = 'asap' | 'this_week' | 'specific_date' | 'whenever' | 'none';

export interface Deadline {
  type: DeadlineType;
  date?: string; // ISO date string
}

// --- Task ---
export interface Task {
  id: string;
  title: string;
  description?: string;
  category: TaskCategory;
  workType: WorkType;
  priority: Priority;
  deadline: Deadline;
  projectId?: string;
  completed: boolean;
  completedAt?: string;
  createdAt: string;
  assignedDay?: DayOfWeek;
  assignedTimeBlock?: string; // e.g. "9PM-1AM"
  schedulingReason?: string;
  isBacklog: boolean;
  isPhoneTask: boolean;
  estimatedMinutes?: number;
}

// --- Project ---
export type ProjectStatus = 'active' | 'on_hold' | 'archived';

export interface Project {
  id: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  color: string;
  createdAt: string;
  updatedAt: string;
}

// --- Time Window ---
export interface TimeWindow {
  day: DayOfWeek;
  label: string;
  startHour: number; // 24h format
  endHour: number;   // 24h format, can be > 24 for next-day (e.g. 25 = 1AM)
  energyLevel: EnergyLevel;
  location: string;
  suitableWorkTypes: WorkType[];
  description: string;
  isPrime: boolean;
  maxTasks: number;
}

// --- Day Schedule ---
export interface DaySchedule {
  day: DayOfWeek;
  date: string; // ISO date string
  location: string;
  wakeTime: string;
  departTime?: string;
  arriveTime?: string;
  energyLevel: EnergyLevel;
  windows: TimeWindow[];
  notes: string;
  isDrivingDay: boolean;
  isRestDay: boolean;
}

// --- Gamification ---
export interface GamificationState {
  workoutStreak: number;
  totalPoints: number;
  weeklyDeepWorkSessions: number;
  weeklyClipEditingSessions: number;
  weeklyGoalMet: boolean;
  backlogItemsClearedThisMonth: number;
  primeWindowMultiplier: number;
  lastWorkoutDate?: string;
  workoutHistory: Record<string, boolean>; // ISO date -> completed
  pointsHistory: PointEntry[];
}

export interface PointEntry {
  date: string;
  points: number;
  reason: string;
  multiplier: number;
}

// --- Weekly Goal ---
export interface WeeklyGoal {
  id: string;
  description: string;
  target: number;
  current: number;
  type: 'deep_work' | 'clip_editing' | 'phone_calls' | 'backlog' | 'custom';
}

// --- App State ---
export interface AppState {
  tasks: Task[];
  projects: Project[];
  gamification: GamificationState;
  weeklyGoals: WeeklyGoal[];
  settings: AppSettings;
}

export interface AppSettings {
  timezone: string;
  defaultView: 'daily' | 'weekly' | 'backlog' | 'projects';
}

// --- Parsed Quick Add ---
export interface ParsedQuickAdd {
  title: string;
  category: TaskCategory;
  workType: WorkType;
  priority: Priority;
  deadline: Deadline;
  isPhoneTask: boolean;
  isBacklog: boolean;
  projectId?: string;
}
