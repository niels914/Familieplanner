import type { CalendarEvent } from '../../shared/types';
import { PERSON_LABEL } from '../../shared/types';
import { Icon } from './Icon';

export interface PrepItem {
  event: CalendarEvent;
  item: { id: string; text: string };
}

/** Wat er nog klaar moet staan, met een vinkje per ding en bij welk item het hoort. */
export function PrepList({
  items,
  title,
  onToggle,
  onHead,
}: {
  items: PrepItem[];
  title: string;
  onToggle: (event: CalendarEvent, itemId: string) => void;
  /** Tik op de kop, bijvoorbeeld om naar die dag in de agenda te gaan. */
  onHead?: () => void;
}) {
  if (items.length === 0) return null;

  const head = (
    <>
      <Icon name="rugzak" size={19} />
      <strong className="grow">{title}</strong>
      <span className="chip chip--warn">{items.length}</span>
      {onHead && <Icon name="chevron-rechts" size={17} />}
    </>
  );

  return (
    <section className="prep">
      {onHead ? (
        <button className="prep__head" onClick={onHead}>
          {head}
        </button>
      ) : (
        <div className="prep__head prep__head--static">{head}</div>
      )}
      <ul className="prep__list">
        {items.map(({ event, item }) => (
          <li key={item.id}>
            <label className="prep__row">
              <input type="checkbox" checked={false} onChange={() => onToggle(event, item.id)} />
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
  );
}

export const openBring = (events: CalendarEvent[]): PrepItem[] =>
  events.flatMap((e) => e.bring.filter((b) => !b.done).map((item) => ({ event: e, item })));
