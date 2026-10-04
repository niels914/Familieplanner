import { useMemo, useState } from 'react';
import type { CalendarEvent } from '../../shared/types';
import { formatLong, todayInNl } from '../../shared/dates';
import { useData, useStore } from '../lib/store';
import { byDate, euro, sitterCost, sitterHours } from '../lib/events';
import { sitterKey, sitterLabel, sitterOptions } from '../lib/oppas';
import { EventForm } from '../components/EventForm';
import { EmptyState } from '../components/EmptyState';
import { Icon } from '../components/Icon';

type Period = 'komend' | 'maand' | 'vorige' | 'alles';

const PERIOD_LABEL: Record<Period, string> = {
  komend: 'Komend',
  maand: 'Deze maand',
  vorige: 'Vorige maand',
  alles: 'Alles',
};

export function SittersView({ embedded = false }: { embedded?: boolean }) {
  const { events, contacts } = useData();
  const { saveEvent } = useStore();
  const [period, setPeriod] = useState<Period>('komend');
  const [who, setWho] = useState('alle');
  const [editing, setEditing] = useState<CalendarEvent | null>(null);
  const [creating, setCreating] = useState(false);

  const today = todayInNl();
  const month = today.slice(0, 7);
  const previousMonth = useMemo(() => {
    const [y, m] = month.split('-').map(Number);
    const d = new Date(y, m - 2, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }, [month]);

  const all = useMemo(
    () => events.filter((e) => e.category === 'oppas' && e.sitter).sort(byDate),
    [events],
  );

  const options = useMemo(() => sitterOptions(all, contacts), [all, contacts]);

  const list = useMemo(() => {
    let filtered = all;
    if (period === 'komend') filtered = filtered.filter((e) => e.date >= today);
    else if (period === 'maand') filtered = filtered.filter((e) => e.date.startsWith(month));
    else if (period === 'vorige') filtered = filtered.filter((e) => e.date.startsWith(previousMonth));
    if (who !== 'alle') filtered = filtered.filter((e) => sitterKey(e, contacts) === who);
    return period === 'komend' ? filtered : [...filtered].reverse();
  }, [all, contacts, period, who, today, month, previousMonth]);

  const totals = useMemo(() => {
    let hours = 0;
    let cost = 0;
    let unpaid = 0;
    for (const e of list) {
      hours += sitterHours(e.sitter!.start, e.sitter!.end);
      const c = sitterCost(e);
      cost += c;
      if (!e.sitter!.paid) unpaid += c;
    }
    return { hours, cost, unpaid };
  }, [list]);

  const perOppas = useMemo(() => {
    const op = new Map<string, { naam: string; aantal: number; uren: number; bedrag: number; open: number }>();
    for (const e of list) {
      const sleutel = sitterKey(e, contacts);
      const rij = op.get(sleutel) ?? { naam: sitterLabel(e, contacts), aantal: 0, uren: 0, bedrag: 0, open: 0 };
      const kosten = sitterCost(e);
      rij.aantal++;
      rij.uren += sitterHours(e.sitter!.start, e.sitter!.end);
      rij.bedrag += kosten;
      if (!e.sitter!.paid) rij.open += kosten;
      op.set(sleutel, rij);
    }
    return [...op.values()].sort((a, b) => b.bedrag - a.bedrag);
  }, [list, contacts]);

  const togglePaid = (e: CalendarEvent) => {
    void saveEvent({ ...e, sitter: { ...e.sitter!, paid: !e.sitter!.paid } });
  };

  return (
    <div className={`page ${embedded ? 'page--embedded' : ''}`}>
      <div className="page__head">
        <div>
          <h1>Oppas</h1>
          <div className="page__sub">Uren en wat er openstaat.</div>
        </div>
        <button className="btn btn--primary btn--sm" onClick={() => setCreating(true)}>
          + Moment
        </button>
      </div>

      {/* Eén regel: de periode en de oppas als keuzelijsten, in plaats van twee rijen knoppen. */}
      <div className="filterbar">
        <select
          className="select"
          aria-label="Periode"
          value={period}
          onChange={(e) => setPeriod(e.target.value as Period)}
        >
          {(Object.keys(PERIOD_LABEL) as Period[]).map((p) => (
            <option key={p} value={p}>
              {PERIOD_LABEL[p]}
            </option>
          ))}
        </select>
        {options.length > 0 && (
          <select className="select" aria-label="Oppas" value={who} onChange={(e) => setWho(e.target.value)}>
            <option value="alle">Alle oppassen</option>
            {options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        )}
      </div>

      {list.length > 0 && (
        <div className="totals">
          <div className="totals__cell">
            <div className="totals__label">Momenten</div>
            <div className="totals__value">{list.length}</div>
          </div>
          <div className="totals__cell">
            <div className="totals__label">Uren</div>
            <div className="totals__value">
              {totals.hours.toLocaleString('nl-NL', { maximumFractionDigits: 1 })}
            </div>
          </div>
          <div className="totals__cell">
            <div className="totals__label">Totaal</div>
            <div className="totals__value">{euro(totals.cost)}</div>
          </div>
          {totals.unpaid > 0 && (
            <div className="totals__open">
              Nog te betalen <strong>{euro(totals.unpaid)}</strong>
            </div>
          )}
        </div>
      )}

      {/* Bij "alle oppassen" wil je vooral weten wie je nog moet betalen. */}
      {who === 'alle' && perOppas.length > 1 && (
        <div className="stack stack--sm" style={{ marginBottom: 14 }}>
          {perOppas.map((p) => (
            <div key={p.naam} className="row row--between small">
              <strong>{p.naam}</strong>
              <span className="muted">
                {p.aantal} × · {p.uren.toLocaleString('nl-NL', { maximumFractionDigits: 1 })} uur ·{' '}
                {euro(p.bedrag)}
                {p.open > 0 && <span className="chip chip--warn">{euro(p.open)} open</span>}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="list">
        {list.length === 0 ? (
          <EmptyState
            icon="oppas"
            title={
              all.length === 0 ? 'Nog geen oppasmomenten.' : 'Geen oppasmomenten in deze periode.'
            }
            hint={
              all.length === 0
                ? 'Leg het eerste vast, dan houdt de app de uren en wat je moet betalen bij.'
                : undefined
            }
            action={
              all.length === 0 ? (
                <button className="btn btn--primary btn--sm" onClick={() => setCreating(true)}>
                  <Icon name="plus" size={16} /> Oppasmoment toevoegen
                </button>
              ) : undefined
            }
          />
        ) : (
          list.map((e) => {
            const hours = sitterHours(e.sitter!.start, e.sitter!.end);
            return (
              <div key={e.id} className="card card--pad">
                <div className="row row--between" style={{ alignItems: 'flex-start' }}>
                  <button
                    className="grow"
                    style={{ all: 'unset', cursor: 'pointer', flex: 1, minWidth: 0 }}
                    onClick={() => setEditing(e)}
                  >
                    <strong>{sitterLabel(e, contacts) === 'Zonder naam' ? 'Oppas' : sitterLabel(e, contacts)}</strong>
                    <div className="small muted cap">
                      {formatLong(e.date)} · {e.sitter!.start}–{e.sitter!.end} ·{' '}
                      {hours.toLocaleString('nl-NL', { maximumFractionDigits: 1 })} uur
                    </div>
                    {e.title && e.title !== 'Oppas' && (
                      <div className="small muted">{e.title}</div>
                    )}
                  </button>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontWeight: 700 }}>{euro(sitterCost(e))}</div>
                    <button
                      className={`chip chip--knop ${e.sitter!.paid ? 'chip--gezin' : 'chip--warn'}`}
                      aria-pressed={e.sitter!.paid}
                      aria-label={e.sitter!.paid ? 'Betaald, tik om als open te markeren' : 'Open, tik om als betaald te markeren'}
                      onClick={() => togglePaid(e)}
                    >
                      {e.sitter!.paid ? (
                        <>
                          <Icon name="vinkje" size={13} /> betaald
                        </>
                      ) : (
                        'open'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {editing && <EventForm initial={editing} date={editing.date} onClose={() => setEditing(null)} />}
      {creating && (
        <EventForm
          date={today}
          initial={
            {
              title: 'Oppas',
              date: today,
              allDay: true,
              person: 'gezin',
              category: 'oppas',
              bring: [],
              reminder: true,
              sitter: { name: '', start: '18:00', end: '22:00', rate: 0, paid: false },
            } as unknown as CalendarEvent
          }
          onClose={() => setCreating(false)}
        />
      )}
    </div>
  );
}
