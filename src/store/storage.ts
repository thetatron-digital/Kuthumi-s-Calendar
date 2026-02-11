// ============================================================
// Local Storage Persistence Layer
// Preserves user data (tasks, progress) across code deploys
// ============================================================

import type { AppState, Task, SubTask, RoutineTemplate } from '../types';
import { createInitialGamification, createDefaultWeeklyGoals } from '../engine/gamification';
import { generateInitialRoutine, DEFAULT_ROUTINE_TEMPLATES } from '../engine/routine';
import { v4 as uuidv4 } from 'uuid';

const STORAGE_KEY = 'kuthumi-calendar';
const CURRENT_VERSION = 2; // Bump when schema changes

function getTodayISO(): string {
  return new Date().toISOString().split('T')[0];
}

// Generate initial personal tasks from Kuthumi's Notes app screenshots
function generateInitialTasks(): Task[] {
  const today = getTodayISO();
  const now = new Date().toISOString();

  function mkSubs(titles: string[]): SubTask[] {
    return titles.map(t => ({ id: uuidv4(), title: t, completed: false }));
  }

  function mkTask(opts: {
    title: string;
    category?: Task['category'];
    priority?: Task['priority'];
    scheduledDate?: string;
    isBacklog?: boolean;
    subtasks?: SubTask[];
    projectId?: string;
  }): Task {
    return {
      id: uuidv4(),
      title: opts.title,
      category: opts.category || 'other',
      workType: 'light',
      priority: opts.priority || 'medium',
      deadline: { type: 'none' },
      completed: false,
      createdAt: now,
      isBacklog: opts.isBacklog || false,
      isPhoneTask: false,
      subtasks: opts.subtasks || [],
      scheduledDate: opts.scheduledDate,
      projectId: opts.projectId,
    };
  }

  return [
    // --- TODAY tasks (from screenshot 3) ---
    mkTask({ title: 'Move credit card money (debit transfer)', category: 'admin', priority: 'high', scheduledDate: today }),
    mkTask({ title: 'Call tax relief number', category: 'phone_call', priority: 'high', scheduledDate: today }),
    mkTask({ title: 'Do taxes but dont pay yet', category: 'admin', priority: 'high', scheduledDate: today }),
    mkTask({ title: 'Coleby Produce', category: 'other', priority: 'medium', scheduledDate: today, projectId: 'proj-coleby' }),
    mkTask({ title: 'Edit Iron Mouse', category: 'livestream_editing', priority: 'medium', scheduledDate: today, projectId: 'proj-ironmouse' }),

    // --- Active tasks (from screenshot 3, no specific date) ---
    mkTask({ title: 'Email Kevin', category: 'admin', priority: 'medium', isBacklog: true }),
    mkTask({ title: '"Says You" show licensing email', category: 'admin', priority: 'medium', isBacklog: true }),
    mkTask({ title: 'Email Marche / "We Were Fighting Before This" podcast producer', category: 'admin', priority: 'medium', isBacklog: true }),
    mkTask({ title: 'Edit stream clips', category: 'livestream_editing', priority: 'medium', isBacklog: true, projectId: 'proj-livestream' }),

    // --- LATER tasks (backlog, from screenshot 3) ---
    mkTask({ title: 'Website: Remove NSOS', category: 'admin', priority: 'low', isBacklog: true }),
    mkTask({ title: 'Film Freeway submissions', category: 'admin', priority: 'low', isBacklog: true }),
    mkTask({ title: 'CSARS - Matt Vail email', category: 'admin', priority: 'medium', isBacklog: true }),
    mkTask({ title: 'Career Follow-up calls', category: 'phone_call', priority: 'medium', isBacklog: true }),

    // --- PERSONAL tasks (backlog, from screenshot 4) ---
    mkTask({ title: 'Buy Tesla charger cable', category: 'admin', priority: 'low', isBacklog: true }),
    mkTask({ title: 'Stolen ID - name change and SSN', category: 'admin', priority: 'high', isBacklog: true }),
    mkTask({ title: 'Name change', category: 'admin', priority: 'medium', isBacklog: true }),
    mkTask({ title: 'SSN change', category: 'admin', priority: 'medium', isBacklog: true }),
    mkTask({ title: 'Quit claim deed', category: 'admin', priority: 'medium', isBacklog: true }),
    mkTask({ title: 'Pay for car registration', category: 'admin', priority: 'high', scheduledDate: '2026-03-14' }),

    // --- Coleby Production tasks (from screenshot 2) ---
    mkTask({
      title: 'Coleby Pre-Production',
      category: 'other',
      priority: 'high',
      isBacklog: true,
      projectId: 'proj-coleby',
      subtasks: mkSubs([
        'Wages - actor',
        'Wages - clothes',
        '1st AD Matt',
        'Sound',
        'Food',
        'Old revolver with trigger (prop)',
        'Another soldier actor',
        '2 wester (Dustin Cheety is 1)',
      ]),
    }),
    mkTask({
      title: 'ManMadeMedia.com research',
      category: 'admin',
      priority: 'medium',
      isBacklog: true,
      projectId: 'proj-coleby',
      subtasks: mkSubs([
        'What is their cost?',
        'Space/Camera/Robot Arm inquiry ($8k)',
      ]),
    }),

    // --- Career / Semester Goals (from screenshot 5) ---
    mkTask({
      title: 'Career Goals - This Semester',
      category: 'other',
      priority: 'high',
      isBacklog: true,
      subtasks: mkSubs([
        'Get connected with an advertising person',
        'Do mock advertising on insta',
        'Music video or action video',
        'Virtual "Angels" production',
        'Distribute One film w/ deliverables and business plan',
        'Understand American/European Film Market',
        'Ask Gaia what movies/shows they are looking to buy',
        'Become coverage writer for film festival',
        'Rep: CAA, DMI, WME',
        'Find a head hunter to hire you',
      ]),
    }),
  ];
}

