import { useMemo, useState } from 'react';
import type { CalendarEvent, PersonId } from '../../shared/types';
import { PERSON_LABEL } from '../../shared/types';
import {
  addDays,
  formatLong,
  monthName,
  parseYmd,
  startOfWeek,
  todayInNl,
  weekdayShort,
} from '../../shared/dates';
import { useData, useStore } from '../lib/store';
import { birthdaysOnDate, coversDate, eventsOnDate, pickupForDate } from '../lib/events';
import { EventRow } from '../components/EventRow';
import { EventForm } from '../components/EventForm';
import { Icon } from '../components/Icon';

type Filter = 'alles' | PersonId;
const FILTERS: Filter[] = ['alles', 'matthijs', 'amelie', 'lotte', 'gezin'];

export function CalendarView({
  selected,
  onSelect,
}: {
  selected: string;
  onSelect: (date: string) => void;
}) {
  const { events, contacts, pickupRules, pickupOverrides } = useData();
  const { saveEvent } = useStore();
  const [cursor, setCursor] = useState(() => selected.slice(0, 7));
  const [filter, setFilter] = useState<Filter>('alles');
  const [editing, setEditing] = useState<CalendarEvent | null>(null);
  const [creating, setCreating] = useState(false);

  const today = todayInNl();

  const visible = useMemo(
    () => (filter === 'alles' ? events : events.filter((e) => e.person === filter)),
    [events, filter],
  );

  const days = useMemo(() => buildMonthGrid(cursor), [cursor]);
  const dayEvents = eventsOnDate(visible, selected);
  const birthdays = birthdaysOnDate(contacts, selected);
  const pickups = pickupForDate(selected, pickupRules, pickupOverrides);

  const shiftMonth = (delta: number) => {
    const [y, m] = cursor.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setCursor(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const toggleBring = (event: CalendarEvent, itemId: string) => {
    void saveEvent({
      ...event,
      bring: event.bring.map((b) => (b.id === itemId ? { ...b, done: !b.done } : b)),
    });
  };

  const [year, month] = cursor.split('-').map(Number);

  return (
    <div className="page">
      <div className="cal__head">
        <div className="cal__title display">
          {monthName(month - 1)} {year}
        </div>
        <div className="row">
          <button
            className="btn btn--sm btn--ghost"
            onClick={() => shiftMonth(-1)}
            aria-label="Vorige maand"
          >
            <Icon name="chevron-links" size={18} />
          </button>
          <button
            className="btn btn--sm"
            onClick={() => {
              setCursor(today.slice(0, 7));
              onSelect(today);
            }}
          >
            Vandaag
          </button>
          <button
            className="btn btn--sm btn--ghost"
            onClick={() => shiftMonth(1)}
            aria-label="Volgende maand"
          >
            <Icon name="chevron-rechts" size={18} />
          </button>
        </div>
      </div>

      <div className="filters">
        {FILTERS.map((f) => (
          <button
            key={f}
            className="filter"
            aria-pressed={filter === f}
            onClick={() => setFilter(f)}
          >
            {f === 'alles' ? 'Alles' : PERSON_LABEL[f]}
          </button>
        ))}
      </div>

      <div className="cal__weekdays">
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i}>{weekdayShort(i)}</div>
        ))}
      </div>

      <div className="cal__grid">
        {days.map((date) => {
          const inMonth = date.slice(0, 7) === cursor;
          const items = visible.filter((e) => coversDate(e, date));
          const weekday = parseYmd(date).getDay();
          const hasBring = items.some((e) => e.bring.some((b) => !b.done));
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
            <button key={date} className={classes} onClick={() => onSelect(date)}>
              <span className="day__num">{Number(date.slice(8))}</span>
              {hasBring && <Icon name="rugzak" size={12} className="day__bring" />}
              {items.length > 0 && (
                <span className="day__dots">
                  {items.slice(0, 5).map((e) => (
                    <span key={e.id} className={`dot dot--${e.person}`} />
                  ))}
                </span>
              )}
              {items.slice(0, 2).map((e) => (
                <span key={e.id} className={`day__pill day__pill--${e.person}`}>
                  {e.allDay ? '' : `${e.time} `}
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

      <div className="row row--between" style={{ marginTop: 20, marginBottom: 10 }}>
        <h2 className="cap display" style={{ fontSize: '1.45rem' }}>
          {formatLong(selected)}
        </h2>
        <button className="btn btn--sm" onClick={() => setCreating(true)}>
          + Item
        </button>
      </div>

      <div className="stack stack--sm">
        {pickups.length > 0 && (
          <div className="card card--pad small">
            {pickups.map((p) => (
              <div key={p.child} className="row row--between">
                <span>
                  <span className={`chip chip--${p.child}`}>{PERSON_LABEL[p.child]}</span>{' '}
                  {p.isOverride && <span className="chip chip--warn">afwijking</span>}
                </span>
                <span className="muted">
                  brengen: {p.dropoff || '—'} · halen: {p.pickup || '—'}
                </span>
              </div>
            ))}
          </div>
        )}

        {birthdays.map((c) => (
          <div key={c.id} className="card card--pad small iconrow">
            <Icon name="taart" size={16} /> <strong>{c.name}</strong> is jarig
            {c.giftIdeas && <span className="muted"> · cadeau-idee: {c.giftIdeas}</span>}
          </div>
        ))}

        {dayEvents.length === 0 && birthdays.length === 0 ? (
          <div className="empty">Niets gepland op deze dag.</div>
        ) : (
          dayEvents.map((e) => (
            <EventRow
              key={e.id}
              event={e}
              onClick={() => setEditing(e)}
              onToggleBring={(itemId) => toggleBring(e, itemId)}
            />
          ))
        )}
      </div>

      {editing && (
        <EventForm initial={editing} date={selected} onClose={() => setEditing(null)} />
      )}
      {creating && <EventForm date={selected} onClose={() => setCreating(false)} />}
    </div>
  );
}

/** Zes weken vanaf de maandag voor de eerste van de maand. */
function buildMonthGrid(cursor: string): string[] {
  const first = `${cursor}-01`;
  const start = startOfWeek(first);
  const days: string[] = [];
  for (let i = 0; i < 42; i++) days.push(addDays(start, i));

  // Laatste rij weglaten als die volledig buiten de maand valt.
  return days[35].slice(0, 7) === cursor ? days : days.slice(0, 35);
}
