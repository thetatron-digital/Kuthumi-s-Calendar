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
  date?: string;
}

// --- SubTask ---
export interface SubTask {
  id: string;
  title: string;
  completed: boolean;
  completedAt?: string;
}

// --- Task Section ---
export type TaskSection = 'today' | 'later' | 'personal' | 'career' | 'production' | 'general';

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
  assignedTimeBlock?: string;
  schedulingReason?: string;
  isBacklog: boolean;
  isPhoneTask: boolean;
  estimatedMinutes?: number;
  subtasks: SubTask[];
  section?: TaskSection;
  scheduledDate?: string;
  isRoutine?: boolean;
  routineId?: string;
  targetMonth?: string; // "YYYY-MM" for monthly goals
  // Timeline fields
  startTime?: string;   // "HH:MM" 24hr format (e.g., "21:00")
  taskColor?: string;    // Custom color override for timeline block
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
  startHour: number;
  endHour: number;
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
  date: string;
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
  workoutHistory: Record<string, boolean>;
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

// --- Routine Template (user-editable) ---
export interface RoutineTemplate {
  id: string;
  dayOfWeek: DayOfWeek;
  title: string;
  category: TaskCategory;
  workType: WorkType;
  priority: Priority;
  defaultSubtasks: string[];
  isPhoneTask: boolean;
  estimatedMinutes?: number;
}

// --- App Mode ---
export type AppMode = 'focus' | 'edit';

// --- Active View ---
export type ActiveView = 'calendar' | 'timeline';

// --- Timeline Layout Density ---
export type TimelineLayout = 'full' | 'simplified' | 'minimal';

// --- App State ---
export interface AppState {
  stateVersion: number;
  tasks: Task[];
  projects: Project[];
  routineTemplates: RoutineTemplate[];
  gamification: GamificationState;
  weeklyGoals: WeeklyGoal[];
  settings: AppSettings;
  selectedDate: string;
  mode: AppMode;
}

export interface AppSettings {
  timezone: string;
  defaultView: 'daily' | 'weekly' | 'backlog' | 'projects';
  theme: 'dark' | 'light';
  activeView: ActiveView;
  timelineLayout: TimelineLayout;
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
