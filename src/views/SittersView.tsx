import { useMemo, useState } from 'react';
import type { CalendarEvent } from '../../shared/types';
import { formatLong, todayInNl } from '../../shared/dates';
import { useData, useStore } from '../lib/store';
import { byDate, euro, sitterCost, sitterHours } from '../lib/events';
import { EventForm } from '../components/EventForm';

type Period = 'komend' | 'maand' | 'vorige' | 'alles';

const PERIOD_LABEL: Record<Period, string> = {
  komend: 'Komend',
  maand: 'Deze maand',
  vorige: 'Vorige maand',
  alles: 'Alles',
};

export function SittersView() {
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

  const names = useMemo(() => {
    const set = new Set<string>();
    for (const e of all) if (e.sitter?.name) set.add(e.sitter.name);
    for (const c of contacts) if (c.kind === 'oppas') set.add(c.name);
    return [...set].sort((a, b) => a.localeCompare(b, 'nl'));
  }, [all, contacts]);

  const list = useMemo(() => {
    let filtered = all;
    if (period === 'komend') filtered = filtered.filter((e) => e.date >= today);
    else if (period === 'maand') filtered = filtered.filter((e) => e.date.startsWith(month));
    else if (period === 'vorige') filtered = filtered.filter((e) => e.date.startsWith(previousMonth));
    if (who !== 'alle') filtered = filtered.filter((e) => e.sitter?.name === who);
    return period === 'komend' ? filtered : [...filtered].reverse();
  }, [all, period, who, today, month, previousMonth]);

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

  const togglePaid = (e: CalendarEvent) => {
    void saveEvent({ ...e, sitter: { ...e.sitter!, paid: !e.sitter!.paid } });
  };

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <h1>Oppas</h1>
          <div className="page__sub">Alle oppasmomenten, uren en wat er nog openstaat.</div>
        </div>
        <button className="btn btn--primary btn--sm" onClick={() => setCreating(true)}>
          + Moment
        </button>
      </div>

      <div className="filters">
        {(Object.keys(PERIOD_LABEL) as Period[]).map((p) => (
          <button key={p} className="filter" aria-pressed={period === p} onClick={() => setPeriod(p)}>
            {PERIOD_LABEL[p]}
          </button>
        ))}
      </div>

      {names.length > 0 && (
        <select
          className="select"
          value={who}
          onChange={(e) => setWho(e.target.value)}
          style={{ marginBottom: 14 }}
        >
          <option value="alle">Alle oppassen</option>
          {names.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      )}

      {list.length > 0 && (
        <div className="total" style={{ marginBottom: 14 }}>
          <div>
            <div className="tiny">
              {list.length} moment{list.length === 1 ? '' : 'en'} ·{' '}
              {totals.hours.toLocaleString('nl-NL', { maximumFractionDigits: 1 })} uur
            </div>
            {totals.unpaid > 0 && <div className="tiny">nog te betalen: {euro(totals.unpaid)}</div>}
          </div>
          <div className="total__amount">{euro(totals.cost)}</div>
        </div>
      )}

      <div className="list">
        {list.length === 0 ? (
          <div className="empty">Geen oppasmomenten in deze periode.</div>
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
                    <strong>{e.sitter!.name || 'Oppas'}</strong>
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
                      className={`chip ${e.sitter!.paid ? 'chip--gezin' : 'chip--warn'}`}
                      style={{ border: 0, cursor: 'pointer', marginTop: 4 }}
                      onClick={() => togglePaid(e)}
                    >
                      {e.sitter!.paid ? '✓ betaald' : 'open'}
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
