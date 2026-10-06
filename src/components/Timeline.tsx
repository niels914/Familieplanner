/**
 * De dag als tijdlijn: tijd links op een rail, items ernaast. Laat in één blik
 * zien wanneer iets is én waar de gaten in de dag zitten — wat een stapel
 * losse kaarten niet doet.
 */

import type { CalendarEvent } from '../../shared/types';
import { todayInNl } from '../../shared/dates';
import { bringSuggestions } from '../../shared/suggesties';
import { useBringSuggestions } from '../lib/suggesties';
import { Icon } from './Icon';
import { EventBody, CATEGORY_ICON } from './EventBody';

export function Timeline({
  events,
  onOpen,
  onToggleBring,
  compactBring = false,
  dim = false,
}: {
  events: CalendarEvent[];
  onOpen: (event: CalendarEvent) => void;
  onToggleBring: (event: CalendarEvent, itemId: string) => void;
  compactBring?: boolean;
  /** Voorbij: gedimd, bijvoorbeeld onder "Eerder vandaag". */
  dim?: boolean;
}) {
  const { adopt, dismiss } = useBringSuggestions();
  const today = todayInNl();

  return (
    <ol className="timeline">
      {events.map((event) => (
        <li key={event.id} className={`tl tl--${event.person} ${dim ? 'tl--passed' : ''}`}>
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
              compactBring={compactBring}
              suggestions={dim ? [] : bringSuggestions(event, today)}
              onAdopt={(s) => adopt(event, s)}
              onDismiss={(s) => dismiss(event, s)}
            />
          </div>
        </li>
      ))}
    </ol>
  );
}
