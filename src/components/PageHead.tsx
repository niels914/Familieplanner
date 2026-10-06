import type { ReactNode } from 'react';
import { useNav } from '../lib/nav';
import { Icon } from './Icon';

/**
 * De kop van een hoofdscherm: titel, een regel eronder, eventuele acties, en
 * rechtsboven de knop naar het Gezin-scherm (meldingen, breng en haal,
 * instellingen). Op een breed scherm staat dat in de zijbalk, dus daar valt de
 * knop weg.
 */
export function PageHead({
  title,
  sub,
  kicker,
  actions,
}: {
  title: string;
  sub?: ReactNode;
  kicker?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="pagehead">
      <div style={{ minWidth: 0 }}>
        {kicker && <div className="kicker">{kicker}</div>}
        <h1 className="cap">{title}</h1>
        {sub && <p className="page__sub">{sub}</p>}
      </div>
      <div className="row" style={{ flexShrink: 0 }}>
        {actions}
        <GezinButton />
      </div>
    </header>
  );
}

/** De knop naar het Gezin-scherm. Op een breed scherm staat dat in de zijbalk. */
export function GezinButton() {
  const { view, go } = useNav();
  return (
    <button
      className="gezinbtn"
      aria-label="Gezin: breng en haal, instellingen"
      aria-pressed={view === 'gezin'}
      onClick={() => go('gezin')}
    >
      <Icon name="huis" size={21} />
    </button>
  );
}
