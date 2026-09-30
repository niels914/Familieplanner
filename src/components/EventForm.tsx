import { useMemo, useState } from 'react';
import type {
  BringItem,
  CalendarEvent,
  Category,
  PersonId,
  SitterDetails,
} from '../../shared/types';
import { CATEGORY_LABEL } from '../../shared/types';
import { Modal } from './Modal';
import { ChipPicker, type ChipOption } from './ChipPicker';
import { CATEGORY_ICON } from './EventBody';
import { useData, useStore } from '../lib/store';
import { euro, sitterHours } from '../lib/events';
import { Icon } from './Icon';

const PERSON_OPTIONS: ChipOption<PersonId>[] = [
  { value: 'matthijs', label: 'Matthijs', modifier: 'matthijs' },
  { value: 'amelie', label: 'Amélie', modifier: 'amelie' },
  { value: 'lotte', label: 'Lotte', modifier: 'lotte' },
  { value: 'gezin', label: 'Gezin' },
  { value: 'niels', label: 'Niels', modifier: 'ouder' },
  { value: 'irene', label: 'Irene', modifier: 'ouder' },
];

const CATEGORY_OPTIONS: ChipOption<Category>[] = (
  ['school', 'psz', 'opvang', 'oppas', 'afspraak', 'verjaardag', 'vrij', 'anders'] as Category[]
).map((c) => ({ value: c, label: CATEGORY_LABEL[c], icon: CATEGORY_ICON[c] }));

const STANDAARD_TIJDEN = ['08:30', '12:00', '15:00', '18:00'];

