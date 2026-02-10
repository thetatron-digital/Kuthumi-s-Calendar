// ============================================================
// Kuthumi's Weekly Schedule Engine
// Defines the fixed weekly structure and available time windows
// ============================================================

import type { DayOfWeek, DaySchedule, EnergyLevel, TimeWindow } from '../types';

// --- Time Windows per Day ---

const SUNDAY_WINDOWS: TimeWindow[] = [
  {
    day: 'sunday',
    label: 'Late Night Prep',
    startHour: 22, // 10PM
    endHour: 24,   // midnight
    energyLevel: 'low',
    location: 'Tooele, UT',
    suitableWorkTypes: ['light', 'admin', 'phone_only'],
    description: 'Post-drive window. Light prep or admin only.',
    isPrime: false,
    maxTasks: 2,
  },
];

const MONDAY_WINDOWS: TimeWindow[] = [
  {
    day: 'monday',
    label: 'Prime Deep Work',
    startHour: 21, // 9PM
    endHour: 27,   // 3AM (next day)
    energyLevel: 'high',
    location: 'Rockland, CA',
    suitableWorkTypes: ['deep_focus', 'moderate_focus'],
    description: 'PRIME WINDOW: Best time for documentary writing, clip editing, research, complex work. High energy, no interruptions.',
    isPrime: true,
    maxTasks: 3,
  },
];

const TUESDAY_WINDOWS: TimeWindow[] = [
  {
    day: 'tuesday',
    label: 'Drive Time Calls',
    startHour: 12, // noon
    endHour: 22,   // 10PM
    energyLevel: 'low',
    location: 'Driving: Rockland → Tooele',
    suitableWorkTypes: ['phone_only'],
    description: 'Driving day. Phone calls and voice tasks only.',
    isPrime: false,
    maxTasks: 3,
  },
  {
    day: 'tuesday',
    label: 'Late Night Light Work',
    startHour: 22,
    endHour: 24,
    energyLevel: 'low',
    location: 'Tooele, UT',
    suitableWorkTypes: ['light', 'admin'],
    description: 'Post-drive. Low energy. Light admin or call prep.',
    isPrime: false,
    maxTasks: 1,
  },
];

const WEDNESDAY_WINDOWS: TimeWindow[] = []; // Rest day - no work windows

const THURSDAY_WINDOWS: TimeWindow[] = [
  {
    day: 'thursday',
    label: 'Pre-Workout',
    startHour: 11, // 11AM
    endHour: 14,   // 2PM
    energyLevel: 'secondary',
    location: 'Denver, CO',
    suitableWorkTypes: ['light', 'moderate_focus', 'phone_only', 'admin'],
    description: 'Before workout. Good for calls, planning, light tasks.',
    isPrime: false,
    maxTasks: 2,
  },
  {
    day: 'thursday',
    label: 'Secondary Deep Work',
    startHour: 16, // 4PM (post-workout + errands)
    endHour: 26,   // 2AM
    energyLevel: 'secondary',
    location: 'Denver, CO',
    suitableWorkTypes: ['deep_focus', 'moderate_focus', 'light', 'phone_only'],
    description: 'SECONDARY DEEP WORK: Documentary writing, clip editing, networking, collaborative work.',
    isPrime: false,
    maxTasks: 4,
  },
];

const FRIDAY_WINDOWS: TimeWindow[] = [
  {
    day: 'friday',
    label: 'Pre-Livestream Work',
    startHour: 15, // 3PM
    endHour: 17,   // 5PM
    energyLevel: 'low',
    location: 'Denver, CO',
    suitableWorkTypes: ['light', 'moderate_focus', 'admin'],
    description: 'Before livestream. Light tasks, uploads, publishing.',
    isPrime: false,
    maxTasks: 2,
  },
];

const SATURDAY_WINDOWS: TimeWindow[] = []; // Girlfriend day - no work

// --- Schedule Map ---
export const WEEKLY_WINDOWS: Record<DayOfWeek, TimeWindow[]> = {
  sunday: SUNDAY_WINDOWS,
  monday: MONDAY_WINDOWS,
  tuesday: TUESDAY_WINDOWS,
  wednesday: WEDNESDAY_WINDOWS,
  thursday: THURSDAY_WINDOWS,
  friday: FRIDAY_WINDOWS,
  saturday: SATURDAY_WINDOWS,
};

