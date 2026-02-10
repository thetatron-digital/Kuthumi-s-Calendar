// ============================================================
// Kuthumi's Calendar - Main App
// ============================================================

import { useReducer, useEffect, useState } from 'react';
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

  // Persist state on every change
  useEffect(() => {
    saveState(state);
  }, [state]);

  // Reschedule on mount
  useEffect(() => {
    dispatch({ type: 'RESCHEDULE_ALL' });
  }, []);

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
