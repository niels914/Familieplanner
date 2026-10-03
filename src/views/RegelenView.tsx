/**
 * Regelen: alles wat nog geregeld of afgestemd moet worden. Taken die jullie
 * zelf aanmaakten én signalen die de app uit de agenda haalde, gegroepeerd op
 * hoe snel het moet. Boodschappen en het weekmenu zitten hier ook, als segment.
 */

import { useMemo, useState } from 'react';
import { PERSON_LABEL, type Task } from '../../shared/types';
import { spanLabel } from '../../shared/signals';
import { todayInNl } from '../../shared/dates';
import {
  GROUPS,
  dueInfo,
  groupOf,
  matchesFilter,
  regelState,
  shortDate,
  signalTitle,
  type RegelItem,
  type WhoFilter,
} from '../lib/regelen';
import { useData } from '../lib/store';
import { useNav } from '../lib/nav';
import { useStore } from '../lib/store';
import { EmptyState } from '../components/EmptyState';
import { Icon } from '../components/Icon';
import { PageHead } from '../components/PageHead';
import { Shopping, WeekMenu } from '../components/FoodLists';

type Segment = 'taken' | 'boodschappen' | 'menu';

const FILTERS: Array<{ id: WhoFilter; label: string }> = [
  { id: 'alle', label: 'Alle' },
  { id: 'niels', label: 'Niels' },
  { id: 'irene', label: 'Irene' },
  { id: 'samen', label: 'Afstemmen' },
];

const OWNER_LABEL = { niels: 'Niels', irene: 'Irene', samen: 'Afstemmen' } as const;

export function RegelenView() {
  const { events, tasks, decisions, shopping } = useData();
  const { openNew } = useNav();
  const [segment, setSegment] = useState<Segment>('taken');
  const [filter, setFilter] = useState<WhoFilter>('alle');

  const today = todayInNl();
  const state = useMemo(() => regelState(events, tasks, decisions, today), [events, tasks, decisions, today]);

  const items = state.open.filter((i) => matchesFilter(i, filter));
  const toBuy = shopping.filter((i) => !i.done).length;

  const sub =
    segment === 'taken'
      ? `${state.open.length} open${state.urgent ? ` · ${state.urgent} dringend` : ''}`
      : segment === 'boodschappen'
        ? `${toBuy} te halen`
        : 'Wat we deze week eten';

  return (
    <div className="page">
      <PageHead
        title="Regelen"
        sub={sub}
        actions={
          segment === 'taken' ? (
            <button className="btn btn--primary btn--sm" onClick={() => openNew('taak')}>
              <Icon name="plus" size={16} /> Taak
            </button>
          ) : undefined
        }
      />

      <div className="segmented" role="group" aria-label="Onderdeel" style={{ marginBottom: 14 }}>
        <button aria-pressed={segment === 'taken'} onClick={() => setSegment('taken')}>
          Taken
        </button>
        <button aria-pressed={segment === 'boodschappen'} onClick={() => setSegment('boodschappen')}>
          Boodschappen
        </button>
        <button aria-pressed={segment === 'menu'} onClick={() => setSegment('menu')}>
          Weekmenu
        </button>
      </div>

      {segment === 'boodschappen' && <Shopping />}
      {segment === 'menu' && <WeekMenu />}

      {segment === 'taken' && (
        <>
          {/* Geen eigen account per persoon: dit filter kies je zelf. */}
          <div className="picks" role="group" aria-label="Voor wie" style={{ marginBottom: 6 }}>
            {FILTERS.map((f) => (
              <button key={f.id} className="pick" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>
                {f.label}
              </button>
            ))}
          </div>

          {items.length === 0 && (
            <EmptyState
              icon="vinkje"
              title="Alles geregeld."
              hint="Wat nog moet of afgestemd moet worden, zet je hier neer."
            />
          )}

          {GROUPS.map((group) => {
            const inGroup = items
              .filter((i) => groupOf(i, today) === group.id)
              .sort((a, b) => (a.due ?? '9').localeCompare(b.due ?? '9'));
            if (inGroup.length === 0) return null;
            return (
              <section key={group.id}>
                <h2 className="grouphead" style={group.hot ? { color: 'var(--warn)' } : undefined}>
                  {group.label}
                  <span className="grouphead__count">{inGroup.length}</span>
                </h2>
                <div className="list">
                  {inGroup.map((item) => (
                    <Row key={item.kind === 'task' ? item.task.id : item.signal.key} item={item} today={today} />
                  ))}
                </div>
              </section>
            );
          })}

          <Done state={state} />
        </>
      )}
    </div>
  );
}

function Row({ item, today }: { item: RegelItem; today: string }) {
  if (item.kind === 'signal') return <SignalRow item={item} today={today} />;
  return <TaskRow task={item.task} today={today} />;
}

