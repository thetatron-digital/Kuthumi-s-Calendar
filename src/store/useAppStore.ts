// ============================================================
// Main Application Store (React Context + useReducer)
// ============================================================

import { createContext, useContext } from 'react';
import type { AppState, Task, Project, ProjectStatus, ParsedQuickAdd } from '../types';
import { autoScheduleAll } from '../engine/autoScheduler';
import { awardTaskPoints, recordWorkout, updateWeeklyGoals, areWeeklyGoalsMet } from '../engine/gamification';
import { v4 as uuidv4 } from 'uuid';

// --- Actions ---
export type AppAction =
  | { type: 'ADD_TASK'; payload: ParsedQuickAdd }
  | { type: 'COMPLETE_TASK'; payload: { taskId: string } }
  | { type: 'UNCOMPLETE_TASK'; payload: { taskId: string } }
  | { type: 'DELETE_TASK'; payload: { taskId: string } }
  | { type: 'EDIT_TASK'; payload: { taskId: string; updates: Partial<Task> } }
  | { type: 'MOVE_TO_BACKLOG'; payload: { taskId: string } }
  | { type: 'MOVE_FROM_BACKLOG'; payload: { taskId: string } }
  | { type: 'ADD_PROJECT'; payload: { name: string; description?: string; color: string } }
  | { type: 'UPDATE_PROJECT_STATUS'; payload: { projectId: string; status: ProjectStatus } }
  | { type: 'DELETE_PROJECT'; payload: { projectId: string } }
  | { type: 'RECORD_WORKOUT'; payload: { date: string } }
  | { type: 'RESCHEDULE_ALL' }
  | { type: 'RESET_WEEKLY' }
  | { type: 'SET_STATE'; payload: AppState };

// --- Reducer ---
export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'ADD_TASK': {
      const parsed = action.payload;
      const newTask: Task = {
        id: uuidv4(),
        title: parsed.title,
        category: parsed.category,
        workType: parsed.workType,
        priority: parsed.priority,
        deadline: parsed.deadline,
        projectId: parsed.projectId,
        completed: false,
        createdAt: new Date().toISOString(),
        isBacklog: parsed.isBacklog,
        isPhoneTask: parsed.isPhoneTask,
      };
      const tasks = autoScheduleAll([...state.tasks, newTask]);
      return { ...state, tasks };
    }

    case 'COMPLETE_TASK': {
      const today = new Date().toISOString().split('T')[0];
      let gamification = state.gamification;
      const task = state.tasks.find(t => t.id === action.payload.taskId);

      if (task) {
        gamification = awardTaskPoints(gamification, task, today);
      }

      const tasks = state.tasks.map(t =>
        t.id === action.payload.taskId
          ? { ...t, completed: true, completedAt: new Date().toISOString() }
          : t
      );

      // Update weekly goals
      const weeklyGoals = updateWeeklyGoals(state.weeklyGoals, gamification);
      if (areWeeklyGoalsMet(weeklyGoals) && !gamification.weeklyGoalMet) {
        gamification = {
          ...gamification,
          weeklyGoalMet: true,
          totalPoints: gamification.totalPoints + 50,
          pointsHistory: [
            ...gamification.pointsHistory,
            { date: today, points: 50, reason: 'All weekly goals met!', multiplier: 1 },
          ],
        };
      }

      // Check if project should move to on_hold
      const projects = autoUpdateProjectStatuses(tasks, state.projects);

      return { ...state, tasks, gamification, weeklyGoals, projects };
    }

    case 'UNCOMPLETE_TASK': {
      const tasks = autoScheduleAll(
        state.tasks.map(t =>
          t.id === action.payload.taskId
            ? { ...t, completed: false, completedAt: undefined }
            : t
        )
      );
      return { ...state, tasks };
    }

    case 'DELETE_TASK': {
      const tasks = state.tasks.filter(t => t.id !== action.payload.taskId);
      const projects = autoUpdateProjectStatuses(tasks, state.projects);
      return { ...state, tasks, projects };
    }

    case 'EDIT_TASK': {
      const tasks = autoScheduleAll(
        state.tasks.map(t =>
          t.id === action.payload.taskId
            ? { ...t, ...action.payload.updates }
            : t
        )
      );
      return { ...state, tasks };
    }

    case 'MOVE_TO_BACKLOG': {
      const tasks = state.tasks.map(t =>
        t.id === action.payload.taskId
          ? { ...t, isBacklog: true, assignedDay: undefined, assignedTimeBlock: undefined }
          : t
      );
      return { ...state, tasks };
    }

    case 'MOVE_FROM_BACKLOG': {
      const tasks = autoScheduleAll(
        state.tasks.map(t =>
          t.id === action.payload.taskId
            ? { ...t, isBacklog: false }
            : t
        )
      );
      return { ...state, tasks };
    }

    case 'ADD_PROJECT': {
      const project: Project = {
        id: uuidv4(),
        name: action.payload.name,
        description: action.payload.description,
        status: 'active',
        color: action.payload.color,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      return { ...state, projects: [...state.projects, project] };
    }

    case 'UPDATE_PROJECT_STATUS': {
      const projects = state.projects.map(p =>
        p.id === action.payload.projectId
          ? { ...p, status: action.payload.status, updatedAt: new Date().toISOString() }
          : p
      );
      return { ...state, projects };
    }

    case 'DELETE_PROJECT': {
      const projects = state.projects.filter(p => p.id !== action.payload.projectId);
      const tasks = state.tasks.map(t =>
        t.projectId === action.payload.projectId
          ? { ...t, projectId: undefined }
          : t
      );
      return { ...state, tasks, projects };
    }

    case 'RECORD_WORKOUT': {
      const gamification = recordWorkout(state.gamification, action.payload.date);
      return { ...state, gamification };
    }

    case 'RESCHEDULE_ALL': {
      const tasks = autoScheduleAll(state.tasks);
      return { ...state, tasks };
    }

    case 'RESET_WEEKLY': {
      return {
        ...state,
        gamification: {
          ...state.gamification,
          weeklyDeepWorkSessions: 0,
          weeklyClipEditingSessions: 0,
          weeklyGoalMet: false,
        },
        weeklyGoals: state.weeklyGoals.map(g => ({ ...g, current: 0 })),
      };
    }

    case 'SET_STATE':
      return action.payload;

    default:
      return state;
  }
}

// --- Auto-update project statuses ---
function autoUpdateProjectStatuses(tasks: Task[], projects: Project[]): Project[] {
  return projects.map(project => {
    if (project.status === 'archived') return project;

    const projectTasks = tasks.filter(t => t.projectId === project.id);
    const activeTasks = projectTasks.filter(t => !t.completed);

    if (projectTasks.length > 0 && activeTasks.length === 0 && project.status === 'active') {
      return { ...project, status: 'on_hold' as ProjectStatus, updatedAt: new Date().toISOString() };
    }

    if (activeTasks.length > 0 && project.status === 'on_hold') {
      return { ...project, status: 'active' as ProjectStatus, updatedAt: new Date().toISOString() };
    }

    return project;
  });
}

// --- Context ---
export interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
}

export const AppContext = createContext<AppContextType | null>(null);

export function useAppStore(): AppContextType {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppStore must be used within AppProvider');
  return ctx;
}
