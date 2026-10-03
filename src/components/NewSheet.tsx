/**
 * Het blad achter de middenknop. Eén blad, twee soorten: een agenda-item (staat
 * op een dag) of een taak (moet nog geregeld of afgestemd worden). Wat je al
 * typde blijft staan als je wisselt.
 */

import { useMemo, useState } from 'react';
import type { CalendarEvent, ChildId, PersonId, TaskOwner } from '../../shared/types';
import { CATEGORY_LABEL, PERSON_LABEL } from '../../shared/types';
import { addDays, formatLong, todayInNl } from '../../shared/dates';
import { DEFAULT_HOME_TIME, spanLabel } from '../../shared/signals';
import { quickParse, type QuickResult } from '../lib/quickparse';
import { dueInfo } from '../lib/regelen';
import { useData, useStore } from '../lib/store';
import type { NewMode } from '../lib/nav';
import { useAwayWarnings } from '../lib/useAwayWarnings';
import { ChipPicker, type ChipOption } from './ChipPicker';
import { EventForm } from './EventForm';
import { Icon } from './Icon';
import { Modal } from './Modal';

const EXAMPLES_EVENT = [
  'Matthijs vrijdag gymtas mee',
  'Niels niet thuis 18:00-22:00',
  'Oppas zaterdag 19:00-23:00',
];
const EXAMPLES_TASK = [
  'cadeau halen voor Daan vrijdag Niels',
  'tandarts afspreken Amélie',
  'formulier inleveren Irene morgen',
];

const WHO_EVENT: ChipOption<PersonId>[] = [
  { value: 'matthijs', label: 'Matthijs', modifier: 'matthijs' },
  { value: 'amelie', label: 'Amélie', modifier: 'amelie' },
  { value: 'lotte', label: 'Lotte', modifier: 'lotte' },
  { value: 'gezin', label: 'Gezin' },
  { value: 'niels', label: 'Niels', modifier: 'ouder' },
  { value: 'irene', label: 'Irene', modifier: 'ouder' },
];

const WHO_TASK: ChipOption<TaskOwner>[] = [
  { value: 'niels', label: 'Niels', modifier: 'ouder' },
  { value: 'irene', label: 'Irene', modifier: 'ouder' },
  { value: 'samen', label: 'Samen afstemmen' },
];

/** Noemde je een datum, en niet alleen een persoon? Dan is dat de deadline. */
const PERSON_WORD = /^(matthijs|amelie|amélie|lotte|irene|niels)$/i;

type DuePick = '0' | '1' | '7' | 'none';
const DUE_OPTIONS: ChipOption<DuePick>[] = [
  { value: '0', label: 'Vandaag' },
  { value: '1', label: 'Morgen' },
  { value: '7', label: 'Over een week' },
  { value: 'none', label: 'Geen' },
];