const LEGE_OPPAS: SitterDetails = { name: '', start: '18:00', end: '22:00', rate: 0, paid: false };

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
  const { contacts, events } = useData();
  const [draft, setDraft] = useState<Partial<CalendarEvent>>(initial ?? emptyEvent(date));
  const [bringText, setBringText] = useState('');
  const [eigenNaam, setEigenNaam] = useState(!initial?.sitter?.contactId);
  const [busy, setBusy] = useState(false);

  const isEditing = Boolean(initial?.id);
  const isParro = draft.source === 'parro';
  const isSitter = draft.category === 'oppas';
  const heeftTijd = Boolean(draft.time);

  const sitters = useMemo(() => contacts.filter((c) => c.kind === 'oppas'), [contacts]);

  /** Tijden die jullie zelf het vaakst gebruiken, als snelkeuze. */
  const veelgebruikteTijden = useMemo(() => {
    const telling = new Map<string, number>();
    for (const e of events) {
      if (e.time) telling.set(e.time, (telling.get(e.time) ?? 0) + 1);
    }
    const top = [...telling.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 4)
      .map(([tijd]) => tijd);
    return (top.length >= 3 ? top : STANDAARD_TIJDEN).sort();
  }, [events]);

  const set = <K extends keyof CalendarEvent>(key: K, value: CalendarEvent[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const setSitter = (patch: Partial<SitterDetails>) =>
    setDraft((d) => ({ ...d, sitter: { ...LEGE_OPPAS, ...d.sitter, ...patch } }));

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

  const uren = draft.sitter ? sitterHours(draft.sitter.start, draft.sitter.end) : 0;

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

        <div className="field">
          <label htmlFor="ev-date">Wanneer</label>
          <input
            id="ev-date"
            className="input"
            type="date"
            value={draft.date ?? date}
            disabled={isParro}
            onChange={(e) => set('date', e.target.value)}
          />

          <div className="segmented" role="group" aria-label="Hele dag of een tijdstip">
            <button
              type="button"
              aria-pressed={!heeftTijd}
              disabled={isParro}
              onClick={() => set('time', undefined)}
            >
              Hele dag
            </button>
            <button
              type="button"
              aria-pressed={heeftTijd}
              disabled={isParro}
              onClick={() => set('time', draft.time ?? veelgebruikteTijden[0])}
            >
              Tijdstip
            </button>
          </div>

          {heeftTijd && (
            <div className="row row--wrap" style={{ marginTop: 2 }}>
              <input
                className="input"
                style={{ width: 152 }}
                type="time"
                aria-label="Tijdstip"
                value={draft.time ?? ''}
                disabled={isParro}
                onChange={(e) => set('time', e.target.value || undefined)}
              />
              <div className="picks">
                {veelgebruikteTijden.map((t) => (
                  <button
                    key={t}
                    type="button"
                    className="pick"
                    aria-pressed={draft.time === t}
                    disabled={isParro}
                    onClick={() => set('time', t)}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <ChipPicker
          label="Voor wie"
          value={draft.person ?? 'gezin'}
          options={PERSON_OPTIONS}
          onChange={(v) => set('person', v)}
        />

        <ChipPicker
          label="Soort"
          value={draft.category ?? 'anders'}
          options={CATEGORY_OPTIONS}
          onChange={(v) =>
            setDraft((d) => ({
              ...d,
              category: v,
              // Meteen de standaardtijden zetten, anders staat er 18:00–22:00 in
              // beeld terwijl het item zonder oppasgegevens opgeslagen zou worden.
              sitter: v === 'oppas' ? (d.sitter ?? { ...LEGE_OPPAS }) : d.sitter,
            }))
          }
        />

        {isSitter && (
          <div className="card card--pad stack stack--sm">
            <strong className="small">Oppasgegevens</strong>

            {sitters.length > 0 && (
              <div className="picks">
                {sitters.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className="pick"
                    aria-pressed={draft.sitter?.contactId === s.id}
                    onClick={() => {
                      setEigenNaam(false);
                      setSitter({ contactId: s.id, name: s.name, rate: s.sitterRate ?? 0 });
                    }}
                  >
                    {s.name}
                  </button>
                ))}
                <button
                  type="button"
                  className="pick"
                  aria-pressed={eigenNaam}
                  onClick={() => {
                    setEigenNaam(true);
                    setSitter({ contactId: undefined });
                  }}
                >
                  Anders…
                </button>
              </div>
            )}

            {(eigenNaam || sitters.length === 0) && (
              <input
                className="input"
                placeholder="Naam van de oppas"
                aria-label="Naam van de oppas"
                value={draft.sitter?.name ?? ''}
                onChange={(e) => setSitter({ name: e.target.value })}
              />
            )}

            <div className="field-row">
              <div className="field">
                <label htmlFor="ev-start">Van</label>
                <input
                  id="ev-start"
                  className="input"
                  type="time"
                  value={draft.sitter?.start ?? LEGE_OPPAS.start}
                  onChange={(e) => setSitter({ start: e.target.value })}
                />
              </div>
              <div className="field">
                <label htmlFor="ev-end">Tot</label>
                <input
                  id="ev-end"
                  className="input"
                  type="time"
                  value={draft.sitter?.end ?? LEGE_OPPAS.end}
                  onChange={(e) => setSitter({ end: e.target.value })}
                />
              </div>
            </div>

            <div className="row row--wrap">
              <div className="field" style={{ width: 104 }}>
                <label htmlFor="ev-rate">€ per uur</label>
                <input
                  id="ev-rate"
                  className="input"
                  type="number"
                  min="0"
                  step="0.5"
                  value={draft.sitter?.rate ?? 0}
                  onChange={(e) => setSitter({ rate: Number(e.target.value) })}
                />
              </div>
              <span className="small muted grow" style={{ paddingTop: 18 }}>
                {uren.toLocaleString('nl-NL', { maximumFractionDigits: 1 })} uur ·{' '}
                <strong>{euro(uren * (draft.sitter?.rate ?? 0))}</strong>
              </span>
              <button
                type="button"
                className="pick"
                style={{ marginTop: 16 }}
                aria-pressed={draft.sitter?.paid ?? false}
                onClick={() => setSitter({ paid: !draft.sitter?.paid })}
              >
                <Icon name="vinkje" size={15} /> Betaald
              </button>
            </div>
          </div>
        )}

        <div className="field">
          <span className="field__label">Meenemen</span>
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
                  <Icon name="kruis" size={16} />
                </button>
              </div>
            ))}
            <div className="row">
              <input
                className="input grow"
                placeholder="Bijv. gymtas, lege schoenendoos"
                aria-label="Wat moet er mee"
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