const DEFAULT_STATE: AppState = {
  stateVersion: CURRENT_VERSION,
  tasks: [...generateInitialRoutine(), ...generateInitialTasks()],
  projects: [
    {
      id: 'proj-ironmouse',
      name: 'IronMouse Documentary',
      description: 'Documentary project about IronMouse',
      status: 'active',
      color: '#a3a3a3',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'proj-livestream',
      name: 'Livestream Clips',
      description: 'Editing and publishing livestream clips for vertical format',
      status: 'active',
      color: '#737373',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'proj-virtual-production',
      name: 'Virtual Production',
      description: 'Virtual production planning and creative direction',
      status: 'active',
      color: '#525252',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'proj-coleby',
      name: 'Coleby Production',
      description: 'Short film production - Coleby',
      status: 'active',
      color: '#d4d4d4',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  routineTemplates: [...DEFAULT_ROUTINE_TEMPLATES],
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

function migrateRoutineTemplate(t: Partial<RoutineTemplate> & { id: string }): RoutineTemplate {
  return {
    dayOfWeek: 'monday',
    title: 'Untitled',
    category: 'other',
    workType: 'light',
    priority: 'medium',
    defaultSubtasks: [],
    isPhoneTask: false,
    ...t,
  };
}

// Migrate state from older versions
function migrateState(parsed: Record<string, unknown>): Partial<AppState> {
  const version = (parsed.stateVersion as number) || 1;

  // v1 → v2: add routineTemplates to state
  if (version < 2) {
    return {
      ...parsed as Partial<AppState>,
      stateVersion: CURRENT_VERSION,
      routineTemplates: [...DEFAULT_ROUTINE_TEMPLATES],
    };
  }

  return parsed as Partial<AppState>;
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;

    const parsed = JSON.parse(raw);
    const migrated = migrateState(parsed);

    // Always preserve the user's existing tasks and progress
    return {
      ...DEFAULT_STATE,
      ...migrated,
      stateVersion: CURRENT_VERSION,
      tasks: (migrated.tasks || []).map(t => migrateTask(t as Task)),
      projects: migrated.projects && (migrated.projects as unknown[]).length > 0
        ? migrated.projects
        : DEFAULT_STATE.projects,
      routineTemplates: (migrated.routineTemplates || DEFAULT_STATE.routineTemplates)
        .map(t => migrateRoutineTemplate(t as RoutineTemplate)),
      gamification: { ...DEFAULT_STATE.gamification, ...migrated.gamification },
      settings: { ...DEFAULT_STATE.settings, ...migrated.settings },
      selectedDate: migrated.selectedDate || getTodayISO(),
      mode: migrated.mode || 'focus',
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
