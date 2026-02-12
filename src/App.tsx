// ============================================================
// Kuthumi's Calendar - Main App
// Calendar + Timeline views, inline day panel
// ============================================================

import { useReducer, useEffect, useState, useCallback } from 'react';
import { AppContext, appReducer } from './store/useAppStore';
import { loadState, saveState } from './store/storage';
import CalendarGrid from './components/CalendarGrid';
import DayPanel from './components/DayModal';
import EditPanel from './components/EditPanel';
import TimelineView from './components/TimelineView';
import type { AppMode, ActiveView } from './types';
import './App.css';

export default function App() {
  const [state, dispatch] = useReducer(appReducer, null, loadState);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [panelDate, setPanelDate] = useState<string | null>(null);

  const activeView = state.settings.activeView;
  const todayISO = new Date().toISOString().split('T')[0];

  // Theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', state.settings.theme);
  }, [state.settings.theme]);

  // Auto-save
  useEffect(() => {
    saveState(state);
  }, [state]);

  // Manual save
  const handleSave = useCallback(() => {
    setSaveStatus('saving');
    saveState(state);
    setTimeout(() => {
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }, 300);
  }, [state]);

  const handleSetMode = (mode: AppMode) => {
    dispatch({ type: 'SET_MODE', payload: { mode } });
  };

  const handleDayClick = (iso: string) => {
    setPanelDate(prev => prev === iso ? null : iso);
  };

  const handleViewSwitch = (view: ActiveView) => {
    dispatch({ type: 'SET_ACTIVE_VIEW', payload: { view } });
    // When switching to timeline, show today by default
    if (view === 'timeline') {
      setPanelDate(null);
    }
  };

  // Stats
  const activeTasks = state.tasks.filter(t => !t.completed && !t.isBacklog);
  const todayTasks = state.tasks.filter(t => t.scheduledDate === todayISO && !t.isBacklog);
  const todayDone = todayTasks.filter(t => t.completed).length;

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      <div className="app">
        {/* Top Bar */}
        <header className="topbar">
          <h1 className="topbar-brand">Kuthumi's Calendar</h1>

          <div className="topbar-mode">
            {/* View toggle: Calendar / Timeline */}
            <button
              className={`mode-btn ${activeView === 'calendar' ? 'on' : ''}`}
              onClick={() => handleViewSwitch('calendar')}
            >
              Month
            </button>
            <button
              className={`mode-btn ${activeView === 'timeline' ? 'on' : ''}`}
              onClick={() => handleViewSwitch('timeline')}
            >
              Today
            </button>
            <span className="mode-divider" />
            <button
              className={`mode-btn ${state.mode === 'focus' ? 'on' : ''}`}
              onClick={() => handleSetMode('focus')}
            >
              Focus
            </button>
            <button
              className={`mode-btn ${state.mode === 'edit' ? 'on' : ''}`}
              onClick={() => handleSetMode('edit')}
            >
              Edit
            </button>
          </div>

          <div className="topbar-actions">
            <button
              className={`topbar-save ${saveStatus}`}
              onClick={handleSave}
              disabled={saveStatus === 'saving'}
            >
              {saveStatus === 'saving' ? '...' : saveStatus === 'saved' ? '\u2713' : 'Save'}
            </button>
            <button
              className="topbar-theme"
              onClick={() => dispatch({ type: 'TOGGLE_THEME' })}
              title={`Switch to ${state.settings.theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {state.settings.theme === 'dark' ? '\u2600' : '\u263D'}
            </button>
          </div>
        </header>

        <main className="main">
          {/* Calendar View */}
          {activeView === 'calendar' && (
            <>
              <CalendarGrid onDayClick={handleDayClick} />

              {/* Focus mode: Day Panel slides down inline below calendar */}
              {state.mode === 'focus' && panelDate && (
                <DayPanel dateISO={panelDate} onClose={() => setPanelDate(null)} />
              )}

              {/* Edit mode: Planning panel */}
              {state.mode === 'edit' && <EditPanel />}
            </>
          )}

          {/* Timeline View */}
          {activeView === 'timeline' && (
            <TimelineView dateISO={state.selectedDate || todayISO} />
          )}

          {/* Stats bar */}
          <div className="stats-row">
            <div className="stat">
              <span className="stat-val">{state.gamification.totalPoints}</span>
              <span className="stat-lbl">points</span>
            </div>
            <div className="stat">
              <span className="stat-val">{state.gamification.workoutStreak}</span>
              <span className="stat-lbl">streak</span>
            </div>
            <div className="stat">
              <span className="stat-val">{activeTasks.length}</span>
              <span className="stat-lbl">active</span>
            </div>
            <div className="stat">
              <span className="stat-val">{todayDone}/{todayTasks.length}</span>
              <span className="stat-lbl">today</span>
            </div>
          </div>
        </main>
      </div>
    </AppContext.Provider>
  );
}