// --- Day Metadata ---
interface DayMeta {
  location: string;
  wakeTime: string;
  departTime?: string;
  arriveTime?: string;
  energyLevel: EnergyLevel;
  notes: string;
  isDrivingDay: boolean;
  isRestDay: boolean;
}

const DAY_META: Record<DayOfWeek, DayMeta> = {
  sunday: {
    location: 'Denver → Tooele',
    wakeTime: '11:00 AM',
    departTime: '12:00 PM',
    arriveTime: '10:00 PM - 12:00 AM',
    energyLevel: 'low',
    notes: 'Drive day. ~10-11 hours. 2 hours light work after arrival.',
    isDrivingDay: true,
    isRestDay: false,
  },
  monday: {
    location: 'Tooele → Rockland',
    wakeTime: '~10:00 AM (after 10hr rest)',
    departTime: '10:00 AM',
    arriveTime: '8:00 - 10:00 PM',
    energyLevel: 'high',
    notes: 'PRIME DAY. 4-6 hours deep work in Rockland. Load departs noon Tuesday.',
    isDrivingDay: true,
    isRestDay: false,
  },
  tuesday: {
    location: 'Rockland → Tooele',
    wakeTime: 'After good sleep',
    departTime: '12:00 PM Pacific',
    arriveTime: '10:00 PM - 12:00 AM',
    energyLevel: 'low',
    notes: 'Drive day. ~10 hours. Phone calls during drive. Light admin after arrival.',
    isDrivingDay: true,
    isRestDay: false,
  },
  wednesday: {
    location: 'Tooele → Denver',
    wakeTime: '~10:00 AM (after 10hr rest)',
    departTime: '10:00 AM',
    arriveTime: '6:00 - 10:00 PM',
    energyLevel: 'rest',
    notes: 'Rest & recovery day. Shower, decompress, girlfriend time. No work.',
    isDrivingDay: true,
    isRestDay: true,
  },
  thursday: {
    location: 'Denver, CO',
    wakeTime: '10:00 - 11:00 AM',
    energyLevel: 'secondary',
    notes: 'Home day. Workout 2-3 PM (~1.5hrs). Groceries ~weekly. Deep work after.',
    isDrivingDay: false,
    isRestDay: false,
  },
  friday: {
    location: 'Denver, CO',
    wakeTime: '11:00 AM - 12:00 PM',
    energyLevel: 'low',
    notes: 'Workout 2 PM. Livestream 5 PM - 4 AM. Light tasks before stream only.',
    isDrivingDay: false,
    isRestDay: false,
  },
  saturday: {
    location: 'Denver, CO',
    wakeTime: 'Flexible',
    energyLevel: 'rest',
    notes: 'Girlfriend day. No work scheduled.',
    isDrivingDay: false,
    isRestDay: true,
  },
};

// --- Get schedule for a specific day ---
export function getDaySchedule(day: DayOfWeek, date: string): DaySchedule {
  const meta = DAY_META[day];
  return {
    day,
    date,
    location: meta.location,
    wakeTime: meta.wakeTime,
    departTime: meta.departTime,
    arriveTime: meta.arriveTime,
    energyLevel: meta.energyLevel,
    windows: WEEKLY_WINDOWS[day],
    notes: meta.notes,
    isDrivingDay: meta.isDrivingDay,
    isRestDay: meta.isRestDay,
  };
}

// --- Get all windows for the week ---
export function getWeekWindows(): TimeWindow[] {
  const days: DayOfWeek[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return days.flatMap(day => WEEKLY_WINDOWS[day]);
}

// --- Get energy level for a day ---
export function getEnergyLevel(day: DayOfWeek): EnergyLevel {
  return DAY_META[day].energyLevel;
}

// --- Check if a day is a driving day ---
export function isDrivingDay(day: DayOfWeek): boolean {
  return DAY_META[day].isDrivingDay;
}

// --- Check if phone calls are suitable ---
export function isPhoneDay(day: DayOfWeek): boolean {
  return day === 'sunday' || day === 'tuesday' || day === 'thursday' || day === 'friday';
}

// --- Get day metadata ---
export function getDayMeta(day: DayOfWeek): DayMeta {
  return DAY_META[day];
}
