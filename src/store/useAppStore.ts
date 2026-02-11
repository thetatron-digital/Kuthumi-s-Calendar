// ============================================================
// Main Application Store (React Context + useReducer)
// ============================================================

import { createContext, useContext } from 'react';
import type { AppState, Task, Project, ProjectStatus, AppMode, TaskSection, ParsedQuickAdd, RoutineTemplate } from '../types';
import { autoScheduleAll } from '../engine/autoScheduler';
import { awardTaskPoints, recordWorkout, updateWeeklyGoals, areWeeklyGoalsMet } from '../engine/gamification';
import { ensureRoutineForWeek } from '../engine/routine';
import { v4 as uuidv4 } from 'uuid';

// --- Actions ---
export type AppAction =
  | { type: 'ADD_TASK'; payload: ParsedQuickAdd }
  | { type: 'ADD_TASK_SIMPLE'; payload: { title: string; section?: TaskSection; scheduledDate?: string; targetMonth?: string } }
  | { type: 'COMPLETE_TASK'; payload: { taskId: string } }
  | { type: 'UNCOMPLETE_TASK'; payload: { taskId: string } }
  | { type: 'DELETE_TASK'; payload: { taskId: string } }
  | { type: 'EDIT_TASK'; payload: { taskId: string; updates: Partial<Task> } }
  | { type: 'MOVE_TO_BACKLOG'; payload: { taskId: string } }
  | { type: 'MOVE_FROM_BACKLOG'; payload: { taskId: string } }
  | { type: 'ADD_SUBTASK'; payload: { taskId: string; title: string } }
  | { type: 'TOGGLE_SUBTASK'; payload: { taskId: string; subtaskId: string } }
  | { type: 'DELETE_SUBTASK'; payload: { taskId: string; subtaskId: string } }
  | { type: 'SELECT_DATE'; payload: { date: string } }
  | { type: 'SET_MODE'; payload: { mode: AppMode } }
  | { type: 'GENERATE_ROUTINE'; payload: { weekSunday: Date } }
  | { type: 'ADD_PROJECT'; payload: { name: string; description?: string; color: string } }
  | { type: 'UPDATE_PROJECT_STATUS'; payload: { projectId: string; status: ProjectStatus } }
  | { type: 'DELETE_PROJECT'; payload: { projectId: string } }
  | { type: 'RECORD_WORKOUT'; payload: { date: string } }
  | { type: 'REORDER_TASKS'; payload: { dateISO: string; taskIds: string[] } }
  | { type: 'REORDER_SUBTASKS'; payload: { taskId: string; subtaskIds: string[] } }
  | { type: 'SET_TARGET_MONTH'; payload: { taskId: string; month: string | undefined } }
  | { type: 'SCHEDULE_TASK'; payload: { taskId: string; dateISO: string } }
  | { type: 'ADD_ROUTINE_TEMPLATE'; payload: RoutineTemplate }
  | { type: 'UPDATE_ROUTINE_TEMPLATE'; payload: { templateId: string; updates: Partial<RoutineTemplate> } }
  | { type: 'DELETE_ROUTINE_TEMPLATE'; payload: { templateId: string } }
  | { type: 'RESCHEDULE_ALL' }
  | { type: 'RESET_WEEKLY' }
  | { type: 'TOGGLE_THEME' }
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
        subtasks: [],
        scheduledDate: state.selectedDate,
      };
      const tasks = autoScheduleAll([...state.tasks, newTask]);
      return { ...state, tasks };
    }

    case 'ADD_TASK_SIMPLE': {
      const { title, section, scheduledDate, targetMonth } = action.payload;
      const newTask: Task = {
        id: uuidv4(),
        title,
        category: 'other',
        workType: 'light',
        priority: 'medium',
        deadline: { type: 'none' },
        completed: false,
        createdAt: new Date().toISOString(),
        isBacklog: !!targetMonth,
        isPhoneTask: false,
        subtasks: [],
        section: section || 'today',
        scheduledDate: targetMonth ? undefined : (scheduledDate || state.selectedDate),
        targetMonth,
      };
      return { ...state, tasks: [...state.tasks, newTask] };
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

    case 'ADD_SUBTASK': {
      const tasks = state.tasks.map(t =>
        t.id === action.payload.taskId
          ? {
              ...t,
              subtasks: [
                ...t.subtasks,
                { id: uuidv4(), title: action.payload.title, completed: false },
              ],
            }
          : t
      );
      return { ...state, tasks };
    }

    case 'TOGGLE_SUBTASK': {
      const tasks = state.tasks.map(t =>
        t.id === action.payload.taskId
          ? {
              ...t,
              subtasks: t.subtasks.map(st =>
                st.id === action.payload.subtaskId
                  ? {
                      ...st,
                      completed: !st.completed,
                      completedAt: !st.completed ? new Date().toISOString() : undefined,
                    }
                  : st
              ),
            }
          : t
      );
      return { ...state, tasks };
    }

    case 'DELETE_SUBTASK': {
      const tasks = state.tasks.map(t =>
        t.id === action.payload.taskId
          ? { ...t, subtasks: t.subtasks.filter(st => st.id !== action.payload.subtaskId) }
          : t
      );
      return { ...state, tasks };
    }

    case 'SELECT_DATE':
      return { ...state, selectedDate: action.payload.date };

    case 'SET_MODE':
      return { ...state, mode: action.payload.mode };

    case 'GENERATE_ROUTINE': {
      const newRoutineTasks = ensureRoutineForWeek(action.payload.weekSunday, state.tasks, state.routineTemplates);
      if (newRoutineTasks.length === 0) return state;
      return { ...state, tasks: [...state.tasks, ...newRoutineTasks] };
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
        t.projectId === action.payload.projectId ? { ...t, projectId: undefined } : t
      );
      return { ...state, tasks, projects };
    }

    case 'RECORD_WORKOUT': {
      const gamification = recordWorkout(state.gamification, action.payload.date);
      return { ...state, gamification };
    }

    case 'REORDER_TASKS': {
      const { dateISO, taskIds } = action.payload;
      const dateTasks = state.tasks.filter(t => t.scheduledDate === dateISO && !t.isBacklog);
      const otherTasks = state.tasks.filter(t => !(t.scheduledDate === dateISO && !t.isBacklog));
      const reordered = taskIds.map(id => dateTasks.find(t => t.id === id)).filter(Boolean) as Task[];
      // Include any tasks that weren't in the reorder list
      const remaining = dateTasks.filter(t => !taskIds.includes(t.id));
      return { ...state, tasks: [...otherTasks, ...reordered, ...remaining] };
    }

    case 'REORDER_SUBTASKS': {
      const { taskId, subtaskIds } = action.payload;
      const tasks = state.tasks.map(t => {
        if (t.id !== taskId) return t;
        const reordered = subtaskIds.map(id => t.subtasks.find(s => s.id === id)).filter(Boolean) as typeof t.subtasks;
        const remaining = t.subtasks.filter(s => !subtaskIds.includes(s.id));
        return { ...t, subtasks: [...reordered, ...remaining] };
      });
      return { ...state, tasks };
    }

    case 'SET_TARGET_MONTH': {
      const tasks = state.tasks.map(t =>
        t.id === action.payload.taskId
          ? { ...t, targetMonth: action.payload.month }
          : t
      );
      return { ...state, tasks };
    }

    case 'SCHEDULE_TASK': {
      const tasks = state.tasks.map(t =>
        t.id === action.payload.taskId
          ? { ...t, scheduledDate: action.payload.dateISO, isBacklog: false }
          : t
      );
      return { ...state, tasks };
    }

    case 'ADD_ROUTINE_TEMPLATE': {
      return { ...state, routineTemplates: [...state.routineTemplates, action.payload] };
    }

    case 'UPDATE_ROUTINE_TEMPLATE': {
      const { templateId, updates } = action.payload;
      const routineTemplates = state.routineTemplates.map(t =>
        t.id === templateId ? { ...t, ...updates } : t
      );
      return { ...state, routineTemplates };
    }

    case 'DELETE_ROUTINE_TEMPLATE': {
      const routineTemplates = state.routineTemplates.filter(t => t.id !== action.payload.templateId);
      return { ...state, routineTemplates };
    }

    case 'RESCHEDULE_ALL': {
      const tasks = autoScheduleAll(state.tasks);
      return { ...state, tasks };
    }

    case 'RESET_WEEKLY':
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

    case 'TOGGLE_THEME': {
      const newTheme = state.settings.theme === 'dark' ? 'light' : 'dark';
      return { ...state, settings: { ...state.settings, theme: newTheme } };
    }

    case 'SET_STATE':
      return action.payload;

    default:
      return state;
  }
}

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
