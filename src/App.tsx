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
import { SettingsView } from './views/SettingsView';
import { QuickAdd } from './components/QuickAdd';
import { DaySkeleton } from './components/Skeleton';
import { InstallHint } from './components/InstallHint';
import { Icon, type IconName } from './components/Icon';

type View = 'vandaag' | 'agenda' | 'oppas' | 'contacten' | 'meer' | 'eten' | 'brengen' | 'instellingen';

const TABS: Array<{ id: View; label: string; icon: IconName }> = [
  { id: 'vandaag', label: 'Vandaag', icon: 'vandaag' },
  { id: 'agenda', label: 'Agenda', icon: 'kalender' },
  { id: 'oppas', label: 'Oppas', icon: 'oppas' },
  { id: 'contacten', label: 'Contacten', icon: 'contacten' },
  { id: 'meer', label: 'Meer', icon: 'meer' },
];

const ALL_LINKS: Array<{ id: View; label: string; icon: IconName }> = [
  ...TABS.slice(0, 4),
  { id: 'eten', label: 'Eten', icon: 'eten' },
  { id: 'brengen', label: 'Breng & haal', icon: 'auto' },
  { id: 'instellingen', label: 'Instellingen', icon: 'instellingen' },
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
          <Icon name="huis" size={20} /> Familieplanner
        </div>
        {ALL_LINKS.map((link) => (
          <button
            key={link.id}
            className="navlink"
            aria-current={view === link.id}
            onClick={() => setView(link.id)}
          >
            <Icon name={link.icon} size={19} />
            {link.label}
          </button>
        ))}
      </nav>

      <main className="main">
        <div className="installhint-wrap">
          <InstallHint />
        </div>
        {loading ? (
          <DaySkeleton />
        ) : (
          <>
            {view === 'vandaag' && <TodayView onOpenDate={openDate} />}
            {view === 'agenda' && <CalendarView selected={selected} onSelect={setSelected} />}
            {view === 'oppas' && <SittersView />}
            {view === 'contacten' && <ContactsView />}
            {view === 'eten' && <FoodView />}
            {view === 'brengen' && <PickupView />}
            {view === 'instellingen' && <SettingsView onLogout={onLogout} />}
            {view === 'meer' && <MoreView onNavigate={setView} />}
          </>
        )}
      </main>

      <button className="fab" onClick={() => setQuickAdd(true)} aria-label="Snel toevoegen">
        <Icon name="plus" size={26} />
      </button>

      <nav className="tabbar">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className="tabbar__item"
            aria-current={
              view === tab.id ||
              (tab.id === 'meer' && ['eten', 'brengen', 'instellingen'].includes(view))
            }
            onClick={() => setView(tab.id)}
          >
            <span className="tabbar__icon">
              <Icon name={tab.icon} size={22} />
            </span>
            {tab.label}
          </button>
        ))}
      </nav>

      {quickAdd && <QuickAdd date={selected} onClose={() => setQuickAdd(false)} />}
      {/* Meldingen worden voorgelezen; een fout onderbreekt, een bevestiging niet. */}
      {(notice || error) && (
        <div
          className={`toast ${error && !notice ? 'toast--error' : ''}`}
          role={error && !notice ? 'alert' : 'status'}
          aria-live={error && !notice ? 'assertive' : 'polite'}
        >
          {notice ?? error}
        </div>
      )}
    </div>
  );
}

function MoreView({ onNavigate }: { onNavigate: (view: View) => void }) {
  const items = ALL_LINKS.filter((l) => ['eten', 'brengen', 'instellingen'].includes(l.id));
  return (
    <div className="page">
      <div className="page__head">
        <h1>Meer</h1>
      </div>
      <div className="list">
        {items.map((item) => (
          <button key={item.id} className="tile" onClick={() => onNavigate(item.id)}>
            <div className="avatar">
              <Icon name={item.icon} size={20} />
            </div>
            <span className="grow">
              <strong>{item.label}</strong>
            </span>
            <Icon name="chevron-rechts" size={18} className="muted" />
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
      <div className="login__stack">
      <InstallHint voorInloggen />
      <form className="card login__card" onSubmit={submit}>
        <div className="login__logo">
          <Icon name="huis" size={44} />
        </div>
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
    </div>
  );
}
