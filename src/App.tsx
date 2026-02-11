// ============================================================
// Kuthumi's Calendar - Main App
// Calendar-first layout with Focus/Edit mode switching
// ============================================================

import { useReducer, useEffect, useState, useCallback } from 'react';
import { AppContext, appReducer } from './store/useAppStore';
import { loadState, saveState } from './store/storage';
import CalendarGrid from './components/CalendarGrid';
import FocusChecklist from './components/FocusChecklist';
import EditPanel from './components/EditPanel';
import EnergyIndicator from './components/EnergyIndicator';
import { getDayMeta } from './engine/schedule';
import { getDayOfWeekFromDate } from './utils/dateUtils';
import type { AppMode } from './types';
import './App.css';

export default function App() {
  const [state, dispatch] = useReducer(appReducer, null, loadState);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', state.settings.theme);
  }, [state.settings.theme]);

  // Auto-save on every state change
  useEffect(() => {
    saveState(state);
  }, [state]);

  // Reschedule on mount
  useEffect(() => {
    dispatch({ type: 'RESCHEDULE_ALL' });
  }, []);

  // Manual save with visual feedback
  const handleSave = useCallback(() => {
    setSaveStatus('saving');
    saveState(state);
    setTimeout(() => {
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }, 300);
  }, [state]);

  const handleToggleTheme = () => {
    dispatch({ type: 'TOGGLE_THEME' });
  };

  const handleSetMode = (mode: AppMode) => {
    dispatch({ type: 'SET_MODE', payload: { mode } });
  };

  // Get current day info for the top bar
  const selectedDate = new Date(state.selectedDate + 'T12:00:00');
  const dayOfWeek = getDayOfWeekFromDate(selectedDate);
  const meta = getDayMeta(dayOfWeek);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      <div className="app">
        {/* Top Bar */}
        <nav className="app-topbar">
          <div className="topbar-left">
            <h1 className="app-brand">Kuthumi's Calendar</h1>
            <EnergyIndicator level={meta.energyLevel} showLabel={false} />
          </div>

          <div className="topbar-center">
            {/* Mode Toggle */}
            <div className="mode-toggle">
              <button
                className={`mode-btn ${state.mode === 'focus' ? 'active' : ''}`}
                onClick={() => handleSetMode('focus')}
              >
                Focus
              </button>
              <button
                className={`mode-btn ${state.mode === 'edit' ? 'active' : ''}`}
                onClick={() => handleSetMode('edit')}
              >
                Edit
              </button>
            </div>
          </div>

          <div className="topbar-right">
            <button
              className={`btn-save ${saveStatus}`}
              onClick={handleSave}
              disabled={saveStatus === 'saving'}
            >
              {saveStatus === 'saving' ? '...' : saveStatus === 'saved' ? '\u2713' : 'Save'}
            </button>
            <button
              className="btn-theme"
              onClick={handleToggleTheme}
              title={`Switch to ${state.settings.theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {state.settings.theme === 'dark' ? '\u2600' : '\u263D'}
            </button>
          </div>
        </nav>

        {/* Main Layout: Calendar + Task Panel */}
        <main className="app-layout">
          {/* Calendar Panel */}
          <aside className="calendar-panel">
            <CalendarGrid />

            {/* Day Info Card */}
            <div className="day-info-card">
              <div className="day-info-route">
                <span className="day-info-label">Route</span>
                <span className="day-info-value">{meta.location}</span>
              </div>
              {meta.departTime && (
                <div className="day-info-times">
                  <span>Depart {meta.departTime}</span>
                  {meta.arriveTime && <span>Arrive {meta.arriveTime}</span>}
                </div>
              )}
              {meta.notes && (
                <p className="day-info-notes">{meta.notes}</p>
              )}
            </div>

            {/* Stats mini card */}
            <div className="stats-mini">
              <div className="stat-mini-item">
                <span className="stat-mini-value">{state.gamification.totalPoints}</span>
                <span className="stat-mini-label">pts</span>
              </div>
              <div className="stat-mini-item">
                <span className="stat-mini-value">{state.gamification.workoutStreak}</span>
                <span className="stat-mini-label">streak</span>
              </div>
              <div className="stat-mini-item">
                <span className="stat-mini-value">
                  {state.tasks.filter(t => !t.completed && !t.isBacklog).length}
                </span>
                <span className="stat-mini-label">active</span>
              </div>
            </div>
          </aside>

          {/* Task Panel */}
          <section className="task-panel">
            {state.mode === 'focus' ? <FocusChecklist /> : <EditPanel />}
          </section>
        </main>
      </div>
    </AppContext.Provider>
  );
}
