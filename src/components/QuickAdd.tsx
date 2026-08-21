import { useMemo, useState } from 'react';
import type { CalendarEvent } from '../../shared/types';
import { CATEGORY_LABEL, PERSON_LABEL } from '../../shared/types';
import { formatLong, todayInNl } from '../../shared/dates';
import { quickParse } from '../lib/quickparse';
import { useStore } from '../lib/store';
import { Modal } from './Modal';
import { EventForm } from './EventForm';

const EXAMPLES = [
  'Matthijs volgende week donderdag lege schoenendoos mee',
  'Amélie morgen knuffel mee',
  'Oppas zaterdag om 19:00',
];

export function QuickAdd({ date, onClose }: { date: string; onClose: () => void }) {
  const { saveEvent } = useStore();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [detailed, setDetailed] = useState<Partial<CalendarEvent> | null>(null);

  const today = todayInNl();
  const parsed = useMemo(
    () => (text.trim() ? quickParse(text, date || today) : null),
    [text, date, today],
  );

  const toEvent = (): Partial<CalendarEvent> | null => {
    if (!parsed) return null;
    return {
      title: parsed.title,
      date: parsed.date,
      time: parsed.time,
      allDay: parsed.allDay,
      person: parsed.person,
      category: parsed.category,
      reminder: true,
      bring: parsed.bring.map((t) => ({ id: crypto.randomUUID(), text: t, done: false })),
    };
  };

  const save = async () => {
    const event = toEvent();
    if (!event) return;
    setBusy(true);
    try {
      await saveEvent(event);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  if (detailed) {
    return (
      <EventForm
        initial={detailed as CalendarEvent}
        date={detailed.date ?? date}
        onClose={onClose}
      />
    );
  }

  return (
    <Modal
      title="Snel toevoegen"
      onClose={onClose}
      footer={
        <>
          <button
            className="btn"
            onClick={() => setDetailed(toEvent() ?? { date })}
          >
            Meer opties
          </button>
          <button className="btn btn--primary grow" onClick={save} disabled={!parsed || busy}>
            {busy ? 'Bezig…' : 'Opslaan'}
          </button>
        </>
      }
    >
      <div className="stack">
        <div className="field">
          <label htmlFor="qa">Typ het gewoon op</label>
          <textarea
            id="qa"
            className="textarea"
            autoFocus
            placeholder="Matthijs volgende week donderdag lege schoenendoos mee"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </div>

        {parsed ? (
          <div className="card card--pad stack stack--sm">
            <div className="row row--wrap">
              <span className={`chip chip--${parsed.person}`}>{PERSON_LABEL[parsed.person]}</span>
              <span className="chip">{CATEGORY_LABEL[parsed.category]}</span>
              {parsed.time && <span className="chip">{parsed.time}</span>}
            </div>
            <div>
              <strong>{parsed.title}</strong>
              <div className="small muted cap">
                {formatLong(parsed.date)}
              </div>
            </div>
            {parsed.bring.length > 0 && (
              <div className="bring">🎒 Meenemen: {parsed.bring.join(', ')}</div>
            )}
          </div>
        ) : (
          <div className="stack stack--sm">
            <div className="small muted">Bijvoorbeeld:</div>
            {EXAMPLES.map((e) => (
              <button key={e} className="btn btn--sm" onClick={() => setText(e)}>
                {e}
              </button>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
