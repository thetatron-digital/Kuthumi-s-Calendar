// ============================================================
// Auto-Scheduling Engine
// Assigns tasks to optimal time windows based on type, priority,
// and Kuthumi's weekly schedule
// ============================================================

import type { Task, DayOfWeek, TimeWindow, WorkType, TaskCategory } from '../types';
import { WEEKLY_WINDOWS } from './schedule';

// --- Category to Work Type mapping ---
const CATEGORY_WORK_TYPE: Record<TaskCategory, WorkType> = {
  documentary_writing: 'deep_focus',
  documentary_editing: 'deep_focus',
  documentary_research: 'moderate_focus',
  livestream_editing: 'moderate_focus',
  livestream_publishing: 'light',
  virtual_production_planning: 'phone_only',
  virtual_production_creative: 'deep_focus',
  networking: 'phone_only',
  admin: 'admin',
  phone_call: 'phone_only',
  other: 'light',
};

// --- Scheduling Priority Order ---
// For deep focus: Monday Prime > Thursday Secondary
// For moderate: Monday > Thursday > Friday
// For phone: Tuesday drive > Sunday drive > Thursday > Friday
// For admin/light: Sunday > Tuesday post-drive > Thursday pre-workout > Friday
const SCHEDULING_ORDER: Record<WorkType, DayOfWeek[]> = {
  deep_focus: ['monday', 'thursday'],
  moderate_focus: ['monday', 'thursday', 'friday'],
  light: ['thursday', 'friday', 'sunday', 'tuesday'],
  phone_only: ['tuesday', 'thursday', 'sunday', 'friday'],
  admin: ['sunday', 'tuesday', 'thursday', 'friday'],
};

export interface SchedulingResult {
  day: DayOfWeek;
  window: TimeWindow;
  reason: string;
  timeBlock: string;
}

// --- Find best window for a task ---
export function findBestWindow(
  task: Task,
  existingAssignments: Map<string, number> // windowKey -> count of assigned tasks
): SchedulingResult | null {
  const workType = task.workType || CATEGORY_WORK_TYPE[task.category] || 'light';
  const dayOrder = SCHEDULING_ORDER[workType] || ['thursday', 'monday'];

  for (const day of dayOrder) {
    const windows = WEEKLY_WINDOWS[day];
    for (const window of windows) {
      // Check if this window supports the work type
      if (!window.suitableWorkTypes.includes(workType)) continue;

      // Check capacity
      const windowKey = `${day}-${window.label}`;
      const currentCount = existingAssignments.get(windowKey) || 0;
      if (currentCount >= window.maxTasks) continue;

      // Found a suitable window
      const reason = buildReason(task, day, window);
      const timeBlock = formatTimeBlock(window);

      return { day, window, reason, timeBlock };
    }
  }

  // Fallback: try any available window
  const allDays: DayOfWeek[] = ['monday', 'thursday', 'friday', 'sunday', 'tuesday'];
  for (const day of allDays) {
    const windows = WEEKLY_WINDOWS[day];
    for (const window of windows) {
      const windowKey = `${day}-${window.label}`;
      const currentCount = existingAssignments.get(windowKey) || 0;
      if (currentCount >= window.maxTasks) continue;

      return {
        day,
        window,
        reason: `Assigned to ${capitalize(day)} as a fallback — preferred windows are full.`,
        timeBlock: formatTimeBlock(window),
      };
    }
  }

  return null; // No windows available
}

// --- Schedule all active tasks ---
export function autoScheduleAll(tasks: Task[]): Task[] {
  const activeTasks = tasks.filter(t => !t.completed && !t.isBacklog);
  const assignments = new Map<string, number>();

  // Sort by priority (high first), then by deadline urgency
  const sorted = [...activeTasks].sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    const pDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (pDiff !== 0) return pDiff;

    // Urgent deadlines first
    const aUrgency = getDeadlineUrgency(a);
    const bUrgency = getDeadlineUrgency(b);
    return aUrgency - bUrgency;
  });

  const updated: Task[] = [];

  for (const task of sorted) {
    const result = findBestWindow(task, assignments);
    if (result) {
      const windowKey = `${result.day}-${result.window.label}`;
      assignments.set(windowKey, (assignments.get(windowKey) || 0) + 1);

      updated.push({
        ...task,
        assignedDay: result.day,
        assignedTimeBlock: result.timeBlock,
        schedulingReason: result.reason,
      });
    } else {
      updated.push({
        ...task,
        assignedDay: undefined,
        assignedTimeBlock: undefined,
        schedulingReason: 'No available window this week. Consider adjusting priorities or moving to backlog.',
      });
    }
  }

  // Include completed and backlog tasks unchanged
  const others = tasks.filter(t => t.completed || t.isBacklog);
  return [...updated, ...others];
}

// --- Get tasks for a specific day ---
export function getTasksForDay(tasks: Task[], day: DayOfWeek): Task[] {
  return tasks.filter(t => t.assignedDay === day && !t.completed && !t.isBacklog);
}

// --- Get phone tasks for drive days ---
export function getPhoneTasks(tasks: Task[]): Task[] {
  return tasks.filter(t => t.isPhoneTask && !t.completed && !t.isBacklog);
}

// --- Helpers ---

function getDeadlineUrgency(task: Task): number {
  if (task.deadline.type === 'asap') return 0;
  if (task.deadline.type === 'this_week') return 1;
  if (task.deadline.type === 'specific_date' && task.deadline.date) {
    const days = Math.max(0, (new Date(task.deadline.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return 2 + days;
  }
  if (task.deadline.type === 'whenever') return 100;
  return 50; // 'none'
}

function buildReason(task: Task, day: DayOfWeek, window: TimeWindow): string {
  const parts: string[] = [];

  if (window.isPrime) {
    parts.push('Assigned to PRIME deep work window (Monday in Rockland).');
  }

  const categoryReasons: Partial<Record<TaskCategory, string>> = {
    documentary_writing: 'Documentary writing needs deep focus.',
    documentary_editing: 'Clip editing needs sustained concentration.',
    documentary_research: 'Research benefits from uninterrupted time.',
    livestream_editing: 'Livestream editing needs focused work.',
    livestream_publishing: 'Publishing is a light task — fits smaller windows.',
    virtual_production_planning: 'Production calls work well during phone windows.',
    virtual_production_creative: 'Creative direction needs deep focus.',
    networking: 'Networking calls fit phone-friendly windows.',
    phone_call: 'Phone calls assigned to drive time or flexible slots.',
    admin: 'Admin tasks assigned to light work windows.',
  };

  if (categoryReasons[task.category]) {
    parts.push(categoryReasons[task.category]!);
  }

  if (task.priority === 'high') {
    parts.push('High priority — placed in earliest available optimal slot.');
  }

  if (day === 'monday') {
    parts.push('Monday Rockland has 4-6 hours of high-energy focus time.');
  } else if (day === 'thursday') {
    parts.push('Thursday is your secondary deep work day at home in Denver.');
  } else if (day === 'tuesday') {
    parts.push('Tuesday drive time is good for phone-based tasks.');
  } else if (day === 'friday') {
    parts.push('Friday before livestream — keep it light.');
  } else if (day === 'sunday') {
    parts.push('Sunday arrival window — only light prep tasks.');
  }

  return parts.join(' ') || `Assigned to ${capitalize(day)}.`;
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

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
