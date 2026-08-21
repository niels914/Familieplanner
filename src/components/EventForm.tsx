import { useMemo, useState } from 'react';
import type { BringItem, CalendarEvent, Category, Contact, PersonId } from '../../shared/types';
import { CATEGORY_LABEL, PERSON_LABEL } from '../../shared/types';
import { Modal } from './Modal';
import { useData, useStore } from '../lib/store';

const PERSONS: PersonId[] = ['matthijs', 'amelie', 'gezin', 'niels', 'irene'];
const CATEGORIES: Category[] = ['school', 'psz', 'oppas', 'afspraak', 'verjaardag', 'vrij', 'anders'];

function emptyEvent(date: string): Partial<CalendarEvent> {
  return {
    title: '',
    date,
    allDay: true,
    person: 'gezin',
    category: 'anders',
    bring: [],
    reminder: true,
  };
}

export function EventForm({
  initial,
  date,
  onClose,
}: {
  initial?: CalendarEvent;
  date: string;
  onClose: () => void;
}) {
  const { saveEvent, deleteEvent, setNotice } = useStore();
  const { contacts } = useData();
  const [draft, setDraft] = useState<Partial<CalendarEvent>>(initial ?? emptyEvent(date));
  const [bringText, setBringText] = useState('');
  const [busy, setBusy] = useState(false);

  const isEditing = Boolean(initial?.id);
  const sitters = useMemo(() => contacts.filter((c: Contact) => c.kind === 'oppas'), [contacts]);
  const isParro = draft.source === 'parro';
  const isSitter = draft.category === 'oppas';

  const set = <K extends keyof CalendarEvent>(key: K, value: CalendarEvent[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const addBring = () => {
    const text = bringText.trim();
    if (!text) return;
    const items: BringItem[] = [
      ...(draft.bring ?? []),
      { id: crypto.randomUUID(), text, done: false },
    ];
    set('bring', items);
    setBringText('');
  };

  const submit = async () => {
    if (!draft.title?.trim()) {
      setNotice('Geef het item een titel.');
      return;
    }
    setBusy(true);
    try {
      await saveEvent({
        ...draft,
        title: draft.title.trim(),
        allDay: !draft.time,
        sitter: isSitter ? draft.sitter : undefined,
      });
      onClose();
    } catch {
      // Foutmelding komt uit de store.
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!initial?.id) return;
    if (!confirm(`"${initial.title}" verwijderen?`)) return;
    setBusy(true);
    try {
      await deleteEvent(initial.id);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title={isEditing ? 'Item bewerken' : 'Nieuw item'}
      onClose={onClose}
      footer={
        <>
          {isEditing && (
            <button className="btn btn--danger" onClick={remove} disabled={busy}>
              Verwijderen
            </button>
          )}
          <button className="btn btn--primary grow" onClick={submit} disabled={busy}>
            {busy ? 'Bezig…' : 'Opslaan'}
          </button>
        </>
      }
    >
      <div className="stack">
        {isParro && (
          <div className="banner banner--info">
            Dit item komt uit Parro. Titel, datum en tijd worden bij elke synchronisatie
            overschreven — je meeneem-lijstje en notitie blijven wel staan.
          </div>
        )}

        <div className="field">
          <label htmlFor="ev-title">Wat</label>
          <input
            id="ev-title"
            className="input"
            value={draft.title ?? ''}
            disabled={isParro}
            placeholder="Bijv. Schoenendoos mee naar school"
            onChange={(e) => set('title', e.target.value)}
          />
        </div>

        <div className="field-row">
          <div className="field">
            <label htmlFor="ev-date">Datum</label>
            <input
              id="ev-date"
              className="input"
              type="date"
              value={draft.date ?? date}
              disabled={isParro}
              onChange={(e) => set('date', e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="ev-time">Tijd (leeg = hele dag)</label>
            <input
              id="ev-time"
              className="input"
              type="time"
              value={draft.time ?? ''}
              disabled={isParro}
              onChange={(e) => set('time', e.target.value || undefined)}
            />
          </div>
        </div>

        <div className="field-row">
          <div className="field">
            <label htmlFor="ev-person">Voor wie</label>
            <select
              id="ev-person"
              className="select"
              value={draft.person ?? 'gezin'}
              onChange={(e) => set('person', e.target.value as PersonId)}
            >
              {PERSONS.map((p) => (
                <option key={p} value={p}>
                  {PERSON_LABEL[p]}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="ev-cat">Soort</label>
            <select
              id="ev-cat"
              className="select"
              value={draft.category ?? 'anders'}
              onChange={(e) => set('category', e.target.value as Category)}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABEL[c]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {isSitter && (
          <div className="card card--pad stack stack--sm">
            <strong className="small">Oppasgegevens</strong>
            <div className="field">
              <label htmlFor="ev-sitter">Wie past op</label>
              <select
                id="ev-sitter"
                className="select"
                value={draft.sitter?.contactId ?? ''}
                onChange={(e) => {
                  const contact = sitters.find((s) => s.id === e.target.value);
                  set('sitter', {
                    contactId: contact?.id,
                    name: contact?.name ?? draft.sitter?.name ?? '',
                    start: draft.sitter?.start ?? draft.time ?? '18:00',
                    end: draft.sitter?.end ?? '22:00',
                    rate: contact?.sitterRate ?? draft.sitter?.rate ?? 0,
                    paid: draft.sitter?.paid ?? false,
                  });
                }}
              >
                <option value="">— naam zelf invullen —</option>
                {sitters.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {!draft.sitter?.contactId && (
              <div className="field">
                <label htmlFor="ev-sitter-name">Naam</label>
                <input
                  id="ev-sitter-name"
                  className="input"
                  value={draft.sitter?.name ?? ''}
                  onChange={(e) =>
                    set('sitter', {
                      start: '18:00',
                      end: '22:00',
                      rate: 0,
                      paid: false,
                      ...draft.sitter,
                      name: e.target.value,
                    })
                  }
                />
              </div>
            )}

            <div className="field-row">
              <div className="field">
                <label htmlFor="ev-start">Van</label>
                <input
                  id="ev-start"
                  className="input"
                  type="time"
                  value={draft.sitter?.start ?? '18:00'}
                  onChange={(e) =>
                    set('sitter', {
                      name: '',
                      end: '22:00',
                      rate: 0,
                      paid: false,
                      ...draft.sitter,
                      start: e.target.value,
                    })
                  }
                />
              </div>
              <div className="field">
                <label htmlFor="ev-end">Tot</label>
                <input
                  id="ev-end"
                  className="input"
                  type="time"
                  value={draft.sitter?.end ?? '22:00'}
                  onChange={(e) =>
                    set('sitter', {
                      name: '',
                      start: '18:00',
                      rate: 0,
                      paid: false,
                      ...draft.sitter,
                      end: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            <div className="field-row">
              <div className="field">
                <label htmlFor="ev-rate">Uurtarief (€)</label>
                <input
                  id="ev-rate"
                  className="input"
                  type="number"
                  min="0"
                  step="0.5"
                  value={draft.sitter?.rate ?? 0}
                  onChange={(e) =>
                    set('sitter', {
                      name: '',
                      start: '18:00',
                      end: '22:00',
                      paid: false,
                      ...draft.sitter,
                      rate: Number(e.target.value),
                    })
                  }
                />
              </div>
              <label className="checkline" style={{ alignSelf: 'end', paddingBottom: 10 }}>
                <input
                  type="checkbox"
                  checked={draft.sitter?.paid ?? false}
                  onChange={(e) =>
                    set('sitter', {
                      name: '',
                      start: '18:00',
                      end: '22:00',
                      rate: 0,
                      ...draft.sitter,
                      paid: e.target.checked,
                    })
                  }
                />
                <span className="small">Al betaald</span>
              </label>
            </div>
          </div>
        )}

        <div className="field">
          <label>Meenemen</label>
          <div className="stack stack--sm">
            {(draft.bring ?? []).map((item) => (
              <div key={item.id} className="row">
                <input
                  type="checkbox"
                  checked={item.done}
                  onChange={() =>
                    set(
                      'bring',
                      (draft.bring ?? []).map((b) =>
                        b.id === item.id ? { ...b, done: !b.done } : b,
                      ),
                    )
                  }
                />
                <span className="grow">{item.text}</span>
                <button
                  className="btn btn--ghost btn--sm"
                  aria-label={`${item.text} verwijderen`}
                  onClick={() =>
                    set(
                      'bring',
                      (draft.bring ?? []).filter((b) => b.id !== item.id),
                    )
                  }
                >
                  ✕
                </button>
              </div>
            ))}
            <div className="row">
              <input
                className="input grow"
                placeholder="Bijv. gymtas, lege schoenendoos"
                value={bringText}
                onChange={(e) => setBringText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addBring();
                  }
                }}
              />
              <button className="btn" onClick={addBring} disabled={!bringText.trim()}>
                Toevoegen
              </button>
            </div>
          </div>
        </div>

        <div className="field">
          <label htmlFor="ev-notes">Notitie</label>
          <textarea
            id="ev-notes"
            className="textarea"
            value={draft.notes ?? ''}
            onChange={(e) => set('notes', e.target.value)}
          />
        </div>

        <label className="checkline">
          <input
            type="checkbox"
            checked={draft.reminder ?? true}
            onChange={(e) => set('reminder', e.target.checked)}
          />
          <span className="small">Meenemen in de herinnering van de avond ervoor</span>
        </label>
      </div>
    </Modal>
  );
}
