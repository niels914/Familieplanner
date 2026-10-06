/**
 * Een foto of tekst laten uitlezen: een schermafbeelding van een mail, een kaartje,
 * een bon. De app stuurt het naar de uitleesdienst en toont wat ze vond als voorstellen.
 * Niets komt in de agenda voordat jij het bekijkt en bewaart.
 */

import { useEffect, useRef, useState } from 'react';
import type { CalendarEvent, PersonId, Receipt, TaskOwner } from '../../shared/types';
import { CATEGORY_LABEL, PERSON_LABEL } from '../../shared/types';
import { formatLong, todayInNl } from '../../shared/dates';
import { peopleOf } from '../../shared/people';
import type { EventProposal, Proposal, ReceiptProposal, ReadResult, TaskProposal } from '../../shared/lezen';
import { bedrag } from '../lib/bonnetjes';
import { prepareFile, type PreparedFile } from '../lib/image';
import { readInput } from '../lib/lezen';
import { shortDate } from '../lib/regelen';
import { useStore } from '../lib/store';
import { Avatar } from './Avatar';
import { ChipPicker, type ChipOption } from './ChipPicker';
import { EventForm } from './EventForm';
import { Icon } from './Icon';
import { Modal } from './Modal';
import { ReceiptSheet } from './ReceiptSheet';

const MAX_PHOTOS = 3;

const OWNERS: ChipOption<TaskOwner>[] = [
  { value: 'niels', label: 'Niels', modifier: 'ouder', avatar: 'niels' },
  { value: 'irene', label: 'Irene', modifier: 'ouder', avatar: 'irene' },
  { value: 'samen', label: 'Samen afstemmen' },
];

/** Een voorstel als concept-item voor het formulier. Zonder id, dus het wordt nieuw. */
function eventDraft(p: EventProposal): Partial<CalendarEvent> {
  return {
    title: p.title,
    date: p.date,
    allDay: !p.time,
    time: p.time,
    endTime: p.endTime,
    location: p.location,
    person: p.person,
    others: p.others,
    category: p.category,
    notes: p.notes,
    bring: p.bring.map((text) => ({ id: crypto.randomUUID(), text, done: false })),
    reminder: true,
  };
}

const receiptDraft = (p: ReceiptProposal): Partial<Receipt> => ({
  title: p.title,
  store: p.store,
  purchaseDate: p.purchaseDate,
  amountCents: p.amountCents,
  warrantyMonths: p.warrantyMonths,
  returnUntil: p.returnUntil,
});

