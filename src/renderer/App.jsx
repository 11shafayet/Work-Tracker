import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const emptyState = {
  isTracking: false,
  currentSession: null,
  today: {
    trackedSeconds: 0,
    activeSeconds: 0,
    idleSeconds: 0
  },
  topApplications: [],
  topSites: [],
  history: []
};

function formatDuration(totalSeconds) {
  const seconds = Math.max(0, Number(totalSeconds) || 0);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, '0')}m ${String(remainingSeconds).padStart(2, '0')}s`;
  }

  return `${minutes}m ${String(remainingSeconds).padStart(2, '0')}s`;
}

function formatSessionDuration(session) {
  if (!session) {
    return '0m 00s';
  }

  return formatDuration(session.active_seconds + session.idle_seconds);
}

function StatCard({ label, value, tone }) {
  return (
    <section className={`stat-card ${tone || ''}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </section>
  );
}

function TopApplications({ apps }) {
  const maxSeconds = Math.max(...apps.map((app) => app.durationSeconds), 1);

  return (
    <section className="panel">
      <div className="panel-heading">
        <h2>Top Applications</h2>
        <span>Today</span>
      </div>
      <div className="app-list">
        {apps.length === 0 ? (
          <p className="empty">No active application time recorded yet.</p>
        ) : apps.map((app) => (
          <div className="app-row" key={app.appName}>
            <div className="app-row-top">
              <span>{app.appName}</span>
              <strong>{formatDuration(app.durationSeconds)}</strong>
            </div>
            <div className="bar-track">
              <div
                className="bar-fill"
                style={{ width: `${Math.max(4, (app.durationSeconds / maxSeconds) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function TopSites({ sites }) {
  const maxSeconds = Math.max(...sites.map((site) => site.durationSeconds), 1);

  return (
    <section className="panel">
      <div className="panel-heading">
        <h2>Browser Sites</h2>
        <span>Today</span>
      </div>
      <div className="app-list">
        {sites.length === 0 ? (
          <p className="empty">No browser site time recorded yet.</p>
        ) : sites.map((site) => (
          <div className="app-row" key={site.siteName}>
            <div className="app-row-top">
              <span>{site.siteName}</span>
              <strong>{formatDuration(site.durationSeconds)}</strong>
            </div>
            <div className="bar-track">
              <div
                className="site-bar-fill"
                style={{ width: `${Math.max(4, (site.durationSeconds / maxSeconds) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function HistoryChart({ history }) {
  const maxSeconds = Math.max(...history.map((day) => day.activeSeconds + day.idleSeconds), 1);

  return (
    <section className="panel history-panel">
      <div className="panel-heading">
        <h2>Last 30 Days</h2>
        <span>90-day retention</span>
      </div>
      <div className="history-chart">
        {history.map((day) => {
          const total = day.activeSeconds + day.idleSeconds;
          const height = Math.max(4, (total / maxSeconds) * 100);
          const date = new Date(`${day.day}T00:00:00`);
          return (
            <div className="history-day" key={day.day} title={`${day.day}: ${formatDuration(total)}`}>
              <div className="history-stack">
                <div className="history-bar" style={{ height: `${height}%` }} />
              </div>
              <span>{date.getDate()}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function App() {
  const [state, setState] = useState(emptyState);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    window.workTracker.getState().then((nextState) => {
      if (mounted) {
        setState(nextState);
        setLoading(false);
      }
    });

    const unsubscribe = window.workTracker.onStateChanged((nextState) => {
      setState(nextState);
      setLoading(false);
    });

    const refreshInterval = setInterval(() => {
      window.workTracker.getState().then((nextState) => {
        if (mounted) {
          setState(nextState);
          setLoading(false);
        }
      });
    }, 1000);

    return () => {
      mounted = false;
      clearInterval(refreshInterval);
      unsubscribe();
    };
  }, []);

  const productivity = useMemo(() => {
    const active = state.today.activeSeconds;
    const total = state.today.trackedSeconds;
    return total > 0 ? Math.round((active / total) * 100) : 0;
  }, [state.today.activeSeconds, state.today.trackedSeconds]);

  async function toggleTracking() {
    const nextState = state.isTracking
      ? await window.workTracker.stop()
      : await window.workTracker.start();
    setState(nextState);
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <h1>WorkTracker</h1>
          <p>{state.isTracking ? 'Tracking in progress' : 'Tracking paused'}</p>
        </div>
        <button className={state.isTracking ? 'stop-button' : 'start-button'} onClick={toggleTracking}>
          <span className="button-dot" />
          {state.isTracking ? 'Stop' : 'Start'}
        </button>
      </header>

      <section className="status-strip">
        <StatCard label="Current Session" value={loading ? 'Loading' : formatSessionDuration(state.currentSession)} />
        <StatCard label="Today Tracked" value={formatDuration(state.today.trackedSeconds)} />
        <StatCard label="Active Time" value={formatDuration(state.today.activeSeconds)} tone="active" />
        <StatCard label="Idle Time" value={formatDuration(state.today.idleSeconds)} tone="idle" />
        <StatCard label="Active Share" value={`${productivity}%`} />
      </section>

      <div className="content-grid">
        <TopApplications apps={state.topApplications} />
        <TopSites sites={state.topSites || []} />
      </div>

      <div className="content-grid single-side">
        <section className="panel session-panel">
          <div className="panel-heading">
            <h2>Session</h2>
            <span>{state.isTracking ? 'Running' : 'Stopped'}</span>
          </div>
          <div className="session-meter">
            <div className="meter-ring">
              <span>{productivity}%</span>
            </div>
            <div>
              <h3>Active work excludes idle time</h3>
              <p>
                Idle time starts after {state.idleThresholdSeconds || 60} seconds of no mouse or keyboard activity.
              </p>
            </div>
          </div>
        </section>
      </div>

      <HistoryChart history={state.history} />
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
