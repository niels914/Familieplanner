/**
 * Op de iPhone vraagt de browser nooit zelf of je een web-app wilt
 * installeren, zoals Android dat doet. Zonder deze uitleg weet niemand dat
 * het kan.
 *
 * Verschijnt alleen op iOS, alleen in de browser (niet in de al
 * geïnstalleerde app), en blijft weg zodra je hem wegtikt.
 */

import { useState } from 'react';
import { isIos, isStandalone } from '../lib/push';
import { Icon } from './Icon';

const SLEUTEL = 'fp_installhint_weg';

function alWeggetikt(): boolean {
  try {
    return localStorage.getItem(SLEUTEL) === '1';
  } catch {
    return false;
  }
}

export function InstallHint({ voorInloggen = false }: { voorInloggen?: boolean }) {
  const [zichtbaar, setZichtbaar] = useState(
    () => isIos() && !isStandalone() && !alWeggetikt(),
  );

  if (!zichtbaar) return null;

  const wegtikken = () => {
    setZichtbaar(false);
    try {
      localStorage.setItem(SLEUTEL, '1');
    } catch {
      // Privémodus: dan komt hij de volgende keer gewoon terug.
    }
  };

  return (
    <aside className="installhint" aria-label="App installeren">
      <img className="installhint__icoon" src="/icon-180.png" alt="" width="44" height="44" />
      <div className="grow">
        <strong>Zet de Familieplanner op je beginscherm</strong>
        <ol className="installhint__stappen">
          <li>
            Tik op <Icon name="delen" size={17} label="de deelknop" /> <em>Deel</em>
            <span className="installhint__sub">
              Zie je die niet? Tik dan eerst{' '}
              <span className="nowrap">
                op <Icon name="meer" size={17} label="het menu" />
              </span>
            </span>
          </li>
          <li>
            Kies <Icon name="plusvak" size={17} /> <em>Zet op beginscherm</em>
          </li>
        </ol>
        {voorInloggen ? (
          <p className="installhint__noot">
            Doe dit vóór het inloggen: de app op je beginscherm deelt geen login met Safari.
          </p>
        ) : (
          <p className="installhint__noot">
            Dan werkt hij als een gewone app, met meldingen de avond ervoor. Je logt daar één keer
            opnieuw in.
          </p>
        )}
      </div>
      <button className="btn btn--ghost btn--sm" onClick={wegtikken} aria-label="Niet meer tonen">
        <Icon name="kruis" size={16} />
      </button>
    </aside>
  );
}
