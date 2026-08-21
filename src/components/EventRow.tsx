import type { CalendarEvent } from '../../shared/types';
import { PERSON_LABEL, CATEGORY_LABEL } from '../../shared/types';

const CATEGORY_ICON: Record<string, string> = {
  school: '🎒',
  psz: '🧸',
  opvang: '🍼',
  oppas: '🧑‍🍼',
  afspraak: '📌',
  verjaardag: '🎂',
  vrij: '🌴',
  anders: '•',
};

export function EventRow({
  event,
  onClick,
  onToggleBring,
}: {
  event: CalendarEvent;
  onClick: () => void;
  onToggleBring?: (itemId: string) => void;
}) {
  const open = event.bring.filter((b) => !b.done);

  return (
    <div className={`event event--${event.person}`}>
      <div className="event__time">
        {event.allDay ? CATEGORY_ICON[event.category] ?? '•' : event.time}
      </div>
      <div className="grow">
        <button
          onClick={onClick}
          style={{ all: 'unset', cursor: 'pointer', display: 'block', width: '100%' }}
        >
          <div className="event__title">{event.title}</div>
          <div className="event__meta">
            {event.person !== 'gezin' && `${PERSON_LABEL[event.person]} · `}
            {CATEGORY_LABEL[event.category]}
            {event.sitter && ` · ${event.sitter.name} ${event.sitter.start}–${event.sitter.end}`}
            {event.source === 'parro' && ' · Parro'}
          </div>
          {event.notes && <div className="event__meta" style={{ marginTop: 3 }}>{event.notes}</div>}
        </button>

        {event.bring.length > 0 && (
          <div className={`bring ${open.length === 0 ? 'bring--done' : ''}`}>
            <div style={{ marginBottom: 2 }}>
              {open.length === 0 ? '✓ Alles klaargezet' : '🎒 Meenemen'}
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
        )}
      </div>
    </div>
  );
}
