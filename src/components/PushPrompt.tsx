/**
 * Meldingen aanzetten, zonder dat je ze in Instellingen hoeft te zoeken.
 *
 * Apple en Google laten een app nooit zelf meldingen aanzetten: het moet een
 * tik van jou zijn, op elk toestel apart. Deze kaart maakt dat die ene tik
 * voor de hand ligt, en stuurt daarna meteen een testbericht naar alleen dit
 * toestel — zodat je ziet dat het werkt, zonder dat de telefoon van de ander
 * meepiept.
 */

import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useData, useStore } from '../lib/store';
import {
  currentSubscription,
  enablePush,
  isIos,
  isStandalone,
  pushSupported,
} from '../lib/push';
import { Icon } from './Icon';

const SLEUTEL = 'fp_pushprompt_weg';

type Staat = 'onbekend' | 'vragen' | 'geweigerd' | 'klaar';

export function PushPrompt() {
  const { push, settings } = useData();
  const { setNotice } = useStore();
  const [staat, setStaat] = useState<Staat>('onbekend');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let weg = false;
    try {
      weg = localStorage.getItem(SLEUTEL) === '1';
    } catch {
      /* privémodus */
    }
    // Op de iPhone kan het alleen vanaf het beginscherm; daar zorgt de
    // installatiehint voor.
    if (weg || !push.configured || !pushSupported() || (isIos() && !isStandalone())) {
      setStaat('klaar');
      return;
    }
    if (Notification.permission === 'denied') {
      setStaat('geweigerd');
      return;
    }
    void currentSubscription().then((sub) => setStaat(sub ? 'klaar' : 'vragen'));
  }, [push.configured]);

  if (staat === 'onbekend' || staat === 'klaar') return null;

  const wegtikken = () => {
    setStaat('klaar');
    try {
      localStorage.setItem(SLEUTEL, '1');
    } catch {
      /* dan komt hij terug; niet erg */
    }
  };

  const aanzetten = async () => {
    setBusy(true);
    try {
      await enablePush(push.publicKey, toestelNaam());
      const sub = await currentSubscription();
      await api.post('push/test', { endpoint: sub?.endpoint });
      setNotice('Meldingen staan aan. Er komt nu een testbericht.');
      setStaat('klaar');
    } catch (err) {
      if (typeof Notification !== 'undefined' && Notification.permission === 'denied') {
        setStaat('geweigerd');
      } else {
        setNotice((err as Error).message);
      }
    } finally {
      setBusy(false);
    }
  };

  const uur = String(settings.reminderHour ?? 19).padStart(2, '0');

  return (
    <aside className="pushprompt" aria-label="Meldingen">
      <span className="pushprompt__icoon" aria-hidden="true">
        <Icon name="bel" size={20} />
      </span>
      <div className="grow">
        {staat === 'vragen' ? (
          <>
            <strong>Herinneringen op deze telefoon</strong>
            <p className="pushprompt__tekst">
              Elke avond om {uur}:00 wat er morgen is en wat er mee moet.
            </p>
            <button className="btn btn--primary btn--sm" onClick={aanzetten} disabled={busy}>
              {busy ? 'Bezig…' : 'Meldingen aanzetten'}
            </button>
          </>
        ) : (
          <>
            <strong>Meldingen staan uit</strong>
            <p className="pushprompt__tekst">
              {isIos()
                ? 'Zet ze aan via Instellingen › Meldingen › Familieplanner.'
                : 'Zet ze aan via het slotje naast het adres, bij Meldingen.'}
            </p>
          </>
        )}
      </div>
      <button className="btn btn--ghost btn--sm" onClick={wegtikken} aria-label="Niet meer tonen">
        <Icon name="kruis" size={16} />
      </button>
    </aside>
  );
}

function toestelNaam(): string {
  const ua = navigator.userAgent;
  if (/iphone/i.test(ua)) return 'iPhone';
  if (/ipad/i.test(ua) || isIos()) return 'iPad';
  if (/android/i.test(ua)) return 'Android-telefoon';
  if (/mac/i.test(ua)) return 'Mac';
  if (/windows/i.test(ua)) return 'Windows-pc';
  return 'Toestel';
}
