import { useMemo, useRef, useState } from 'react';
import type { CalendarEvent, PersonId } from '../../shared/types';
import { PERSON_LABEL } from '../../shared/types';
import {
  addDays,
  formatLong,
  isoWeekday,
  monthName,
  parseYmd,
  startOfWeek,
  todayInNl,
  weekdayShort,
} from '../../shared/dates';
import { useData, useStore } from '../lib/store';
import { useIsWide } from '../lib/useIsWide';
import { birthdaysOnDate, coversDate, eventsOnDate, pickupForDate } from '../lib/events';
import { EventForm } from '../components/EventForm';
import { Timeline } from '../components/Timeline';
import { DayFacts } from '../components/DayFacts';
import { Icon } from '../components/Icon';
import { EmptyState } from '../components/EmptyState';
import { GezinButton } from '../components/PageHead';
import { SignalBanner } from '../components/SignalBanner';
import { useRegel } from '../lib/useRegel';

type Filter = 'alles' | PersonId;
const FILTERS: Filter[] = ['alles', 'matthijs', 'amelie', 'lotte', 'gezin'];

/** Op een telefoon kies je tussen de week (met daglijst) en het maandoverzicht.
 *  Op een breed scherm staan het maandraster en de dag naast elkaar. */
type Mode = 'week' | 'maand';

