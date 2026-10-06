/**
 * Een taak bekijken of aanpassen: wie het doet, wanneer het klaar moet zijn en,
 * bij iets dat afgestemd moest worden, wat jullie besloten. Eén blad voor
 * bekijken en bewerken, zodat "klaar" altijd één tik is.
 */

import { useState } from 'react';
import type { ChildId, Task, TaskOwner } from '../../shared/types';
import { PERSON_LABEL } from '../../shared/types';
import { addDays, formatLong, todayInNl } from '../../shared/dates';
import { dueInfo } from '../lib/regelen';
import { useData, useStore } from '../lib/store';
import { useNav } from '../lib/nav';
import { MoreOptions } from './MoreOptions';
import { ChipPicker, type ChipOption } from './ChipPicker';
import { Icon } from './Icon';
import { Modal } from './Modal';

const OWNERS: ChipOption<TaskOwner>[] = [
  { value: 'niels', label: 'Niels', modifier: 'ouder', avatar: 'niels' },
  { value: 'irene', label: 'Irene', modifier: 'ouder', avatar: 'irene' },
  { value: 'samen', label: 'Samen afstemmen' },
];

type KidPick = ChildId | 'gezin';
const KIDS: ChipOption<KidPick>[] = [
  { value: 'gezin', label: 'Geen kind' },
  { value: 'matthijs', label: 'Matthijs', modifier: 'matthijs', avatar: 'matthijs' },
  { value: 'amelie', label: 'Amélie', modifier: 'amelie', avatar: 'amelie' },
  { value: 'lotte', label: 'Lotte', modifier: 'lotte', avatar: 'lotte' },
];

export function TaskForm({ task, onClose }: { task: Task; onClose: () => void }) {
  const { events } = useData();
  const { saveTask, deleteTask } = useStore();
  const { openDate } = useNav();
  const today = todayInNl();

  const [draft, setDraft] = useState<Task>(task);
  // Kind, besluit en notitie staan achter "Meer opties", tenzij er al iets in staat.
  const [meerOpen, setMeerOpen] = useState(Boolean(task.kid || task.note || task.decision || task.owner === 'samen'));
  const set = <K extends keyof Task>(key: K, value: Task[K]) => setDraft((d) => ({ ...d, [key]: value }));

  const linked = task.eventId ? events.find((e) => e.id === task.eventId) : undefined;
  const due = dueInfo(draft.due, today);
  const canSave = draft.title.trim().length > 0;
  const meerVoorbeeld =
    [draft.kid ? PERSON_LABEL[draft.kid] : null, draft.note ? 'notitie' : null, draft.decision ? 'besluit' : null]
      .filter(Boolean)
      .join(' · ') || 'Voor welk kind, notitie';

  const save = (extra: Partial<Task> = {}) => {
    if (!canSave) return;
    void saveTask({ ...draft, title: draft.title.trim(), ...extra }).catch(() => {});
    onClose();
  };

  const remove = () => {
    void deleteTask(task.id).catch(() => {});
    onClose();
  };

  return (
    <Modal
      title="Taak"
      onClose={onClose}
      footer={
        <>
          <button className="btn btn--danger" onClick={remove} aria-label="Verwijderen">
            <Icon name="prullenbak" size={17} />
          </button>
          <button className="btn grow" onClick={() => save({ done: !draft.done })} disabled={!canSave}>
            {task.done ? 'Weer openen' : 'Klaar'}
          </button>
          <button className="btn btn--primary grow" onClick={() => save()} disabled={!canSave}>
            Opslaan
          </button>
        </>
      }
    >
      <div className="stack">
        <div className="field">
          <label htmlFor="taak-titel">Wat moet er gebeuren?</label>
          <input
            id="taak-titel"
            className="input"
            value={draft.title}
            onChange={(e) => set('title', e.target.value)}
          />
        </div>

        <ChipPicker label="Wie moet het doen" value={draft.owner} options={OWNERS} onChange={(v) => set('owner', v)} />
        <div className="field">
          <label htmlFor="taak-deadline">Deadline</label>
          <div className="row row--wrap">
            <input
              id="taak-deadline"
              className="input"
              style={{ width: 170 }}
              type="date"
              value={draft.due ?? ''}
              onChange={(e) => set('due', e.target.value || undefined)}
            />
            {due && (
              <span className={`chip ${due.hot && !task.done ? 'chip--warn' : ''}`}>
                <Icon name="klok" size={13} /> {due.label}
              </span>
            )}
          </div>
          <div className="picks">
            <button type="button" className="pick" onClick={() => set('due', today)}>Vandaag</button>
            <button type="button" className="pick" onClick={() => set('due', addDays(today, 1))}>Morgen</button>
            <button type="button" className="pick" onClick={() => set('due', addDays(today, 7))}>Over een week</button>
            <button type="button" className="pick" onClick={() => set('due', undefined)}>Geen</button>
          </div>
        </div>

        {linked && (
          <button
            type="button"
            className="rowlink rowlink--boxed"
            onClick={() => {
              onClose();
              openDate(linked.date);
            }}
          >
            <span className="rowlink__ico">
              <Icon name="kalender" size={18} />
            </span>
            <span className="grow">
              <div className="rowlink__t">{linked.title}</div>
              <div className="rowlink__s">
                <span className="cap">{formatLong(linked.date)}</span>
                {linked.time ? ` · ${linked.time}` : ''} · in de agenda
              </div>
            </span>
            <Icon name="chevron-rechts" size={17} />
          </button>
        )}

        <MoreOptions open={meerOpen} onToggle={() => setMeerOpen((o) => !o)} preview={meerVoorbeeld}>
          <ChipPicker
            label="Voor welk kind"
            value={draft.kid ?? 'gezin'}
            options={KIDS}
            onChange={(v) => set('kid', v === 'gezin' ? undefined : v)}
          />

          {(draft.owner === 'samen' || draft.decision) && (
            <div className="field">
              <label htmlFor="taak-besluit">Wat is besloten?</label>
              <input
                id="taak-besluit"
                className="input"
                placeholder="Bijvoorbeeld: Niels gaat, Irene past op"
                value={draft.decision ?? ''}
                onChange={(e) => set('decision', e.target.value || undefined)}
              />
            </div>
          )}

          <div className="field">
            <label htmlFor="taak-notitie">Notitie</label>
            <textarea
              id="taak-notitie"
              className="textarea"
              value={draft.note ?? ''}
              onChange={(e) => set('note', e.target.value || undefined)}
            />
          </div>

        </MoreOptions>
      </div>
    </Modal>
  );
}
