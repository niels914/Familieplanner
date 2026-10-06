import type { CalendarEvent } from '../../shared/types';
import { PERSON_LABEL } from '../../shared/types';
import { groupByPerson, openBring, progressLabel, progressShare, type PrepItem } from '../lib/prep';
import { Avatar } from './Avatar';
import { Icon } from './Icon';

export { openBring };
export type { PrepItem };

/**
 * Wat er nog klaar moet staan, per persoon gegroepeerd (het dier met de naam
 * erboven, daaronder wat er mee moet), met een vinkje per ding. Zodra er iets is
 * afgevinkt, staat in de kop hoever jullie zijn. Is alles af, dan komt er een
 * rustig afgerond moment voor in de plaats.
 */
export function PrepList({
  items,
  done = 0,
  title,
  doneText,
  onToggle,
  onHead,
}: {
  items: PrepItem[];
  /** Hoeveel er al is afgevinkt, voor de voortgang. */
  done?: number;
  title: string;
  /** Wat er staat als alles af is, bijvoorbeeld "Alles zit in de tas." */
  doneText?: string;
  onToggle: (event: CalendarEvent, itemId: string) => void;
  /** Tik op de kop, bijvoorbeeld om naar die dag in de agenda te gaan. */
  onHead?: () => void;
}) {
  if (items.length === 0) return done > 0 && doneText ? <AllDone text={doneText} /> : null;

  const share = progressShare(done, items.length);
  const head = (
    <>
      <Icon name="rugzak" size={19} />
      <strong className="grow">{title}</strong>
      <span className="prep__count">{progressLabel(done, items.length)}</span>
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

      {done > 0 && (
        <div
          className="prep__bar"
          role="progressbar"
          aria-label="Voortgang"
          aria-valuemin={0}
          aria-valuemax={done + items.length}
          aria-valuenow={done}
        >
          <span style={{ width: `${Math.round(share * 100)}%` }} />
        </div>
      )}

      {groupByPerson(items).map((group) => (
        <div key={group.person} className="prep__group">
          <div className="prep__who">
            <Avatar who={group.person} size={26} />
            <b>{group.person === 'gezin' ? 'Voor iedereen' : PERSON_LABEL[group.person]}</b>
          </div>
          <ul className="prep__list">
            {group.items.map(({ event, item }) => (
              <li key={item.id}>
                <label className="prep__row">
                  <input type="checkbox" checked={false} onChange={() => onToggle(event, item.id)} />
                  <span className="grow">
                    <span className="prep__text">{item.text}</span>
                    <span className="prep__for">{event.title}</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}

/** Het afgeronde moment: een vinkje dat even opveert, en een korte, vriendelijke zin. */
export function AllDone({ text }: { text: string }) {
  return (
    <p className="allklaar" role="status">
      <span className="allklaar__tik">
        <Icon name="vinkje" size={16} />
      </span>
      {text}
    </p>
  );
}
