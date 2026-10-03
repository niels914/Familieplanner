import { DEFAULT_HOME_TIME } from '../../shared/signals';
import { useEffect, useState } from 'react';
import type { ChildId } from '../../shared/types';
import { CHILDREN, PERSON_LABEL } from '../../shared/types';
import { useData, useStore } from '../lib/store';
import { api } from '../lib/api';
import {
  currentSubscription,
  disablePush,
  enablePush,
  isIos,
  isStandalone,
  pushSupported,
} from '../lib/push';

export function SettingsView({ onLogout }: { onLogout: () => void }) {
  const { settings, push, parroConfigured } = useData();
  const { saveSettings, syncParro, setNotice } = useStore();
  const [subscribed, setSubscribed] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void currentSubscription().then((s) => setSubscribed(Boolean(s)));
  }, []);

  const togglePush = async () => {
    setBusy(true);
    try {
      if (subscribed) {
        await disablePush();
        setSubscribed(false);
        setNotice('Meldingen uitgezet op dit toestel.');
      } else {
        await enablePush(push.publicKey, deviceLabel());
        setSubscribed(true);
        setNotice('Meldingen staan aan op dit toestel.');
      }
    } catch (err) {
      setNotice((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const sync = async () => {
    setBusy(true);
    try {
      setNotice(await syncParro());
    } catch (err) {
      setNotice((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const logout = async () => {
    await api.post('logout');
    onLogout();
  };

  const iosNeedsInstall = isIos() && !isStandalone();

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <h1>Instellingen</h1>
          <div className="page__sub">Meldingen, schoolagenda en oppasinformatie.</div>
        </div>
      </div>

      <div className="stack">
        {/* ---------------------------------------------------- meldingen */}
        <div className="card card--pad stack stack--sm">
          <strong>Herinneringen</strong>
          <p className="small muted">
            Elke avond één bericht met alles van morgen, inclusief wat er mee moet.
          </p>

          {!push.configured && (
            <div className="banner">
              Er zijn nog geen VAPID-sleutels ingesteld in Netlify. Zonder die sleutels kan de
              app geen meldingen versturen — zie de README.
            </div>
          )}

          {iosNeedsInstall && (
            <div className="banner">
              Op de iPhone werken meldingen alleen als je de app eerst op je beginscherm zet:
              deelknop → <em>Zet op beginscherm</em>.
            </div>
          )}

          {!pushSupported() && (
            <div className="banner">Deze browser ondersteunt geen meldingen.</div>
          )}

          <div className="row row--between">
            <span className="small">
              Meldingen op dit toestel: <strong>{subscribed ? 'aan' : 'uit'}</strong>
            </span>
            <button
              className={subscribed ? 'btn btn--sm' : 'btn btn--primary btn--sm'}
              onClick={togglePush}
              disabled={busy || !push.configured || !pushSupported() || subscribed === null}
            >
              {subscribed ? 'Uitzetten' : 'Aanzetten'}
            </button>
          </div>

          <div className="field">
            <label htmlFor="hour">Tijdstip van de avondherinnering</label>
            <select
              id="hour"
              className="select"
              value={settings.reminderHour}
              onChange={(e) => void saveSettings({ reminderHour: Number(e.target.value) })}
            >
              {[16, 17, 18, 19, 20, 21, 22].map((h) => (
                <option key={h} value={h}>
                  {String(h).padStart(2, '0')}:00
                </option>
              ))}
            </select>
          </div>

          {subscribed && (
            <button
              className="btn btn--sm"
              disabled={busy}
              onClick={async () => {
                const sub = await currentSubscription();
                const r = await api.post<{ sent: number }>('push/test', { endpoint: sub?.endpoint });
                setNotice(
                  r.sent > 0
                    ? 'Testbericht naar deze telefoon gestuurd.'
                    : 'Dit toestel is niet aangemeld; zet meldingen opnieuw aan.',
                );
              }}
            >
              Stuur een testbericht
            </button>
          )}
        </div>

        {/* ------------------------------------------------ thuiskomst */}
        <div className="card card--pad stack stack--sm">
          <strong>Normale thuiskomst</strong>
          <p className="small muted">
            Wanneer jullie doordeweeks meestal thuis zijn. Zet je een "later thuis" in de agenda,
            dan rekenen we vanaf dit tijdstip tot het uur dat je opgeeft. Daarmee ziet de app
            wanneer jullie allebei weg zijn.
          </p>
          <div className="field" style={{ maxWidth: 160 }}>
            <label htmlFor="home-time">Thuis om</label>
            <input
              id="home-time"
              className="input"
              type="time"
              value={settings.homeTime ?? DEFAULT_HOME_TIME}
              onChange={(e) => {
                if (e.target.value) void saveSettings({ homeTime: e.target.value }).catch(() => {});
              }}
            />
          </div>
        </div>

        {/* -------------------------------------------------------- parro */}
        <div className="card card--pad stack stack--sm">
          <strong>Schoolagenda (Parro)</strong>
          {parroConfigured ? (
            <>
              <p className="small muted">
                De agenda wordt elke drie uur automatisch opgehaald. Items uit Parro herken je
                aan het label; je meeneem-lijstjes blijven bij een synchronisatie staan.
              </p>
              <div className="small muted">
                {settings.parroLastSync
                  ? `Laatste keer: ${new Date(settings.parroLastSync).toLocaleString('nl-NL')}`
                  : 'Nog niet gesynchroniseerd.'}
                {settings.parroLastResult && ` — ${settings.parroLastResult}`}
              </div>
              <button className="btn btn--sm" onClick={sync} disabled={busy}>
                {busy ? 'Bezig…' : 'Nu ophalen'}
              </button>
            </>
          ) : (
            <div className="banner">
              De omgevingsvariabele <code>PARRO_ICS_URL</code> is nog niet ingesteld in Netlify.
            </div>
          )}

          <div className="field">
            <label htmlFor="parro-person">Parro-items horen bij</label>
            <select
              id="parro-person"
              className="select"
              value={settings.parroPerson ?? 'matthijs'}
              onChange={(e) => void saveSettings({ parroPerson: e.target.value as ChildId })}
            >
              {CHILDREN.map((c) => (
                <option key={c} value={c}>
                  {PERSON_LABEL[c]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ------------------------------------------------ oppasbriefing */}
        <div className="card card--pad stack stack--sm">
          <strong>Informatie voor de oppas</strong>
          <p className="small muted">
            Bedtijden, allergieën, noodnummers — staat klaar als je het snel moet doorgeven.
          </p>
          <textarea
            className="textarea"
            style={{ minHeight: 140 }}
            defaultValue={settings.sitterBriefing ?? ''}
            placeholder={
              'Matthijs naar bed om 19:00, Amélie om 18:45.\n' +
              'Huisarts: \nNoodnummer Niels: \nNoodnummer Irene: '
            }
            onBlur={(e) => {
              if (e.target.value === (settings.sitterBriefing ?? '')) return;
              void saveSettings({ sitterBriefing: e.target.value });
            }}
          />
        </div>

        <button className="btn btn--danger btn--block" onClick={logout}>
          Uitloggen
        </button>
      </div>
    </div>
  );
}

function deviceLabel(): string {
  const ua = navigator.userAgent;
  if (/iphone/i.test(ua)) return 'iPhone';
  if (/ipad/i.test(ua)) return 'iPad';
  if (/android/i.test(ua)) return 'Android-telefoon';
  if (/mac/i.test(ua)) return 'Mac';
  if (/windows/i.test(ua)) return 'Windows-pc';
  return 'Toestel';
}
