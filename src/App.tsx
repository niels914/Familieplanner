import { useCallback, useEffect, useState } from 'react';
import { api, setUnauthorizedHandler } from './lib/api';
import { StoreProvider, useStore } from './lib/store';
import { todayInNl } from '../shared/dates';
import { TodayView } from './views/TodayView';
import { CalendarView } from './views/CalendarView';
import { SittersView } from './views/SittersView';
import { ContactsView } from './views/ContactsView';
import { FoodView } from './views/FoodView';
import { PickupView } from './views/PickupView';
import { PackingView } from './views/PackingView';
import { SettingsView } from './views/SettingsView';
import { QuickAdd } from './components/QuickAdd';

type View =
  | 'vandaag'
  | 'agenda'
  | 'oppas'
  | 'contacten'
  | 'meer'
  | 'eten'
  | 'brengen'
  | 'paklijst'
  | 'instellingen';

/** Schermen die onder het tabblad 'Meer' vallen. */
const MORE_VIEWS: View[] = ['eten', 'brengen', 'paklijst', 'instellingen'];

const TABS: Array<{ id: View; label: string; icon: string }> = [
  { id: 'vandaag', label: 'Vandaag', icon: '☀️' },
  { id: 'agenda', label: 'Agenda', icon: '📅' },
  { id: 'oppas', label: 'Oppas', icon: '🧑‍🍼' },
  { id: 'contacten', label: 'Contacten', icon: '👪' },
  { id: 'meer', label: 'Meer', icon: '⋯' },
];

const ALL_LINKS: Array<{ id: View; label: string; icon: string }> = [
  ...TABS.slice(0, 4),
  { id: 'eten', label: 'Eten', icon: '🍽' },
  { id: 'brengen', label: 'Breng & haal', icon: '🚗' },
  { id: 'paklijst', label: 'Paklijst', icon: '🧳' },
  { id: 'instellingen', label: 'Instellingen', icon: '⚙️' },
];

export default function App() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    void api
      .get<{ authenticated: boolean }>('session')
      .then((r) => setAuthenticated(r.authenticated))
      .catch(() => setAuthenticated(false));
  }, []);

  const onSessionLost = useCallback(() => setAuthenticated(false), []);
  useEffect(() => setUnauthorizedHandler(onSessionLost), [onSessionLost]);

  if (authenticated === null) {
    return (
      <div className="login">
        <div className="spinner" />
      </div>
    );
  }

  if (!authenticated) return <Login onSuccess={() => setAuthenticated(true)} />;

  return (
    <StoreProvider onSessionLost={onSessionLost}>
      <Shell onLogout={() => setAuthenticated(false)} />
    </StoreProvider>
  );
}

function Shell({ onLogout }: { onLogout: () => void }) {
  const { loading, error, notice, setNotice } = useStore();
  const [view, setView] = useState<View>('vandaag');
  const [selected, setSelected] = useState(todayInNl());
  const [quickAdd, setQuickAdd] = useState(false);

  // Een melding kan een datum meegeven: /?date=2026-09-03
  useEffect(() => {
    const param = new URLSearchParams(window.location.search).get('date');
    if (param && /^\d{4}-\d{2}-\d{2}$/.test(param)) {
      setSelected(param);
      setView('agenda');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 3800);
    return () => clearTimeout(t);
  }, [notice, setNotice]);

  const openDate = (date: string) => {
    setSelected(date);
    setView('agenda');
  };

  return (
    <div className="app">
      <nav className="sidebar">
        <div className="sidebar__brand">
          <span>🏡</span> Familieplanner
        </div>
        {ALL_LINKS.map((link) => (
          <button
            key={link.id}
            className="navlink"
            aria-current={view === link.id}
            onClick={() => setView(link.id)}
          >
            <span>{link.icon}</span>
            {link.label}
          </button>
        ))}
      </nav>

      <main className="main">
        {loading ? (
          <div className="page center">
            <div className="spinner" style={{ margin: '60px auto' }} />
          </div>
        ) : (
          <>
            {view === 'vandaag' && <TodayView onOpenDate={openDate} />}
            {view === 'agenda' && <CalendarView selected={selected} onSelect={setSelected} />}
            {view === 'oppas' && <SittersView />}
            {view === 'contacten' && <ContactsView />}
            {view === 'eten' && <FoodView />}
            {view === 'brengen' && <PickupView />}
            {view === 'paklijst' && <PackingView />}
            {view === 'instellingen' && <SettingsView onLogout={onLogout} />}
            {view === 'meer' && <MoreView onNavigate={setView} />}
          </>
        )}
      </main>

      <button className="fab" onClick={() => setQuickAdd(true)} aria-label="Snel toevoegen">
        +
      </button>

      <nav className="tabbar">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className="tabbar__item"
            aria-current={
              view === tab.id ||
              (tab.id === 'meer' && MORE_VIEWS.includes(view))
            }
            onClick={() => setView(tab.id)}
          >
            <span className="tabbar__icon">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </nav>

      {quickAdd && <QuickAdd date={selected} onClose={() => setQuickAdd(false)} />}
      {(notice || error) && (
        <div className={`toast ${error && !notice ? 'toast--error' : ''}`}>{notice ?? error}</div>
      )}
    </div>
  );
}

function MoreView({ onNavigate }: { onNavigate: (view: View) => void }) {
  const items = ALL_LINKS.filter((l) => MORE_VIEWS.includes(l.id));
  return (
    <div className="page">
      <div className="page__head">
        <h1>Meer</h1>
      </div>
      <div className="list">
        {items.map((item) => (
          <button key={item.id} className="tile" onClick={() => onNavigate(item.id)}>
            <div className="avatar">{item.icon}</div>
            <span className="grow">
              <strong>{item.label}</strong>
            </span>
            <span className="muted">›</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function Login({ onSuccess }: { onSuccess: () => void }) {
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      await api.post('login', { password });
      onSuccess();
    } catch (err) {
      setMessage((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login">
      <form className="card login__card" onSubmit={submit}>
        <div className="login__logo">🏡</div>
        <h1 className="center" style={{ marginBottom: 4 }}>
          Familieplanner
        </h1>
        <p className="center muted small" style={{ marginBottom: 18 }}>
          Log in met het gezinswachtwoord.
        </p>
        <div className="stack stack--sm">
          <input
            className="input"
            type="password"
            autoFocus
            autoComplete="current-password"
            placeholder="Wachtwoord"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button className="btn btn--primary btn--block" type="submit" disabled={busy || !password}>
            {busy ? 'Bezig…' : 'Inloggen'}
          </button>
          {message && (
            <div className="banner" role="alert">
              {message}
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