export function ReadSheet({ onClose }: { onClose: () => void }) {
  const { saveTask, setNotice } = useStore();
  const fileInput = useRef<HTMLInputElement>(null);

  const [photos, setPhotos] = useState<PreparedFile[]>([]);
  const [text, setText] = useState('');
  const [preparing, setPreparing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [result, setResult] = useState<ReadResult | null>(null);
  const [done, setDone] = useState<Set<number>>(new Set());
  const [owners, setOwners] = useState<Record<number, TaskOwner>>({});
  const [editing, setEditing] = useState<number | null>(null);

  // De voorbeelden van de foto's opruimen als het blad dicht gaat.
  const photosRef = useRef(photos);
  photosRef.current = photos;
  useEffect(() => () => photosRef.current.forEach((p) => URL.revokeObjectURL(p.previewUrl)), []);

  const addPhoto = async (file: File | undefined) => {
    if (!file) return;
    setProblem(null);
    setPreparing(true);
    try {
      const prepared = await prepareFile(file);
      if (prepared.kind === 'pdf') {
        URL.revokeObjectURL(prepared.previewUrl);
        throw new Error('Een pdf kan nog niet uitgelezen worden. Maak er een schermafbeelding van.');
      }
      setPhotos((p) => [...p, prepared]);
    } catch (err) {
      setProblem((err as Error).message);
    } finally {
      setPreparing(false);
    }
  };

  const canRead = (photos.length > 0 || text.trim().length > 0) && !busy && !preparing;

  const read = async () => {
    if (!canRead) return;
    setBusy(true);
    setProblem(null);
    try {
      setResult(await readInput(text, photos));
      setDone(new Set());
      setOwners({});
    } catch (err) {
      setProblem((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const markDone = (i: number) => setDone((d) => new Set(d).add(i));

  const saveTaskProposal = (i: number, p: TaskProposal) => {
    void saveTask({ title: p.title, owner: owners[i] ?? 'samen', kid: p.kid, due: p.due, note: p.note }).catch(() => {});
    markDone(i);
    setNotice('Staat bij Regelen.');
  };

  // Een voorstel bekijken in het gewone formulier; terug naar de lijst na opslaan of sluiten.
  const proposal = editing !== null ? result?.proposals[editing] : undefined;
  if (editing !== null && proposal?.kind === 'event') {
    return (
      <EventForm
        initial={eventDraft(proposal) as CalendarEvent}
        date={proposal.date}
        expanded
        repeat={proposal.repeat}
        onSaved={() => markDone(editing)}
        onClose={() => setEditing(null)}
      />
    );
  }
  if (editing !== null && proposal?.kind === 'receipt') {
    return (
      <ReceiptSheet
        prefill={receiptDraft(proposal)}
        initial={photos[0]}
        onSaved={() => markDone(editing)}
        onClose={() => setEditing(null)}
      />
    );
  }

  const today = todayInNl();

  return (
    <Modal
      title="Uitlezen"
      onClose={onClose}
      footer={
        result ? (
          <>
            <button className="btn" onClick={() => setResult(null)}>
              Opnieuw
            </button>
            <button className="btn btn--primary grow" onClick={onClose}>
              Klaar
            </button>
          </>
        ) : (
          <button className="btn btn--primary btn--block" onClick={() => void read()} disabled={!canRead}>
            {busy ? 'Bezig met lezen…' : 'Lees uit'}
          </button>
        )
      }
    >
      <div className="stack">
        {!result ? (
          <>
            <p className="small muted">
              Kies een schermafbeelding of foto, bijvoorbeeld van een mail, een kaartje of een bon. Of plak de tekst.
              Je ziet eerst wat de app vond; er komt niets in de agenda zonder dat jij het bewaart.
            </p>

            <div className="filestrip" aria-label="Foto’s">
              {photos.map((p, i) => (
                <div key={p.id} className="filetile">
                  <span className="filetile__open">
                    <img src={p.previewUrl} alt={`Foto ${i + 1}`} />
                  </span>
                  <button
                    type="button"
                    className="filetile__x"
                    onClick={() => setPhotos((l) => l.filter((x) => x.id !== p.id))}
                    aria-label={`Foto ${i + 1} weghalen`}
                    disabled={busy}
                  >
                    <Icon name="kruis" size={13} />
                  </button>
                </div>
              ))}
              {photos.length < MAX_PHOTOS && (
                <button type="button" className="filetile filetile--add" onClick={() => fileInput.current?.click()} disabled={busy || preparing}>
                  <Icon name="camera" size={22} />
                  <span>{preparing ? 'Bezig…' : photos.length === 0 ? 'Foto kiezen' : 'Nog een'}</span>
                </button>
              )}
              <input
                ref={fileInput}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  void addPhoto(e.target.files?.[0]);
                  e.target.value = '';
                }}
              />
            </div>

            <div className="field">
              <label htmlFor="lees-tekst">Of plak hier een tekst</label>
              <textarea
                id="lees-tekst"
                className="textarea"
                rows={5}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Bijvoorbeeld de tekst van een mail van het zwembad"
              />
            </div>

            <p className="small muted iconrow lees__privacy">
              <Icon name="bericht" size={15} />
              <span>De foto of tekst gaat om te lezen naar Anthropic (Claude) en wordt door de planner niet bewaard.</span>
            </p>

            {problem && (
              <p className="small bon__problem" role="alert">
                {problem}
              </p>
            )}
          </>
        ) : (
          <>
            {result.proposals.length === 0 ? (
              <p className="card card--pad">Er is niets gevonden om in de planner te zetten.</p>
            ) : (
              <p className="small muted">
                {result.proposals.length === 1 ? 'Dit is gevonden.' : `Dit is gevonden (${result.proposals.length}).`} Controleer het voor je het bewaart.
              </p>
            )}
            {result.note && <p className="signalnote"><Icon name="bel" size={17} /><span>{result.note}</span></p>}

            {result.proposals.map((p, i) => (
              <ProposalCard
                key={i}
                proposal={p}
                done={done.has(i)}
                today={today}
                owner={owners[i] ?? 'samen'}
                onOwner={(o) => setOwners((m) => ({ ...m, [i]: o }))}
                onOpen={() => setEditing(i)}
                onSaveTask={() => p.kind === 'task' && saveTaskProposal(i, p)}
              />
            ))}
          </>
        )}
      </div>
    </Modal>
  );
}

function ProposalCard({
  proposal: p,
  done,
  today,
  owner,
  onOwner,
  onOpen,
  onSaveTask,
}: {
  proposal: Proposal;
  done: boolean;
  today: string;
  owner: TaskOwner;
  onOwner: (o: TaskOwner) => void;
  onOpen: () => void;
  onSaveTask: () => void;
}) {
  return (
    <div className={`card card--pad stack stack--sm lees__card ${done ? 'lees__card--done' : ''}`}>
      {p.kind === 'event' && (
        <>
          <div className="row row--wrap">
            {peopleOf(p).map((who: PersonId) => (
              <span key={who} className={`chip chip--${who}`}>
                <Avatar who={who} size={18} /> {PERSON_LABEL[who]}
              </span>
            ))}
            <span className="chip">{CATEGORY_LABEL[p.category]}</span>
          </div>
          <div>
            <strong>{p.title}</strong>
            <div className="small muted cap">
              {formatLong(p.date)}
              {p.time && ` · ${p.time}${p.endTime ? `–${p.endTime}` : ''}`}
              {p.location && ` · ${p.location}`}
            </div>
            {p.repeat && (
              <div className="small muted iconrow">
                <Icon name="herhaal" size={14} />
                {p.repeat.interval === 2 ? 'Om de week' : 'Elke week'} tot en met {formatLong(p.repeat.until)}
              </div>
            )}
            {p.notes && <div className="small muted">{p.notes}</div>}
            {p.bring.length > 0 && (
              <div className="small iconrow">
                <Icon name="rugzak" size={14} /> Meenemen: {p.bring.join(', ')}
              </div>
            )}
          </div>
        </>
      )}

      {p.kind === 'task' && (
        <>
          <div>
            <strong>{p.title}</strong>
            <div className="small muted">
              Taak · {p.due ? `uiterlijk ${shortDate(p.due)}${p.due < today ? ' (al voorbij)' : ''}` : 'geen deadline'}
              {p.kid && ` · ${PERSON_LABEL[p.kid]}`}
            </div>
            {p.note && <div className="small muted">{p.note}</div>}
          </div>
          {!done && <ChipPicker label="Wie moet het doen" value={owner} options={OWNERS} onChange={onOwner} />}
        </>
      )}

      {p.kind === 'receipt' && (
        <div>
          <strong>{p.title}</strong>
          <div className="small muted">
            Bonnetje
            {p.store && ` · ${p.store}`}
            {p.amountCents !== undefined && ` · € ${bedrag(p.amountCents)}`}
            {p.purchaseDate && ` · ${formatLong(p.purchaseDate)}`}
            {p.warrantyMonths && ` · ${p.warrantyMonths} maanden garantie`}
          </div>
        </div>
      )}

      {done ? (
        <p className="small iconrow lees__bewaard">
          <Icon name="vinkje" size={15} /> Bewaard
        </p>
      ) : p.kind === 'task' ? (
        <button className="btn btn--primary btn--sm" onClick={onSaveTask}>
          Zet op Regelen
        </button>
      ) : (
        <button className="btn btn--primary btn--sm" onClick={onOpen}>
          Bekijken en bewaren
        </button>
      )}
    </div>
  );
}