function TaskRow({ task, today }: { task: Task; today: string }) {
  const { saveTask } = useStore();
  const { openTask, openDate } = useNav();
  const { events } = useData();
  const due = dueInfo(task.due, today);
  const linked = task.eventId ? events.find((e) => e.id === task.eventId) : undefined;

  return (
    <div className={`actrow ${task.done ? 'actrow--done' : ''}`}>
      <label className="actrow__check">
        <input
          type="checkbox"
          checked={task.done}
          aria-label={`Klaar: ${task.title}`}
          onChange={() => void saveTask({ ...task, done: !task.done }).catch(() => {})}
        />
      </label>
      <button className="actrow__main" onClick={() => openTask(task.id)}>
        <span className="actrow__title">{task.title}</span>
        <span className="actrow__meta">
          <span className={`chip ${task.owner === 'samen' ? 'chip--gezin' : `chip--${task.owner}`}`}>
            {task.owner === 'samen' && <Icon name="oppas" size={13} />}
            {OWNER_LABEL[task.owner]}
          </span>
          {task.kid && <span className={`chip chip--${task.kid}`}>{PERSON_LABEL[task.kid]}</span>}
          {due && !task.done && (
            <span className={`chip ${due.hot ? 'chip--warn' : ''}`}>
              <Icon name="klok" size={13} /> {due.label}
            </span>
          )}
        </span>
        {linked && !task.done && (
          <span
            className="tiny muted iconrow"
            role="link"
            onClick={(e) => {
              e.stopPropagation();
              openDate(linked.date);
            }}
          >
            <Icon name="speld" size={12} /> {linked.title} · {shortDate(linked.date)}
          </span>
        )}
        {task.done && task.decision && <span className="tiny muted">Besloten: {task.decision}</span>}
      </button>
    </div>
  );
}

function SignalRow({ item, today }: { item: Extract<RegelItem, { kind: 'signal' }>; today: string }) {
  const { openSignal } = useNav();
  const { signal } = item;
  const due = dueInfo(signal.date, today);
  return (
    <div className="actrow actrow--signal">
      <span className="actrow__icon" aria-hidden="true">
        <Icon name="bel" size={20} />
      </span>
      <button className="actrow__main" onClick={() => openSignal(signal.key)}>
        <span className="actrow__title">{signalTitle(signal)}</span>
        <span className="actrow__meta">
          <span className="chip chip--sig">
            <Icon name="zoeken" size={13} /> Gesignaleerd
          </span>
          {due && (
            <span className={`chip ${due.hot ? 'chip--warn' : ''}`}>
              <Icon name="klok" size={13} /> {due.label}
            </span>
          )}
          {signal.coverage === 'partial' && (
            <span className="chip chip--warn">nog niet gedekt {signal.gaps.map(spanLabel).join(', ')}</span>
          )}
        </span>
        <span className="tiny muted">
          Niels: {signal.niels.title} · Irene: {signal.irene.title}
        </span>
      </button>
    </div>
  );
}

function Done({ state }: { state: ReturnType<typeof regelState> }) {
  const { saveTask } = useStore();
  const { openTask, openSignal } = useNav();
  const { decisions, tasks } = useData();
  const count = state.doneTasks.length + state.settledSignals.length;
  if (count === 0) return null;

  return (
    <details className="foldout" style={{ marginTop: 14 }}>
      <summary>
        <span className="foldout__label">Afgerond</span>
        <span className="foldout__preview grow">{count} klaar</span>
        <Icon name="chevron-rechts" size={17} className="foldout__chevron" />
      </summary>
      <div className="list" style={{ marginTop: 6 }}>
        {state.settledSignals.map((s) => {
          const d = decisions[s.key];
          const text =
            d?.type === 'thuis'
              ? `${PERSON_LABEL[d.who]} blijft thuis`
              : d?.type === 'ok'
                ? 'Geen probleem, bewust besloten'
                : `Geregeld: ${s.sitters[0]?.sitter?.name ?? s.sitters[0]?.title ?? 'oppas'}`;
          return (
            <div key={s.key} className="actrow actrow--ok">
              <span className="actrow__icon" style={{ color: 'var(--primary)' }} aria-hidden="true">
                <Icon name="vinkje" size={20} />
              </span>
              <button className="actrow__main" onClick={() => openSignal(s.key)}>
                <span className="actrow__title">{signalTitle(s)}</span>
                <span className="tiny muted">{text}</span>
              </button>
            </div>
          );
        })}
        {state.doneTasks.map((t) => {
          // Een oppas-taak die vanzelf sloot is zelf niet afgevinkt; die kun je niet "weer openen".
          const byAgenda = tasks.find((x) => x.id === t.id)?.done === false;
          return (
          <div key={t.id} className="actrow actrow--done">
            {byAgenda ? (
              <span className="actrow__icon" style={{ color: 'var(--primary)' }} aria-hidden="true">
                <Icon name="vinkje" size={20} />
              </span>
            ) : (
              <label className="actrow__check">
                <input
                  type="checkbox"
                  checked
                  aria-label={`Weer openen: ${t.title}`}
                  onChange={() => void saveTask({ id: t.id, title: t.title, done: false }).catch(() => {})}
                />
              </label>
            )}
            <button className="actrow__main" onClick={() => openTask(t.id)}>
              <span className="actrow__title">{t.title}</span>
              {t.decision && <span className="tiny muted">{byAgenda ? t.decision : `Besloten: ${t.decision}`}</span>}
            </button>
          </div>
          );
        })}
      </div>
    </details>
  );
}
