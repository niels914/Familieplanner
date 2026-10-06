import { Fragment, useMemo, useRef, useState } from 'react';
import type { CalendarEvent, PersonId } from '../../shared/types';
import { PERSON_LABEL } from '../../shared/types';
import {
  addDays,
  formatLong,
  isoWeek,
  monthName,
  parseYmd,
  startOfWeek,
  todayInNl,
  weekdayShort,
} from '../../shared/dates';
import { useData, useStore } from '../lib/store';
import { birthdaysOnDate, coversDate, eventsOnDate } from '../lib/events';
import { ageTurning, turningLabel } from '../../shared/verjaardagen';
import { feestdagenOp, feestdagenTussen, feestdagNamen, isFeestdag } from '../../shared/feestdagen';
import { EventForm } from '../components/EventForm';
import { Timeline } from '../components/Timeline';
import { DayFacts } from '../components/DayFacts';
import { Avatar } from '../components/Avatar';
import { Icon } from '../components/Icon';
import { EmptyState } from '../components/EmptyState';
import { GezinButton } from '../components/PageHead';
import { SignalBanner } from '../components/SignalBanner';
import { useRegel } from '../lib/useRegel';

type Filter = 'alles' | PersonId;
const FILTERS: Filter[] = ['alles', 'matthijs', 'amelie', 'lotte', 'niels', 'irene', 'gezin'];

export function CalendarView({
  selected,
  onSelect,
}: {
  selected: string;
  onSelect: (date: string) => void;
}) {
  const { events, contacts, meals } = useData();
  const { saveEvent } = useStore();
  const regel = useRegel();

  /** De dag waaruit de zichtbare maand volgt. */
  const [anchor, setAnchor] = useState(selected);
  const [filter, setFilter] = useState<Filter>('alles');
  const [editing, setEditing] = useState<CalendarEvent | null>(null);
  const [creating, setCreating] = useState(false);

  const today = todayInNl();

  const visible = useMemo(
    () => (filter === 'alles' ? events : events.filter((e) => e.person === filter)),
    [events, filter],
  );

  const monthDays = useMemo(() => buildMonthGrid(anchor.slice(0, 7)), [anchor]);
  const feestdagen = useMemo(() => feestdagenTussen(monthDays[0], monthDays[monthDays.length - 1]), [monthDays]);

  const dayEvents = eventsOnDate(visible, selected);
  const birthdays = birthdaysOnDate(contacts, selected);
  const feestdagenOpDag = feestdagenOp(selected);
  const dinner = meals.find((m) => m.date === selected);

  /** Bladeren neemt de selectie mee, zodat de daglijst altijd een dag toont
   *  die ook in beeld staat. */
  const shift = (delta: number) => {
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
  const vandaagInBeeld = today.slice(0, 7) === anchor.slice(0, 7);

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

  // Vegen over het maandraster bladert een maand vooruit of terug.
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
    <div className="page cal">
      <div className="cal__top">
        <div className="cal__head">
          <button
            className="btn btn--sm btn--ghost"
            onClick={() => shift(-1)}
            aria-label="Vorige maand"
          >
            <Icon name="chevron-links" size={18} />
          </button>
          <h1 className="cal__title display grow">{titleFor(anchor)}</h1>
          <button
            className="btn btn--sm btn--ghost"
            onClick={() => shift(1)}
            aria-label="Volgende maand"
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
          {/* Gekleurde initialen: compact, en meteen de legenda bij de stippen. */}
          <div className="whofilter" role="group" aria-label="Filter op persoon">
            {FILTERS.map((f) => (
              <button
                key={f}
                className={`who ${f === 'alles' ? 'who--alles' : 'who--avatar'}`}
                aria-pressed={filter === f}
                aria-label={f === 'alles' ? 'Alles' : PERSON_LABEL[f]}
                title={f === 'alles' ? 'Alles' : PERSON_LABEL[f]}
                onClick={() => setFilter(f)}
              >
                {f === 'alles' ? 'Alles' : <Avatar who={f} size={28} />}
              </button>
            ))}
          </div>
        </div>

        {/* --------------------------------------------------- maandoverzicht */}
        <div className="cal__month" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
          <div className="cal__weekdays">
            <div className="cal__wkhead" title="Weeknummer">wk</div>
            {[0, 1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i}>{weekdayShort(i)}</div>
            ))}
          </div>

          <div className="cal__grid">
            {monthDays.map((date, index) => {
              const inMonth = date.slice(0, 7) === anchor.slice(0, 7);
              const items = visible.filter((e) => coversDate(e, date));
              const weekday = parseYmd(date).getDay();
              const feest = feestdagen.get(date);
              const classes = [
                'day',
                !inMonth && 'day--outside',
                (weekday === 0 || weekday === 6) && 'day--weekend',
                feest && (isFeestdag(feest) ? 'day--feestdag' : 'day--gezinsdag'),
                date === today && 'day--today',
                date === selected && 'day--selected',
              ]
                .filter(Boolean)
                .join(' ');

              return (
                <Fragment key={date}>
                {index % 7 === 0 && (
                  <div className="cal__wknum" aria-label={`Week ${isoWeek(date)}`}>
                    {isoWeek(date)}
                  </div>
                )}
                <button
                  className={classes}
                  onClick={() => {
                    onSelect(date);
                    if (!inMonth) setAnchor(date);
                  }}
                  onKeyDown={(e) => onDayKeyDown(e, date)}
                  aria-current={date === selected}
                  aria-label={feest ? `${formatLong(date)}, ${feestdagNamen(feest)}` : formatLong(date)}
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
                  {feest && <span className="day__feest">{feestdagNamen(feest)}</span>}
                  {items.slice(0, feest ? 1 : 2).map((e) => (
                    <span key={e.id} className={`day__pill day__pill--${e.person}`}>
                      {e.title}
                    </span>
                  ))}
                  {items.length > (feest ? 1 : 2) && (
                    <span className="tiny muted day__more">+{items.length - (feest ? 1 : 2)} meer</span>
                  )}
                </button>
                </Fragment>
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

        {feestdagenOpDag.length > 0 && (
          <p className={`banner iconrow banner--${isFeestdag(feestdagenOpDag) ? 'feestdag' : 'gezinsdag'}`}>
            <Icon name="feest" size={17} /> {feestdagNamen(feestdagenOpDag)}
            {isFeestdag(feestdagenOpDag) && ' · feestdag'}
          </p>
        )}

        {/* Breng en haal staat bij Gezin; hier alleen wat we eten. */}
        <DayFacts pickups={[]} dish={dinner?.dish} />

        {birthdays.map((c) => (
          <p key={c.id} className="banner banner--info iconrow">
            <Icon name="taart" size={17} /> {c.name} is jarig
            {ageTurning(c.birthday, selected) !== undefined && ` en ${turningLabel(ageTurning(c.birthday, selected))}`}
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

/** "Oktober 2026" */
function titleFor(anchor: string): string {
  const [y, m] = anchor.split('-').map(Number);
  return `${monthName(m - 1)} ${y}`;
}

/** Zes weken vanaf de maandag voor de eerste van de maand. */
function buildMonthGrid(cursor: string): string[] {
  const start = startOfWeek(`${cursor}-01`);
  const days: string[] = [];
  for (let i = 0; i < 42; i++) days.push(addDays(start, i));

  // Laatste rij weglaten als die volledig buiten de maand valt.
  return days[35].slice(0, 7) === cursor ? days : days.slice(0, 35);
}
