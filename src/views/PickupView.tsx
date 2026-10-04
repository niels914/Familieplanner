import { useMemo, useState } from 'react';
import type { ChildId, PickupRule, Weekday } from '../../shared/types';
import { CHILDREN, PERSON_LABEL } from '../../shared/types';
import { addDays, formatLong, isoWeekday, todayInNl } from '../../shared/dates';
import { useData, useStore } from '../lib/store';
import { pickupForDate } from '../lib/events';
import { Avatar } from '../components/Avatar';
import { Icon } from '../components/Icon';

const WEEKDAYS: Weekday[] = [1, 2, 3, 4, 5];
const WEEKDAY_LABEL: Record<Weekday, string> = { 1: 'ma', 2: 'di', 3: 'wo', 4: 'do', 5: 'vr' };
const SUGGESTIONS = ['Niels', 'Irene', 'Opa & oma', 'Oppas', 'BSO', 'Overblijf'];

export function PickupView() {
  const { pickupRules, pickupOverrides } = useData();
  const { savePickupRules, savePickupOverride, deletePickupOverride } = useStore();
  const [tab, setTab] = useState<'schema' | 'afwijkingen'>('schema');

  const today = todayInNl();

  const ruleFor = (child: ChildId, weekday: Weekday): PickupRule | undefined =>
    pickupRules.find((r) => r.child === child && r.weekday === weekday);

  const setRule = (child: ChildId, weekday: Weekday, patch: Partial<PickupRule>) => {
    const existing = ruleFor(child, weekday);
    const next = pickupRules.filter((r) => !(r.child === child && r.weekday === weekday));
    const merged: PickupRule = {
      id: existing?.id ?? crypto.randomUUID(),
      child,
      weekday,
      dropoff: existing?.dropoff,
      pickup: existing?.pickup,
      note: existing?.note,
      ...patch,
    };
    if (merged.dropoff || merged.pickup || merged.note) next.push(merged);
    void savePickupRules(next);
  };

  const upcoming = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => addDays(today, i)).filter((d) => isoWeekday(d) <= 5),
    [today],
  );

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <h1>Breng & haal</h1>
          <div className="page__sub">Wie brengt, wie haalt — en de afwijkingen daarop.</div>
        </div>
      </div>

      <datalist id="wie-suggesties">
        {SUGGESTIONS.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>

      <div className="segmented" role="group" aria-label="Weergave" style={{ marginBottom: 14 }}>
        <button aria-pressed={tab === 'schema'} onClick={() => setTab('schema')}>
          Vast schema
        </button>
        <button aria-pressed={tab === 'afwijkingen'} onClick={() => setTab('afwijkingen')}>
          Twee weken
        </button>
      </div>

      {tab === 'schema' ? (
        <div className="stack">
          {CHILDREN.map((child) => (
            <div key={child} className="card card--pad stack stack--sm">
              <div className="row row--between">
                <strong>{PERSON_LABEL[child]}</strong>
                <span className="small muted">brengen / halen</span>
              </div>
              <div className="weekgrid">
                {WEEKDAYS.map((wd) => {
                  const rule = ruleFor(child, wd);
                  return (
                    <div key={wd} className="weekgrid__row">
                      <span className="weekgrid__day">{WEEKDAY_LABEL[wd]}</span>
                      <input
                        className="input"
                        list="wie-suggesties"
                        placeholder="brengen"
                        defaultValue={rule?.dropoff ?? ''}
                        onBlur={(e) => {
                          if (e.target.value === (rule?.dropoff ?? '')) return;
                          setRule(child, wd, { dropoff: e.target.value || undefined });
                        }}
                      />
                      <input
                        className="input"
                        list="wie-suggesties"
                        placeholder="halen"
                        defaultValue={rule?.pickup ?? ''}
                        onBlur={(e) => {
                          if (e.target.value === (rule?.pickup ?? '')) return;
                          setRule(child, wd, { pickup: e.target.value || undefined });
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          <p className="small muted">
            Wijzigingen worden opgeslagen zodra je uit een veld klikt. Laat een veld leeg als er
            die dag niets geregeld hoeft te worden.
          </p>
        </div>
      ) : (
        <div className="stack stack--sm">
          {upcoming.map((date) => {
            const entries = pickupForDate(date, pickupRules, pickupOverrides);
            return (
              <div key={date} className="card card--pad stack stack--sm">
                <div className="row row--between">
                  <strong className="small cap">
                    {formatLong(date)}
                  </strong>
                  {date === today && <span className="chip chip--gezin">vandaag</span>}
                </div>
                {CHILDREN.map((child) => {
                  const entry = entries.find((e) => e.child === child);
                  const override = pickupOverrides.find(
                    (o) => o.date === date && o.child === child,
                  );
                  return (
                    <div key={child} className="weekgrid__row" style={{ gridTemplateColumns: '78px 1fr 1fr 32px' }}>
                      <span className={`chip chip--${child}`}>
                        <Avatar who={child} size={18} /> {PERSON_LABEL[child]}
                      </span>
                      <input
                        className="input"
                        list="wie-suggesties"
                        placeholder="brengen"
                        defaultValue={entry?.dropoff ?? ''}
                        key={`${date}-${child}-d-${override?.id ?? 'none'}`}
                        onBlur={(e) => {
                          if (e.target.value === (entry?.dropoff ?? '')) return;
                          void savePickupOverride({
                            date,
                            child,
                            dropoff: e.target.value || undefined,
                            pickup: entry?.pickup,
                          });
                        }}
                      />
                      <input
                        className="input"
                        list="wie-suggesties"
                        placeholder="halen"
                        defaultValue={entry?.pickup ?? ''}
                        key={`${date}-${child}-p-${override?.id ?? 'none'}`}
                        onBlur={(e) => {
                          if (e.target.value === (entry?.pickup ?? '')) return;
                          void savePickupOverride({
                            date,
                            child,
                            dropoff: entry?.dropoff,
                            pickup: e.target.value || undefined,
                          });
                        }}
                      />
                      {override ? (
                        <button
                          className="btn btn--ghost btn--sm"
                          title="Terug naar het vaste schema"
                          onClick={() => void deletePickupOverride(override.id)}
                        >
                          <Icon name="terugdraaien" size={16} />
                        </button>
                      ) : (
                        <span />
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
