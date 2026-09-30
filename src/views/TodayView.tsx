import { useMemo, useState } from 'react';
import type { CalendarEvent } from '../../shared/types';
import { PERSON_LABEL } from '../../shared/types';
import { addDays, formatLong, todayInNl } from '../../shared/dates';
import { useData, useStore } from '../lib/store';
import { birthdaysOnDate, eventsOnDate, pickupForDate } from '../lib/events';
import { EventForm } from '../components/EventForm';
import { Timeline } from '../components/Timeline';
import { DayFacts } from '../components/DayFacts';
import { Icon } from '../components/Icon';
import { EmptyState } from '../components/EmptyState';

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
  const heeftMeeneemItems = tomorrowEvents.some((e) => e.bring.length > 0);

  const toggleBring = (event: CalendarEvent, itemId: string) => {
    void saveEvent({
      ...event,
      bring: event.bring.map((b) => (b.id === itemId ? { ...b, done: !b.done } : b)),
    });
  };

  // Eén regel die de dag samenvat, in plaats van drie losse tellers.
  const samenvatting = [
    todayEvents.length === 0
      ? 'niets in de agenda'
      : `${todayEvents.length} ding${todayEvents.length === 1 ? '' : 'en'} vandaag`,
    klaarzetten.length > 0 ? `${klaarzetten.length} klaarzetten` : null,
    openShopping > 0 ? `${openShopping} boodschappen` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="page">
      <header className="dayhead">
        <h1 className="cap">{formatLong(today)}</h1>
        <p className="page__sub">{samenvatting}</p>
      </header>

      {klaarzetten.length > 0 ? (
        <section className="prep">
          <button className="prep__head" onClick={() => onOpenDate(tomorrow)}>
            <Icon name="rugzak" size={19} />
            <strong className="grow">Klaarzetten voor morgen</strong>
            <Icon name="chevron-rechts" size={17} />
          </button>
          <ul className="prep__list">
            {klaarzetten.map(({ event, item }) => (
              <li key={item.id}>
                <label className="prep__row">
                  <input
                    type="checkbox"
                    checked={false}
                    onChange={() => toggleBring(event, item.id)}
                  />
                  <span className="grow">
                    <span className="prep__text">{item.text}</span>
                    <span className="prep__for">
                      {event.person !== 'gezin' ? `${PERSON_LABEL[event.person]} · ` : ''}
                      {event.title}
                    </span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        heeftMeeneemItems && (
          <p className="allklaar iconrow">
            <Icon name="vinkje" size={18} /> Alles staat klaar voor morgen.
          </p>
        )
      )}

      <DayFacts pickups={pickups} dish={dinner?.dish} />

      {birthdays.map((c) => (
        <p key={c.id} className="banner banner--info iconrow">
          <Icon name="taart" size={18} /> {c.name} is vandaag jarig
          {c.parents.length > 0 && ` — ouders: ${c.parents.map((p) => p.name).join(', ')}`}
        </p>
      ))}

      {todayEvents.length === 0 ? (
        <EmptyState icon="vandaag" title="Een lege dag." hint="Ook fijn." />
      ) : (
        <Timeline
          events={todayEvents}
          onOpen={setEditing}
          onToggleBring={toggleBring}
        />
      )}

      <details className="foldout">
        <summary>
          <span className="foldout__label">Morgen</span>
          <span className="foldout__preview grow">
            {tomorrowEvents.length === 0
              ? 'nog niets gepland'
              : tomorrowEvents
                  .slice(0, 2)
                  .map((e) => e.title)
                  .join(', ') + (tomorrowEvents.length > 2 ? `, +${tomorrowEvents.length - 2}` : '')}
          </span>
          <Icon name="chevron-rechts" size={17} className="foldout__chevron" />
        </summary>
        {tomorrowEvents.length > 0 && (
          <Timeline events={tomorrowEvents} onOpen={setEditing} onToggleBring={toggleBring} />
        )}
      </details>

      {editing && (
        <EventForm initial={editing} date={editing.date} onClose={() => setEditing(null)} />
      )}
    </div>
  );
}
