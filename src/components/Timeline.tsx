/**
 * De dag als tijdlijn: tijd links op een rail, items ernaast. Laat in één blik
 * zien wanneer iets is én waar de gaten in de dag zitten — wat een stapel
 * losse kaarten niet doet.
 */

import type { CalendarEvent } from '../../shared/types';
import { Icon } from './Icon';
import { EventBody } from './EventBody';
import { CATEGORY_ICON } from './EventRow';

export function Timeline({
  events,
  onOpen,
  onToggleBring,
}: {
  events: CalendarEvent[];
  onOpen: (event: CalendarEvent) => void;
  onToggleBring: (event: CalendarEvent, itemId: string) => void;
}) {
  return (
    <ol className="timeline">
      {events.map((event) => (
        <li key={event.id} className={`tl tl--${event.person}`}>
          <div className="tl__time">
            {event.allDay ? (
              <Icon name={CATEGORY_ICON[event.category]} size={19} />
            ) : (
              <>
                <span className="tl__hour">{event.time?.slice(0, 2)}</span>
                <span className="tl__min">{event.time?.slice(3)}</span>
              </>
            )}
          </div>
          <div className="tl__rail" aria-hidden="true" />
          <div className="tl__body">
            <EventBody
              event={event}
              onClick={() => onOpen(event)}
              onToggleBring={(id) => onToggleBring(event, id)}
            />
          </div>
        </li>
      ))}
    </ol>
  );
}
