import { useMemo, useState } from 'react';
import type { CalendarEvent } from '../../shared/types';
import { PERSON_LABEL } from '../../shared/types';
import { addDays, formatLong, todayInNl } from '../../shared/dates';
import { useData, useStore } from '../lib/store';
import { birthdaysOnDate, eventsOnDate, pickupForDate } from '../lib/events';
import { EventRow } from '../components/EventRow';
import { EventForm } from '../components/EventForm';

export function TodayView({ onOpenDate }: { onOpenDate: (date: string) => void }) {
  const { events, contacts, pickupRules, pickupOverrides, meals, shopping } = useData();
  const { saveEvent } = useStore();
  const [editing, setEditing] = useState<CalendarEvent | null>(null);

  const today = todayInNl();
  const tomorrow = addDays(today, 1);

  const todayEvents = useMemo(() => eventsOnDate(events, today), [events, today]);
  const tomorrowEvents = useMemo(() => eventsOnDate(events, tomorrow), [events, tomorrow]);
  const pickups = pickupForDate(today, pickupRules, pickupOverrides);
  const birthdays = birthdaysOnDate(contacts, today);
  const dinner = meals.find((m) => m.date === today);
  const openShopping = shopping.filter((s) => !s.done).length;

  const klaarzetten = tomorrowEvents.flatMap((e) =>
    e.bring.filter((b) => !b.done).map((b) => ({ event: e, item: b })),
  );

  const toggleBring = (event: CalendarEvent, itemId: string) => {
    void saveEvent({
      ...event,
      bring: event.bring.map((b) => (b.id === itemId ? { ...b, done: !b.done } : b)),
    });
  };

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <h1 className="cap">{formatLong(today)}</h1>
          <div className="page__sub">
            {todayEvents.length === 0
              ? 'Niets in de agenda vandaag.'
              : `${todayEvents.length} ding${todayEvents.length === 1 ? '' : 'en'} vandaag`}
            {openShopping > 0 && ` · ${openShopping} op de boodschappenlijst`}
          </div>
        </div>
      </div>

      {klaarzetten.length > 0 && (
        <div className="card card--pad" style={{ marginBottom: 14 }}>
          <div className="row row--between" style={{ marginBottom: 6 }}>
            <strong>🎒 Klaarzetten voor morgen</strong>
            <button className="btn btn--sm btn--ghost" onClick={() => onOpenDate(tomorrow)}>
              Morgen →
            </button>
          </div>
          {klaarzetten.map(({ event, item }) => (
            <label key={item.id} className="bringrow">
              <input type="checkbox" checked={false} onChange={() => toggleBring(event, item.id)} />
              <span className="grow">
                {item.text}
                <span className="muted small">
                  {' '}
                  — {event.person !== 'gezin' ? `${PERSON_LABEL[event.person]}, ` : ''}
                  {event.title}
                </span>
              </span>
            </label>
          ))}
        </div>
      )}

      {(pickups.length > 0 || dinner) && (
        <div className="card card--pad stack stack--sm" style={{ marginBottom: 14 }}>
          {pickups.map((p) => (
            <div key={p.child} className="row row--between small">
              <span className={`chip chip--${p.child}`}>{PERSON_LABEL[p.child]}</span>
              <span className="muted">
                brengen: <strong>{p.dropoff || '—'}</strong> · halen:{' '}
                <strong>{p.pickup || '—'}</strong>
                {p.isOverride && ' (afwijking)'}
              </span>
            </div>
          ))}
          {dinner?.dish && (
            <div className="row row--between small">
              <span className="chip">Eten vandaag</span>
              <span className="muted">{dinner.dish}</span>
            </div>
          )}
        </div>
      )}

      {birthdays.map((c) => (
        <div key={c.id} className="banner banner--info" style={{ marginBottom: 10 }}>
          🎂 {c.name} is vandaag jarig
          {c.parents[0]?.name && ` — ouders: ${c.parents.map((p) => p.name).join(', ')}`}
        </div>
      ))}

      <div className="section-title">Vandaag</div>
      <div className="stack stack--sm">
        {todayEvents.length === 0 ? (
          <div className="empty">Een lege dag. Ook fijn.</div>
        ) : (
          todayEvents.map((e) => (
            <EventRow
              key={e.id}
              event={e}
              onClick={() => setEditing(e)}
              onToggleBring={(id) => toggleBring(e, id)}
            />
          ))
        )}
      </div>

      <div className="section-title">Morgen</div>
      <div className="stack stack--sm">
        {tomorrowEvents.length === 0 ? (
          <div className="empty">Morgen staat er nog niets.</div>
        ) : (
          tomorrowEvents.map((e) => (
            <EventRow
              key={e.id}
              event={e}
              onClick={() => setEditing(e)}
              onToggleBring={(id) => toggleBring(e, id)}
            />
          ))
        )}
      </div>

      {editing && <EventForm initial={editing} date={editing.date} onClose={() => setEditing(null)} />}
    </div>
  );
}
