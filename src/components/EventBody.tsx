/**
 * De inhoud van een agenda-item: titel, bijzin en het meeneem-lijstje.
 * Wordt gedeeld door de kaartweergave (agenda) en de tijdlijn (vandaag), zodat
 * er maar één plek is waar bepaald wordt hoe een item leest.
 */

import type { CalendarEvent, Category } from '../../shared/types';
import { AGENDA_FEED_LABEL, CATEGORY_LABEL, PERSON_LABEL } from '../../shared/types';
import { Icon, type IconName } from './Icon';

/** Welk icoon hoort bij welke soort item. */
export const CATEGORY_ICON: Record<Category, IconName> = {
  school: 'rugzak',
  psz: 'blokken',
  opvang: 'fles',
  oppas: 'oppas',
  afspraak: 'speld',
  verjaardag: 'taart',
  vrij: 'koffer',
  weg: 'auto',
  anders: 'kalender',
};

export function EventBody({
  event,
  onClick,
  onToggleBring,
  compactBring = false,
}: {
  event: CalendarEvent;
  onClick: () => void;
  onToggleBring?: (itemId: string) => void;
  /** Het meeneem-lijstje staat al elders op de pagina: hier één regel. */
  compactBring?: boolean;
}) {
  const open = event.bring.filter((b) => !b.done);

  return (
    <>
      <button className="event__open" onClick={onClick}>
        <span className="event__title">{event.title}</span>
        <span className="event__meta">
          {event.person !== 'gezin' && `${PERSON_LABEL[event.person]} · `}
          {CATEGORY_LABEL[event.category]}
          {event.endTime && !event.allDay && ` · tot ${event.endTime}`}
          {event.sitter && ` · ${event.sitter.name} ${event.sitter.start}–${event.sitter.end}`}
          {event.source === 'parro' && ' · Parro'}
          {event.source === 'agenda' && ` · ${AGENDA_FEED_LABEL[event.agendaFeed ?? 'niels']}`}
          {event.series && (
            <>
              {' · '}
              <Icon name="herhaal" size={13} style={{ verticalAlign: -2 }} label="reeks" />
            </>
          )}
        </span>
        {event.notes && <span className="event__meta">{event.notes}</span>}
      </button>

      {/* Wat nog klaar moet staat groot; wat af is krimpt tot één regel. */}
      {compactBring && open.length > 0 ? (
        <p className="bring bring--compact iconrow">
          <Icon name="rugzak" size={15} />
          Mee: {open.map((b) => b.text).join(', ')}
        </p>
      ) : open.length > 0 ? (
        <div className="bring">
          <div className="iconrow" style={{ marginBottom: 3 }}>
            <Icon name="rugzak" size={16} />
            Meenemen
          </div>
          {event.bring.map((item) => (
            <label
              key={item.id}
              className={`bringrow ${item.done ? 'bringrow--done' : ''}`}
              style={{ cursor: onToggleBring ? 'pointer' : 'default' }}
            >
              <input
                type="checkbox"
                checked={item.done}
                disabled={!onToggleBring}
                onChange={() => onToggleBring?.(item.id)}
              />
              <span>{item.text}</span>
            </label>
          ))}
        </div>
      ) : (
        event.bring.length > 0 && (
          <p className="bring--klaar iconrow">
            <Icon name="vinkje" size={15} />
            Klaargezet: {event.bring.map((b) => b.text).join(', ')}
          </p>
        )
      )}
    </>
  );
}
