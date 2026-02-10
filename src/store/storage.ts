// ============================================================
// Local Storage Persistence Layer
// ============================================================

import type { AppState } from '../types';
import { createInitialGamification, createDefaultWeeklyGoals } from '../engine/gamification';

const STORAGE_KEY = 'kuthumi-calendar';

const DEFAULT_STATE: AppState = {
  tasks: [],
  projects: [
    {
      id: 'proj-ironmouse',
      name: 'IronMouse Documentary',
      description: 'Documentary project about IronMouse',
      status: 'active',
      color: '#8B5CF6',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'proj-livestream',
      name: 'Livestream Clips',
      description: 'Editing and publishing livestream clips for vertical format',
      status: 'active',
      color: '#EC4899',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'proj-virtual-production',
      name: 'Virtual Production',
      description: 'Virtual production planning and creative direction',
      status: 'active',
      color: '#06B6D4',
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
};

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw) as AppState;
    // Merge with defaults for forward compatibility
    return {
      ...DEFAULT_STATE,
      ...parsed,
      gamification: { ...DEFAULT_STATE.gamification, ...parsed.gamification },
      settings: { ...DEFAULT_STATE.settings, ...parsed.settings },
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
