// ============================================================
// Local Storage Persistence Layer
// ============================================================

import type { AppState, Task } from '../types';
import { createInitialGamification, createDefaultWeeklyGoals } from '../engine/gamification';
import { generateInitialRoutine } from '../engine/routine';

const STORAGE_KEY = 'kuthumi-calendar';

function getTodayISO(): string {
  return new Date().toISOString().split('T')[0];
}

const DEFAULT_STATE: AppState = {
  tasks: generateInitialRoutine(),
  projects: [
    {
      id: 'proj-ironmouse',
      name: 'IronMouse Documentary',
      description: 'Documentary project about IronMouse',
      status: 'active',
      color: '#3b82f6',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'proj-livestream',
      name: 'Livestream Clips',
      description: 'Editing and publishing livestream clips for vertical format',
      status: 'active',
      color: '#f43f5e',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'proj-virtual-production',
      name: 'Virtual Production',
      description: 'Virtual production planning and creative direction',
      status: 'active',
      color: '#06b6d4',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  gamification: createInitialGamification(),
  weeklyGoals: createDefaultWeeklyGoals(),
  settings: {
    timezone: 'America/Denver',
    defaultView: 'daily',
    theme: 'dark',
  },
  selectedDate: getTodayISO(),
  mode: 'focus',
};

function migrateTask(t: Partial<Task> & { id: string; title: string }): Task {
  return {
    ...t,
    subtasks: t.subtasks || [],
    section: t.section || undefined,
    scheduledDate: t.scheduledDate || undefined,
    category: t.category || 'other',
    workType: t.workType || 'light',
    priority: t.priority || 'medium',
    deadline: t.deadline || { type: 'none' },
    completed: t.completed || false,
    createdAt: t.createdAt || new Date().toISOString(),
    isBacklog: t.isBacklog || false,
    isPhoneTask: t.isPhoneTask || false,
  } as Task;
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw) as AppState;
    return {
      ...DEFAULT_STATE,
      ...parsed,
      tasks: (parsed.tasks || []).map(t => migrateTask(t)),
      gamification: { ...DEFAULT_STATE.gamification, ...parsed.gamification },
      settings: { ...DEFAULT_STATE.settings, ...parsed.settings },
      selectedDate: parsed.selectedDate || getTodayISO(),
      mode: parsed.mode || 'focus',
    };
  } catch {
    return DEFAULT_STATE;
  }
}

export function saveState(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save state:', e);
  }
}

export function clearState(): void {
  localStorage.removeItem(STORAGE_KEY);
}
