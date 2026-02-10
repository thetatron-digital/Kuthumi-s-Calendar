// ============================================================
// Kuthumi's Calendar - Main App
// ============================================================

import { useReducer, useEffect, useState, useCallback } from 'react';
import { AppContext, appReducer } from './store/useAppStore';
import { loadState, saveState } from './store/storage';
import QuickAdd from './components/QuickAdd';
import DailyBriefing from './views/DailyBriefing';
import WeeklyView from './views/WeeklyView';
import BacklogView from './views/BacklogView';
import ProjectsView from './views/ProjectsView';
import GamificationView from './views/GamificationView';
import './App.css';

type ViewType = 'daily' | 'weekly' | 'backlog' | 'projects' | 'stats';

const NAV_ITEMS: { key: ViewType; label: string }[] = [
  { key: 'daily', label: 'Today' },
  { key: 'weekly', label: 'Week' },
  { key: 'projects', label: 'Projects' },
  { key: 'backlog', label: 'Backlog' },
  { key: 'stats', label: 'Stats' },
];

export default function App() {
  const [state, dispatch] = useReducer(appReducer, null, loadState);
  const [activeView, setActiveView] = useState<ViewType>('daily');
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
    // Brief delay so the user sees the feedback
    setTimeout(() => {
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }, 300);
  }, [state]);

  const handleToggleTheme = () => {
    dispatch({ type: 'TOGGLE_THEME' });
  };

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      <div className="app">
        {/* Navigation */}
        <nav className="app-nav">
          <div className="nav-brand">
            <h2 className="brand-name">Kuthumi's Calendar</h2>
          </div>
          <div className="nav-items">
            {NAV_ITEMS.map(item => (
              <button
                key={item.key}
                className={`nav-item ${activeView === item.key ? 'active' : ''}`}
                onClick={() => setActiveView(item.key)}
              >
                <span className="nav-label">{item.label}</span>
              </button>
            ))}
          </div>
          <div className="nav-actions">
            <button
              className={`btn-save ${saveStatus}`}
              onClick={handleSave}
              disabled={saveStatus === 'saving'}
            >
              {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved!' : 'Save'}
            </button>
            <button
              className="btn-theme-toggle"
              onClick={handleToggleTheme}
              title={`Switch to ${state.settings.theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {state.settings.theme === 'dark' ? '\u2600' : '\u263D'}
            </button>
          </div>
        </nav>

        {/* Main Content */}
        <main className="app-main">
          {/* Quick Add - always visible */}
          <QuickAdd />

          {/* Active View */}
          <div className="view-container">
            {activeView === 'daily' && <DailyBriefing />}
            {activeView === 'weekly' && <WeeklyView />}
            {activeView === 'backlog' && <BacklogView />}
            {activeView === 'projects' && <ProjectsView />}
            {activeView === 'stats' && <GamificationView />}
          </div>
        </main>
      </div>
    </AppContext.Provider>
  );
}
