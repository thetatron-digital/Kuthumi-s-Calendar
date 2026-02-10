// ============================================================
// Date Utilities
// ============================================================

import type { DayOfWeek } from '../types';

const DAY_MAP: DayOfWeek[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

export function getTodayDayOfWeek(): DayOfWeek {
  return DAY_MAP[new Date().getDay()];
}

export function getTodayISO(): string {
  return new Date().toISOString().split('T')[0];
}

export function getDayOfWeekFromDate(date: Date): DayOfWeek {
  return DAY_MAP[date.getDay()];
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
}

export function getWeekDates(): { day: DayOfWeek; date: string }[] {
  const today = new Date();
  const currentDayIndex = today.getDay(); // 0=Sunday

  return DAY_MAP.map((day, i) => {
    const diff = i - currentDayIndex;
    const d = new Date(today);
    d.setDate(today.getDate() + diff);
    return { day, date: d.toISOString().split('T')[0] };
  });
}

export function daysUntil(dateStr: string): number {
  const target = new Date(dateStr + 'T23:59:59');
  const now = new Date();
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function formatDeadline(deadline: { type: string; date?: string }): string {
  switch (deadline.type) {
    case 'asap': return 'ASAP';
    case 'this_week': return 'This week';
    case 'specific_date':
      if (deadline.date) {
        const days = daysUntil(deadline.date);
        const formatted = formatDate(deadline.date);
        if (days < 0) return `Overdue (${formatted})`;
        if (days === 0) return `Today!`;
        if (days === 1) return `Tomorrow`;
        return `${formatted} (${days} days)`;
      }
      return 'Has deadline';
    case 'whenever': return 'Whenever';
    default: return 'No deadline';
  }
}

export function dayLabel(day: DayOfWeek): string {
  return day.charAt(0).toUpperCase() + day.slice(1);
}
