import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CalendarEvent } from '../shared/types';
import { api, setUnauthorizedHandler } from './lib/api';
import { clearCache } from './lib/cache';
import { StoreProvider, useData, useStore } from './lib/store';
import { NavContext, type Nav, type NewMode, type View } from './lib/nav';
import { useRegel } from './lib/useRegel';
import { todayInNl } from '../shared/dates';
import { TodayView } from './views/TodayView';
import { CalendarView } from './views/CalendarView';
import { RegelenView } from './views/RegelenView';
import { MensenView } from './views/MensenView';
import { GezinView } from './views/GezinView';
import { PickupView } from './views/PickupView';
import { SettingsView } from './views/SettingsView';
import { NewSheet } from './components/NewSheet';
import { EventForm } from './components/EventForm';
import { TaskForm } from './components/TaskForm';
import { SignalSheet } from './components/SignalSheet';
import { DaySkeleton } from './components/Skeleton';
import { InstallHint } from './components/InstallHint';
import { SeriesView } from './components/SeriesView';
import { Icon, type IconName } from './components/Icon';

/** De vier schermen in de balk onderin. In het midden zit de Nieuw-knop. */
const TABS: Array<{ id: View; label: string; icon: IconName } | 'nieuw'> = [
  { id: 'vandaag', label: 'Vandaag', icon: 'vandaag' },
  { id: 'agenda', label: 'Agenda', icon: 'kalender' },
  'nieuw',
  { id: 'regelen', label: 'Regelen', icon: 'regelen' },
  { id: 'mensen', label: 'Mensen', icon: 'contacten' },
];

/** Wat in de zijbalk staat op een breed scherm: alles, zonder omweg via Gezin. */
const SIDEBAR: Array<{ id: View; label: string; icon: IconName }> = [
  { id: 'vandaag', label: 'Vandaag', icon: 'vandaag' },
  { id: 'agenda', label: 'Agenda', icon: 'kalender' },
  { id: 'regelen', label: 'Regelen', icon: 'regelen' },
  { id: 'mensen', label: 'Mensen', icon: 'contacten' },
];
const SIDEBAR_MORE: Array<{ id: View; label: string; icon: IconName }> = [
  { id: 'brengen', label: 'Breng & haal', icon: 'auto' },
  { id: 'instellingen', label: 'Instellingen', icon: 'instellingen' },
];

export default function App() {
  // Eén verzoek bij het opstarten: de gegevens zelf. Is de sessie verlopen, dan
  // antwoordt de server daarop met een 401 en komt het inlogscherm. Een aparte
  // vraag "ben ik ingelogd?" vooraf is dus niet nodig.
  const [authenticated, setAuthenticated] = useState(true);

  const onSessionLost = useCallback(() => {
    clearCache();
    setAuthenticated(false);
  }, []);
  useEffect(() => setUnauthorizedHandler(onSessionLost), [onSessionLost]);

  if (!authenticated) return <Login onSuccess={() => setAuthenticated(true)} />;

  return (
    <StoreProvider onSessionLost={onSessionLost}>
      <Shell onLogout={onSessionLost} />
    </StoreProvider>
  );
}