export function CalendarView({
  selected,
  onSelect,
}: {
  selected: string;
  onSelect: (date: string) => void;
}) {
  const { events, contacts, pickupRules, pickupOverrides, meals } = useData();
  const { saveEvent } = useStore();
  const regel = useRegel();

  /** De dag waaruit de zichtbare week en maand volgen. */
  const [anchor, setAnchor] = useState(selected);
  const [mode, setMode] = useState<Mode>('week');
  const [filter, setFilter] = useState<Filter>('alles');
  const [editing, setEditing] = useState<CalendarEvent | null>(null);
  const [creating, setCreating] = useState(false);

  const isWide = useIsWide();
  // Naast elkaar staat het maandraster altijd, dus bladeren gaat daar per maand.
  const view: Mode = isWide ? 'maand' : mode;

  const today = todayInNl();

  const visible = useMemo(
    () => (filter === 'alles' ? events : events.filter((e) => e.person === filter)),
    [events, filter],
  );

  const weekStart = startOfWeek(anchor);
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );
  const monthDays = useMemo(() => buildMonthGrid(anchor.slice(0, 7)), [anchor]);

  const dayEvents = eventsOnDate(visible, selected);
  const birthdays = birthdaysOnDate(contacts, selected);
  const pickups = pickupForDate(selected, pickupRules, pickupOverrides);
  const dinner = meals.find((m) => m.date === selected);

  /** Bladeren neemt de selectie mee, zodat de daglijst altijd een dag toont
   *  die ook in beeld staat. */
  const shift = (delta: number) => {
    if (view === 'week') {
      setAnchor(addDays(anchor, delta * 7));
      onSelect(addDays(selected, delta * 7));
      return;
    }
    const [y, m] = anchor.split('-').map(Number);
    const eerste = new Date(y, m - 1 + delta, 1);
    const jaar = eerste.getFullYear();
    const maand = eerste.getMonth() + 1;
    setAnchor(`${jaar}-${String(maand).padStart(2, '0')}-01`);

    // Zelfde dag van de maand, ingekort als die maand korter is (31 → 30).
    const laatste = new Date(jaar, maand, 0).getDate();
    const dag = Math.min(Number(selected.slice(8)), laatste);
    onSelect(`${jaar}-${String(maand).padStart(2, '0')}-${String(dag).padStart(2, '0')}`);
  };

  // Zit vandaag al in beeld, dan hoeft de knop er niet te staan.
  const vandaagInBeeld =
    view === 'week'
      ? today >= weekStart && today <= addDays(weekStart, 6)
      : today.slice(0, 7) === anchor.slice(0, 7);

  const goToday = () => {
    setAnchor(today);
    onSelect(today);
  };

  const toggleBring = (event: CalendarEvent, itemId: string) => {
    void saveEvent({
      ...event,
      bring: event.bring.map((b) => (b.id === itemId ? { ...b, done: !b.done } : b)),
    }).catch(() => {});
  };

  // Vegen over de weekstrip bladert een week vooruit of terug.
  const touch = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touch.current) return;
    const dx = e.changedTouches[0].clientX - touch.current.x;
    const dy = e.changedTouches[0].clientY - touch.current.y;
    touch.current = null;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      shift(dx < 0 ? 1 : -1);
    }
  };

  // Met de pijltjestoetsen door de dagen, zoals in elke agenda.
  const onDayKeyDown = (e: React.KeyboardEvent, date: string) => {
    const step = e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0;
    if (step === 0) return;
    e.preventDefault();
    const next = addDays(date, step);
    onSelect(next);
    setAnchor(next);
  };

  return (
    <div className={`page cal cal--${mode}`}>
      <div className="cal__top">
        <div className="cal__head">
          <button
            className="btn btn--sm btn--ghost"
            onClick={() => shift(-1)}
            aria-label={view === 'week' ? 'Vorige week' : 'Vorige maand'}
          >
            <Icon name="chevron-links" size={18} />
          </button>
          <h1 className="cal__title display grow">{titleFor(view, anchor, weekStart)}</h1>
          <button
            className="btn btn--sm btn--ghost"
            onClick={() => shift(1)}
            aria-label={view === 'week' ? 'Volgende week' : 'Volgende maand'}
          >
            <Icon name="chevron-rechts" size={18} />
          </button>
          {!vandaagInBeeld && (
            <button className="btn btn--sm" onClick={goToday}>
              Vandaag
            </button>
          )}
          <GezinButton />
        </div>

        <div className="cal__controls">
          <div className="segmented cal__modes" role="group" aria-label="Weergave">
            {(['week', 'maand'] as Mode[]).map((m) => (
              <button key={m} aria-pressed={mode === m} onClick={() => setMode(m)}>
                {m === 'week' ? 'Week' : 'Maand'}
              </button>
            ))}
          </div>
          {/* Gekleurde initialen: compact, en meteen de legenda bij de stippen. */}
          <div className="whofilter" role="group" aria-label="Filter op persoon">
            {FILTERS.map((f) => (
              <button
                key={f}
                className={`who who--${f}`}
                aria-pressed={filter === f}
                aria-label={f === 'alles' ? 'Alles' : PERSON_LABEL[f]}
                title={f === 'alles' ? 'Alles' : PERSON_LABEL[f]}
                onClick={() => setFilter(f)}
              >
                {f === 'alles' ? 'Alles' : PERSON_LABEL[f].charAt(0)}
              </button>
            ))}
          </div>
        </div>

        {/* ------------------------------------------------------ weekstrip */}
        <div className="cal__week" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
          <div className="weekstrip">
            {weekDays.map((date) => {
              const items = visible.filter((e) => coversDate(e, date));
              const classes = [
                'wsday',
                isoWeekday(date) > 5 && 'wsday--weekend',
                date === today && 'wsday--today',
                date === selected && 'wsday--selected',
              ]
                .filter(Boolean)
                .join(' ');

              return (
                <button
                  key={date}
                  className={classes}
                  aria-current={date === selected}
                  onClick={() => onSelect(date)}
                  onKeyDown={(e) => onDayKeyDown(e, date)}
                >
                  <span className="wsday__wd">{weekdayShort(isoWeekday(date) - 1)}</span>
                  <span className="wsday__num">{Number(date.slice(8))}</span>
                  <span className="wsday__dots">
                    {items.slice(0, 4).map((e) => (
                      <span key={e.id} className={`dot dot--${e.person}`} />
                    ))}
                  </span>
                  {items.some((e) => e.bring.some((b) => !b.done)) && (
                    <Icon name="rugzak" size={11} className="wsday__bring" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* --------------------------------------------------- maandoverzicht */}
        <div className="cal__month">
          <div className="cal__weekdays">
            {[0, 1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i}>{weekdayShort(i)}</div>
            ))}
          </div>

          <div className="cal__grid">
            {monthDays.map((date) => {
              const inMonth = date.slice(0, 7) === anchor.slice(0, 7);
              const items = visible.filter((e) => coversDate(e, date));
              const weekday = parseYmd(date).getDay();
              const classes = [
                'day',
                !inMonth && 'day--outside',
                (weekday === 0 || weekday === 6) && 'day--weekend',
                date === today && 'day--today',
                date === selected && 'day--selected',
              ]
                .filter(Boolean)
                .join(' ');

              return (
                <button
                  key={date}
                  className={classes}
                  onClick={() => onSelect(date)}
                  onKeyDown={(e) => onDayKeyDown(e, date)}
                >
                  <span className="day__num">{Number(date.slice(8))}</span>
                  {items.some((e) => e.bring.some((b) => !b.done)) && (
                    <Icon name="rugzak" size={12} className="day__bring" />
                  )}
                  {items.length > 0 && (
                    <span className="day__dots">
                      {items.slice(0, 5).map((e) => (
                        <span key={e.id} className={`dot dot--${e.person}`} />
                      ))}
                    </span>
                  )}
                  {items.slice(0, 2).map((e) => (
                    <span key={e.id} className={`day__pill day__pill--${e.person}`}>
                      {e.title}
                    </span>
                  ))}
                  {items.length > 2 && (
                    <span className="tiny muted day__more">+{items.length - 2} meer</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- de dag */}
      <div className="daycol">
        <div className="daycol__head">
          <h2 className="cap display">{formatLong(selected)}</h2>
          <button className="btn btn--sm" onClick={() => setCreating(true)}>
            <Icon name="plus" size={16} /> Item
          </button>
        </div>

        {regel.open.map((i) =>
          i.kind === 'signal' && i.signal.date === selected ? (
            <SignalBanner key={i.signal.key} signal={i.signal} />
          ) : null,
        )}

        <DayFacts pickups={pickups} dish={dinner?.dish} />

        {birthdays.map((c) => (
          <p key={c.id} className="banner banner--info iconrow">
            <Icon name="taart" size={17} /> {c.name} is jarig
            {c.giftIdeas && ` · cadeau-idee: ${c.giftIdeas}`}
          </p>
        ))}

        {dayEvents.length === 0 ? (
          <EmptyState icon="kalender" title="Niets gepland op deze dag." />
        ) : (
          <Timeline events={dayEvents} onOpen={setEditing} onToggleBring={toggleBring} />
        )}
      </div>

      {editing && <EventForm initial={editing} date={selected} onClose={() => setEditing(null)} />}
      {creating && <EventForm date={selected} onClose={() => setCreating(false)} />}
    </div>
  );
}

/** "Augustus 2026", of "aug — sep 2026" als een week twee maanden raakt. */
function titleFor(mode: Mode, anchor: string, weekStart: string): string {
  if (mode === 'maand') {
    const [y, m] = anchor.split('-').map(Number);
    return `${monthName(m - 1)} ${y}`;
  }
  const weekEnd = addDays(weekStart, 6);
  const [sy, sm] = weekStart.split('-').map(Number);
  const [ey, em] = weekEnd.split('-').map(Number);
  if (sm === em) return `${monthName(sm - 1)} ${sy}`;
  return `${monthName(sm - 1).slice(0, 3)} — ${monthName(em - 1).slice(0, 3)} ${ey}`;
}

/** Zes weken vanaf de maandag voor de eerste van de maand. */
function buildMonthGrid(cursor: string): string[] {
  const start = startOfWeek(`${cursor}-01`);
  const days: string[] = [];
  for (let i = 0; i < 42; i++) days.push(addDays(start, i));

  // Laatste rij weglaten als die volledig buiten de maand valt.
  return days[35].slice(0, 7) === cursor ? days : days.slice(0, 35);
}
