/**
 * Gezin: wat je zelden nodig hebt maar wel moet kunnen vinden. Het staat
 * achter de knop rechtsboven op elk hoofdscherm, zodat de balk onderin vrij
 * blijft voor wat je dagelijks gebruikt.
 */

import { useNav, type View } from '../lib/nav';
import { Icon, type IconName } from '../components/Icon';
import { PageHead } from '../components/PageHead';

const LINKS: Array<{ id: View; label: string; hint: string; icon: IconName }> = [
  { id: 'brengen', label: 'Breng & haal', hint: 'Wie brengt en wie haalt', icon: 'auto' },
  {
    id: 'instellingen',
    label: 'Instellingen',
    hint: 'Meldingen, agenda’s, uitloggen',
    icon: 'instellingen',
  },
];

export function GezinView() {
  const { go } = useNav();
  return (
    <div className="page">
      <PageHead title="Gezin" />
      <div className="card" style={{ overflow: 'hidden' }}>
        {LINKS.map((link) => (
          <button key={link.id} type="button" className="rowlink" onClick={() => go(link.id)}>
            <span className="rowlink__ico">
              <Icon name={link.icon} size={19} />
            </span>
            <span className="grow">
              <div className="rowlink__t">{link.label}</div>
              <div className="rowlink__s">{link.hint}</div>
            </span>
            <Icon name="chevron-rechts" size={17} />
          </button>
        ))}
      </div>
    </div>
  );
}
