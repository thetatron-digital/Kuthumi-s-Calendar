// ============================================================
// Routine Engine
// Pre-built weekly routine based on Kuthumi's trucking schedule
// Generates recurring tasks for each week
// ============================================================

import type { Task, SubTask, DayOfWeek, TaskCategory, WorkType, Priority } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface RoutineTemplate {
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

const ROUTINE_TEMPLATES: RoutineTemplate[] = [
  // ---- SUNDAY: Denver → Tooele (drive day, light prep after arrival) ----
  {
    id: 'sun-prep',
    dayOfWeek: 'sunday',
    title: 'Light Prep / Admin',
    category: 'admin',
    workType: 'light',
    priority: 'low',
    defaultSubtasks: [
      'Review Monday deep work plan',
      'Prep notes and files for Rockland session',
    ],
    isPhoneTask: false,
    estimatedMinutes: 120,
  },

  // ---- MONDAY: Tooele → Rockland (PRIME DEEP WORK) ----
  {
    id: 'mon-documentary',
    dayOfWeek: 'monday',
    title: 'Documentary Deep Work (PRIME)',
    category: 'documentary_writing',
    workType: 'deep_focus',
    priority: 'high',
    defaultSubtasks: [
      'Writing session',
      'Clip editing / organizing',
      'Audio research / clip hunting',
    ],
    isPhoneTask: false,
    estimatedMinutes: 240,
  },
  {
    id: 'mon-clips',
    dayOfWeek: 'monday',
    title: 'Clip Editing Session',
    category: 'livestream_editing',
    workType: 'moderate_focus',
    priority: 'medium',
    defaultSubtasks: [
      'Edit clips for vertical format',
      'Review and export',
    ],
    isPhoneTask: false,
    estimatedMinutes: 120,
  },

  // ---- TUESDAY: Rockland → Tooele (drive day, phone + light admin) ----
  {
    id: 'tue-calls',
    dayOfWeek: 'tuesday',
    title: 'Phone Calls (Drive Time)',
    category: 'phone_call',
    workType: 'phone_only',
    priority: 'medium',
    defaultSubtasks: [
      'Production director call',
      'Follow-up calls',
      'Networking outreach',
    ],
    isPhoneTask: true,
    estimatedMinutes: 180,
  },
  {
    id: 'tue-admin',
    dayOfWeek: 'tuesday',
    title: 'Light Admin (Post-Drive)',
    category: 'admin',
    workType: 'light',
    priority: 'low',
    defaultSubtasks: [
      'Process emails',
      'Quick admin tasks',
    ],
    isPhoneTask: false,
    estimatedMinutes: 60,
  },

  // ---- WEDNESDAY: Tooele → Denver (lighter day, decompress + errands) ----
  {
    id: 'wed-decompress',
    dayOfWeek: 'wednesday',
    title: 'Decompress / Light Planning',
    category: 'admin',
    workType: 'light',
    priority: 'low',
    defaultSubtasks: [
      'Review week so far',
      'Plan remaining days',
      'Quick email check',
    ],
    isPhoneTask: false,
    estimatedMinutes: 60,
  },

  // ---- THURSDAY: Denver (secondary deep work day) ----
  {
    id: 'thu-workout',
    dayOfWeek: 'thursday',
    title: 'Workout',
    category: 'other',
    workType: 'light',
    priority: 'high',
    defaultSubtasks: [],
    isPhoneTask: false,
    estimatedMinutes: 90,
  },
  {
    id: 'thu-deep',
    dayOfWeek: 'thursday',
    title: 'Deep Work Session',
    category: 'documentary_writing',
    workType: 'deep_focus',
    priority: 'high',
    defaultSubtasks: [
      'Documentary writing or editing',
      'Clip editing',
      'Networking / industry calls',
    ],
    isPhoneTask: false,
    estimatedMinutes: 300,
  },
  {
    id: 'thu-groceries',
    dayOfWeek: 'thursday',
    title: 'Groceries',
    category: 'admin',
    workType: 'admin',
    priority: 'low',
    defaultSubtasks: [],
    isPhoneTask: false,
    estimatedMinutes: 75,
  },

  // ---- FRIDAY: Denver (light tasks + livestream) ----
  {
    id: 'fri-workout',
    dayOfWeek: 'friday',
    title: 'Workout',
    category: 'other',
    workType: 'light',
    priority: 'high',
    defaultSubtasks: [],
    isPhoneTask: false,
    estimatedMinutes: 90,
  },
  {
    id: 'fri-prestream',
    dayOfWeek: 'friday',
    title: 'Pre-Livestream Tasks',
    category: 'livestream_publishing',
    workType: 'light',
    priority: 'medium',
    defaultSubtasks: [
      'Upload / publish clips',
      'Content prep',
      'Stream setup',
    ],
    isPhoneTask: false,
    estimatedMinutes: 120,
  },
  {
    id: 'fri-stream',
    dayOfWeek: 'friday',
    title: 'Livestream (5 PM - 4 AM)',
    category: 'other',
    workType: 'light',
    priority: 'high',
    defaultSubtasks: [],
    isPhoneTask: false,
    estimatedMinutes: 660,
  },

  // ---- SATURDAY: REST (girlfriend day, optional personal tasks) ----
  {
    id: 'sat-personal',
    dayOfWeek: 'saturday',
    title: 'Personal / Optional Tasks',
    category: 'other',
    workType: 'light',
    priority: 'low',
    defaultSubtasks: [
      'Personal errands',
      'Optional creative work',
    ],
    isPhoneTask: false,
    estimatedMinutes: 60,
  },
];

export function getRoutineTemplates(): RoutineTemplate[] {
  return ROUTINE_TEMPLATES;
}

// Get the Sunday of the week containing the given date
function getWeekSunday(date: Date): Date {
  const d = new Date(date);
  d.setHours(12, 0, 0, 0);
  const day = d.getDay(); // 0=Sun
  d.setDate(d.getDate() - day);
  return d;
}

// Get specific date for a day-of-week within a given week (Sunday-based)
function getDateForDay(weekSunday: Date, dayOfWeek: DayOfWeek): Date {
  const offsets: Record<DayOfWeek, number> = {
    sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
    thursday: 4, friday: 5, saturday: 6,
  };
  const d = new Date(weekSunday);
  d.setDate(d.getDate() + offsets[dayOfWeek]);
  return d;
}

function dateToISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Generate routine tasks for a specific week
export function generateRoutineForWeek(weekSunday: Date, existingTasks: Task[]): Task[] {
  const newTasks: Task[] = [];

  for (const tmpl of ROUTINE_TEMPLATES) {
    const taskDate = getDateForDay(weekSunday, tmpl.dayOfWeek);
    const dateISO = dateToISO(taskDate);

    // Skip if routine task already exists for this date
    const exists = existingTasks.some(
      t => t.routineId === tmpl.id && t.scheduledDate === dateISO
    );
    if (exists) continue;

    const subtasks: SubTask[] = tmpl.defaultSubtasks.map(title => ({
      id: uuidv4(),
      title,
      completed: false,
    }));

    newTasks.push({
      id: uuidv4(),
      title: tmpl.title,
      category: tmpl.category,
      workType: tmpl.workType,
      priority: tmpl.priority,
      deadline: { type: 'none' },
      completed: false,
      createdAt: new Date().toISOString(),
      isBacklog: false,
      isPhoneTask: tmpl.isPhoneTask,
      subtasks,
      scheduledDate: dateISO,
      isRoutine: true,
      routineId: tmpl.id,
      estimatedMinutes: tmpl.estimatedMinutes,
    });
  }

  return newTasks;
}

// Generate routine for current week and next week
export function generateInitialRoutine(): Task[] {
  const today = new Date();
  const thisMonday = getWeekSunday(today);
  const nextMonday = new Date(thisMonday);
  nextMonday.setDate(nextMonday.getDate() + 7);

  const tasks: Task[] = [];
  tasks.push(...generateRoutineForWeek(thisMonday, []));
  tasks.push(...generateRoutineForWeek(nextMonday, tasks));
  return tasks;
}

// Ensure routine tasks exist for a given date range (call on calendar navigation)
export function ensureRoutineForWeek(weekSunday: Date, existingTasks: Task[]): Task[] {
  return generateRoutineForWeek(weekSunday, existingTasks);
}
