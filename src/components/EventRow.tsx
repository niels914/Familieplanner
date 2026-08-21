import type { CalendarEvent, Category } from '../../shared/types';
import { Icon, type IconName } from './Icon';
import { EventBody } from './EventBody';

export const CATEGORY_ICON: Record<Category, IconName> = {
  school: 'rugzak',
  psz: 'blokken',
  opvang: 'fles',
  oppas: 'oppas',
  afspraak: 'speld',
  verjaardag: 'taart',
  vrij: 'koffer',
  anders: 'kalender',
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
  return (
    <div className={`event event--${event.person}`}>
      <div className="event__time">
        {event.allDay ? <Icon name={CATEGORY_ICON[event.category]} size={20} /> : event.time}
      </div>
      <div className="grow">
        <EventBody event={event} onClick={onClick} onToggleBring={onToggleBring} />
      </div>
    </div>
  );
}