function Shell({ onLogout }: { onLogout: () => void }) {
  const { loading, error, notice, setNotice, seriesOpen, setSeriesOpen, offline, syncedAt, reload } =
    useStore();
  const { tasks } = useData();
  const regel = useRegel();

  const [view, setView] = useState<View>('vandaag');
  const [selected, setSelected] = useState(todayInNl());
  const [newSheet, setNewSheet] = useState<{ mode: NewMode; text?: string } | null>(null);
  const [signalKey, setSignalKey] = useState<string | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [editing, setEditing] = useState<CalendarEvent | null>(null);

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

  const nav = useMemo<Nav>(
    () => ({
      view,
      go: (next) => {
        setView(next);
        window.scrollTo({ top: 0 });
      },
      selected,
      setSelected,
      openDate: (date) => {
        setSelected(date);
        setView('agenda');
        window.scrollTo({ top: 0 });
      },
      // Vanuit Regelen ligt een taak voor de hand, overal anders een agenda-item.
      openNew: (mode, text) => setNewSheet({ mode: mode ?? (view === 'regelen' ? 'taak' : 'agenda'), text }),
      openSignal: setSignalKey,
      openTask: setTaskId,
      openEvent: setEditing,
    }),
    [view, selected],
  );

  const openTask = taskId ? tasks.find((t) => t.id === taskId) : undefined;
  const inGezin = view === 'gezin' || view === 'brengen' || view === 'instellingen';

  return (
    <NavContext.Provider value={nav}>
      <div className="app">
        <nav className="sidebar" aria-label="Hoofdmenu">
          <div className="sidebar__brand">
            <Icon name="huis" size={20} /> Familieplanner
          </div>
          <button className="btn btn--primary btn--block" onClick={() => nav.openNew()}>
            <Icon name="plus" size={18} /> Nieuw
          </button>
          {SIDEBAR.map((link) => (
            <button
              key={link.id}
              className="navlink"
              aria-current={view === link.id}
              onClick={() => nav.go(link.id)}
            >
              <Icon name={link.icon} size={19} />
              {link.label}
              {link.id === 'regelen' && regel.urgent > 0 && (
                <span className="navlink__badge">{regel.urgent}</span>
              )}
            </button>
          ))}
          <div className="sidebar__sep" />
          {SIDEBAR_MORE.map((link) => (
            <button
              key={link.id}
              className="navlink"
              aria-current={view === link.id}
              onClick={() => nav.go(link.id)}
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

          {offline && !loading && (
            <div className="offlinewrap">
              <p className="offlinebar" role="status">
                <Icon name="klok" size={15} />
                <span>
                  Geen verbinding. Je ziet de stand van{' '}
                  {syncedAt
                    ? new Date(syncedAt).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })
                    : 'eerder'}
                  ; wijzigen lukt pas weer als je online bent.
                </span>
              </p>
            </div>
          )}

          {loading ? (
            error || offline ? (
              <div className="page">
                <div className="emptystate">
                  <p className="emptystate__title">De gegevens konden niet geladen worden.</p>
                  <p className="emptystate__hint">{offline ? 'Er is geen verbinding.' : error}</p>
                  <button className="btn btn--primary" onClick={() => void reload()}>
                    Opnieuw proberen
                  </button>
                </div>
              </div>
            ) : (
              <DaySkeleton />
            )
          ) : (
            <>
              {inGezin && view !== 'gezin' && (
                <div className="page page--back">
                  <button className="btn btn--ghost btn--sm" onClick={() => nav.go('gezin')}>
                    <Icon name="chevron-links" size={17} /> Gezin
                  </button>
                </div>
              )}
              {view === 'vandaag' && <TodayView />}
              {view === 'agenda' && <CalendarView selected={selected} onSelect={setSelected} />}
              {view === 'regelen' && <RegelenView />}
              {view === 'mensen' && <MensenView />}
              {view === 'gezin' && <GezinView />}
              {view === 'brengen' && <PickupView />}
              {view === 'instellingen' && <SettingsView onLogout={onLogout} />}
            </>
          )}
        </main>

        <nav className="tabbar" aria-label="Hoofdmenu">
          {TABS.map((tab) =>
            tab === 'nieuw' ? (
              <button
                key="nieuw"
                className="tabbar__add"
                aria-label="Nieuw: agenda-item of taak"
                aria-haspopup="dialog"
                onClick={() => nav.openNew()}
              >
                <span className="tabbar__disc">
                  <Icon name="plus" size={26} />
                </span>
              </button>
            ) : (
              <button
                key={tab.id}
                className="tabbar__item"
                aria-current={!inGezin && view === tab.id}
                onClick={() => nav.go(tab.id)}
              >
                <span className="tabbar__icon">
                  <Icon name={tab.icon} size={22} />
                </span>
                {tab.label}
                {tab.id === 'regelen' && regel.urgent > 0 && (
                  <span className="tabbar__badge" role="img" aria-label={`${regel.urgent} dringend`}>
                    {regel.urgent}
                  </span>
                )}
              </button>
            ),
          )}
        </nav>

        {newSheet && (
          <NewSheet
            mode={newSheet.mode}
            initialText={newSheet.text}
            date={view === 'agenda' ? selected : todayInNl()}
            onClose={() => setNewSheet(null)}
          />
        )}
        {signalKey && <SignalSheet signalKey={signalKey} onClose={() => setSignalKey(null)} />}
        {openTask && <TaskForm task={openTask} onClose={() => setTaskId(null)} />}
        {editing && <EventForm initial={editing} date={editing.date} onClose={() => setEditing(null)} />}
        {seriesOpen && <SeriesView seriesId={seriesOpen} onClose={() => setSeriesOpen(null)} />}

        {/* Meldingen worden voorgelezen; een fout onderbreekt, een bevestiging niet. */}
        {(notice || error) && !(loading && error) && (
          <div
            className={`toast ${error && !notice ? 'toast--error' : ''}`}
            role={error && !notice ? 'alert' : 'status'}
            aria-live={error && !notice ? 'assertive' : 'polite'}
          >
            {notice ?? error}
          </div>
        )}
      </div>
    </NavContext.Provider>
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