export function NewSheet({
  mode: initialMode,
  initialText = '',
  date,
  onClose,
}: {
  mode: NewMode;
  initialText?: string;
  /** De dag die in de agenda open staat; nieuwe items beginnen daar. */
  date: string;
  onClose: () => void;
}) {
  const { settings } = useData();
  const { saveEvent, saveTask, setNotice } = useStore();
  const homeTime = settings.homeTime ?? DEFAULT_HOME_TIME;

  const [mode, setMode] = useState<NewMode>(initialMode);
  const [text, setText] = useState(initialText);
  const [whoEvent, setWhoEvent] = useState<PersonId | null>(null);
  const [whoTask, setWhoTask] = useState<TaskOwner | null>(null);
  const [duePick, setDuePick] = useState<DuePick | null>(null);
  const [detailed, setDetailed] = useState<Partial<CalendarEvent> | null>(null);

  const today = todayInNl();
  const parsed = useMemo<QuickResult | null>(
    () => (text.trim() ? quickParse(text, date || today, { homeTime }) : null),
    [text, date, today, homeTime],
  );

  // ------------------------------------------------------------ agenda-item
  const person = whoEvent ?? parsed?.person ?? 'gezin';

  const eventDraft = useMemo<Partial<CalendarEvent> | null>(() => {
    if (!parsed) return null;
    return {
      title: parsed.title,
      date: parsed.date,
      time: parsed.time,
      endTime: parsed.endTime,
      allDay: parsed.allDay,
      person,
      category: parsed.category,
      // Een "niet thuis" hoort niet in de avondherinnering.
      reminder: parsed.category !== 'weg',
      bring: parsed.bring.map((t) => ({ id: crypto.randomUUID(), text: t, done: false })),
    };
  }, [parsed, person]);

  const warnings = useAwayWarnings(eventDraft);
  const awayNeedsParent = parsed?.category === 'weg' && person !== 'niels' && person !== 'irene';

  const saveAsEvent = () => {
    if (!eventDraft || awayNeedsParent) return;
    // Het staat er meteen; mislukt het opslaan, dan draait de store het terug en meldt het.
    void saveEvent(eventDraft).catch(() => {});
    if (warnings.length > 0) {
      setNotice(`Opgeslagen. Allebei weg ${spanLabel(warnings[0].window)} staat nu bij Regelen.`);
    }
    onClose();
  };

  // ------------------------------------------------------------------- taak
  const taskDraft = useMemo(() => {
    if (!parsed) return null;
    const hasDate = parsed.matched.some((m) => !PERSON_WORD.test(m));
    let due: string | undefined = hasDate ? parsed.date : undefined;
    if (duePick === 'none') due = undefined;
    else if (duePick) due = addDays(today, Number(duePick));

    const named = parsed.person === 'niels' || parsed.person === 'irene' ? parsed.person : null;
    const owner: TaskOwner | null = whoTask ?? named;
    const kid: ChildId | undefined =
      parsed.person === 'matthijs' || parsed.person === 'amelie' || parsed.person === 'lotte'
        ? parsed.person
        : undefined;
    return { title: parsed.title, owner, kid, due };
  }, [parsed, whoTask, duePick, today]);

  const saveAsTask = () => {
    if (!taskDraft || !taskDraft.owner) return;
    void saveTask({
      title: taskDraft.title,
      owner: taskDraft.owner,
      kid: taskDraft.kid,
      due: taskDraft.due,
    }).catch(() => {});
    setNotice('Staat bij Regelen.');
    onClose();
  };

  if (detailed) {
    return <EventForm initial={detailed as CalendarEvent} date={detailed.date ?? date} onClose={onClose} />;
  }

  const due = taskDraft ? dueInfo(taskDraft.due, today) : null;

  return (
    <Modal
      title="Nieuw"
      onClose={onClose}
      footer={
        mode === 'agenda' ? (
          <>
            <button className="btn" onClick={() => setDetailed(eventDraft ?? { date })}>
              Alle opties
            </button>
            <button
              className="btn btn--primary grow"
              onClick={saveAsEvent}
              disabled={!eventDraft || awayNeedsParent}
            >
              Zet in agenda
            </button>
          </>
        ) : (
          <button
            className="btn btn--primary btn--block"
            onClick={saveAsTask}
            disabled={!taskDraft || !taskDraft.owner}
          >
            Zet erop
          </button>
        )
      }
    >
      <div className="stack">
        <div className="choice" role="group" aria-label="Soort">
          <button
            type="button"
            className="choice__opt"
            aria-pressed={mode === 'agenda'}
            onClick={() => setMode('agenda')}
          >
            <Icon name="kalender" size={22} />
            <span>
              <b>Agenda-item</b>
              <small>Op een dag, met tijd</small>
            </span>
          </button>
          <button
            type="button"
            className="choice__opt"
            aria-pressed={mode === 'taak'}
            onClick={() => setMode('taak')}
          >
            <Icon name="regelen" size={22} />
            <span>
              <b>Taak</b>
              <small>Te regelen of af te stemmen</small>
            </span>
          </button>
        </div>

        <div className="field">
          <label htmlFor="nieuw-tekst" className="sr-only">
            {mode === 'agenda' ? 'Wat moet er gebeuren?' : 'Wat moet er geregeld worden?'}
          </label>
          <input
            id="nieuw-tekst"
            className="input input--pill"
            autoFocus
            autoComplete="off"
            enterKeyHint="done"
            placeholder={
              mode === 'agenda' ? 'Wat moet er gebeuren?' : 'Wat moet er nog geregeld of afgestemd worden?'
            }
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== 'Enter') return;
              e.preventDefault();
              if (mode === 'agenda') saveAsEvent();
              else saveAsTask();
            }}
          />
        </div>

        {mode === 'agenda' ? (
          <>
            {parsed ? (
              <div className="card card--pad stack stack--sm">
                <div className="row row--wrap">
                  <span className={`chip chip--${person}`}>{PERSON_LABEL[person]}</span>
                  <span className="chip">{CATEGORY_LABEL[parsed.category]}</span>
                  {parsed.time && (
                    <span className="chip">
                      {parsed.time}
                      {parsed.endTime ? `–${parsed.endTime}` : ''}
                    </span>
                  )}
                </div>
                <div>
                  <strong>{parsed.title}</strong>
                  <div className="small muted cap">{formatLong(parsed.date)}</div>
                </div>
                {parsed.bring.length > 0 && (
                  <div className="bring iconrow">
                    <Icon name="rugzak" size={16} /> Meenemen: {parsed.bring.join(', ')}
                  </div>
                )}
              </div>
            ) : (
              <Examples items={EXAMPLES_EVENT} onPick={setText} />
            )}

            {awayNeedsParent && (
              <p className="signalnote">
                <Icon name="huis" size={17} />
                <span>Kies hieronder Niels of Irene: bij een kind of het gezin kunnen we niets vergelijken.</span>
              </p>
            )}

            {warnings.map((w) => (
              <p key={w.key} className="signalnote" role="status">
                <Icon name="bel" size={17} />
                <span>
                  <b>Dan is niemand thuis, {spanLabel(w.window)}.</b>{' '}
                  {w.coverage === 'partial'
                    ? `Een oppas dekt een deel; nog open: ${w.gaps.map(spanLabel).join(', ')}.`
                    : 'Er staat geen oppas in de agenda. Na opslaan komt dit bij Regelen.'}
                </span>
              </p>
            ))}

            <ChipPicker label="Voor wie" value={person} options={WHO_EVENT} onChange={setWhoEvent} />
          </>
        ) : (
          <>
            {taskDraft ? (
              <div className="card card--pad stack stack--sm">
                <strong>{taskDraft.title}</strong>
                <div className="row row--wrap">
                  {taskDraft.owner ? (
                    <span className={`chip chip--${taskDraft.owner === 'samen' ? 'gezin' : taskDraft.owner}`}>
                      {taskDraft.owner === 'samen' ? 'Afstemmen' : PERSON_LABEL[taskDraft.owner]}
                    </span>
                  ) : (
                    <span className="chip chip--warn">kies wie</span>
                  )}
                  {taskDraft.kid && (
                    <span className={`chip chip--${taskDraft.kid}`}>{PERSON_LABEL[taskDraft.kid]}</span>
                  )}
                  <span className={`chip ${due?.hot ? 'chip--warn' : ''}`}>
                    <Icon name="klok" size={13} /> {due ? due.label : 'geen deadline'}
                  </span>
                </div>
              </div>
            ) : (
              <Examples items={EXAMPLES_TASK} onPick={setText} />
            )}

            <ChipPicker
              label="Wie moet het doen"
              value={whoTask ?? (taskDraft?.owner ?? undefined)}
              options={WHO_TASK}
              onChange={setWhoTask}
            />
            <ChipPicker
              label="Deadline"
              value={duePick ?? undefined}
              options={DUE_OPTIONS}
              onChange={setDuePick}
            />
          </>
        )}
      </div>
    </Modal>
  );
}

function Examples({ items, onPick }: { items: string[]; onPick: (text: string) => void }) {
  return (
    <div className="stack stack--sm">
      <div className="small muted">Bijvoorbeeld:</div>
      {items.map((e) => (
        <button key={e} type="button" className="btn btn--sm" onClick={() => onPick(e)}>
          {e}
        </button>
      ))}
    </div>
  );
}
