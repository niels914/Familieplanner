/**
 * Het signaal "allebei weg": wie is wanneer weg, wat dekt een oppas al, en wat
 * wordt het? Vijf uitwegen: Niels blijft thuis, Irene blijft thuis, Niels of
 * Irene regelt een oppas (er komt een taak met deadline), of geen probleem.
 */

import { useMemo } from 'react';
import type { CalendarEvent } from '../../shared/types';
import { formatLong, todayInNl } from '../../shared/dates';
import { computeSignals, durationLabel, spanLabel, type Signal } from '../../shared/signals';
import { sitterTaskDue, sitterTaskTitle } from '../lib/regelen';
import { shortDate } from '../lib/regelen';
import { useData, useStore } from '../lib/store';
import { useNav } from '../lib/nav';
import { Icon, type IconName } from './Icon';
import { Modal } from './Modal';

type Parent = 'niels' | 'irene';
const NAME: Record<Parent, string> = { niels: 'Niels', irene: 'Irene' };

/** Wat staat er over een van de twee in de agenda? */
function awayText(e: CalendarEvent): string {
  if (e.title === 'Later thuis' && e.endTime) {
    return `normaal thuis ${e.time ?? ''}, nu tot ${e.endTime}`;
  }
  if (e.allDay || !e.time) return 'de hele dag';
  return `${e.time}–${e.endTime ?? 'geen eindtijd, 3 uur geschat'}`;
}

export function SignalSheet({ signalKey, onClose }: { signalKey: string; onClose: () => void }) {
  const { events, decisions } = useData();
  const { saveTask, setDecision, clearDecision, deleteTask, setNotice } = useStore();
  const { openDate } = useNav();
  const today = todayInNl();

  const signal: Signal | undefined = useMemo(
    () => computeSignals(events, today).find((s) => s.key === signalKey),
    [events, today, signalKey],
  );
  const decision = decisions[signalKey];

  if (!signal) {
    return (
      <Modal title="Allebei weg" onClose={onClose}>
        <p>Dit signaal bestaat niet meer: de agenda is inmiddels aangepast.</p>
      </Modal>
    );
  }

  const dueTask = sitterTaskDue(signal, today);

  const decide = (type: 'thuis' | 'oppas' | 'ok', who?: Parent) => {
    if (type === 'ok') {
      void setDecision(signalKey, { type: 'ok' }).catch(() => {});
      setNotice('Genoteerd: geen probleem.');
    } else if (type === 'thuis' && who) {
      void setDecision(signalKey, { type: 'thuis', who }).catch(() => {});
      setNotice(`${NAME[who]} blijft thuis. Vastgelegd.`);
    } else if (type === 'oppas' && who) {
      const taskId = crypto.randomUUID();
      void saveTask({
        id: taskId,
        title: sitterTaskTitle(signal),
        owner: who,
        due: dueTask,
        eventId: signal.niels.id,
        signalKey,
        note: 'Jullie zijn dan allebei weg. Zodra er een oppas in de agenda staat voor dit tijdvak, sluit deze taak vanzelf.',
      }).catch(() => {});
      void setDecision(signalKey, { type: 'oppas', who, taskId }).catch(() => {});
      setNotice(`Taak voor ${NAME[who]} aangemaakt.`);
    }
    onClose();
  };

  const undo = () => {
    if (decision?.type === 'oppas') void deleteTask(decision.taskId, { quiet: true }).catch(() => {});
    void clearDecision(signalKey).catch(() => {});
    onClose();
  };

  const covered = signal.coverage === 'full';

  return (
    <Modal title="Allebei weg" onClose={onClose}>
      <div className="stack">
        <p style={{ margin: 0, color: 'var(--muted)' }}>
          <span className="cap">{formatLong(signal.date)}</span> · {spanLabel(signal.window)} (
          {durationLabel(signal.window)}). Geen van jullie is dan thuis.
        </p>

        <div className="card">
          <div className="row sigrow">
            <span className="chip chip--niels">Niels</span>
            <span className="grow">
              <b>{signal.niels.title}</b>
              <div className="tiny muted">{awayText(signal.niels)}</div>
            </span>
          </div>
          <div className="row sigrow">
            <span className="chip chip--irene">Irene</span>
            <span className="grow">
              <b>{signal.irene.title}</b>
              <div className="tiny muted">{awayText(signal.irene)}</div>
            </span>
          </div>
        </div>

        {signal.guessed && (
          <p className="small muted" style={{ margin: 0 }}>
            Zonder eindtijd rekenen we met 3 uur.
          </p>
        )}

        {signal.coverage === 'partial' && (
          <p className="chip chip--warn" style={{ margin: 0 }}>
            Oppas dekt een deel; nog open: {signal.gaps.map(spanLabel).join(', ')}
          </p>
        )}

        {covered && (
          <p className="chip chip--gezin" style={{ margin: 0 }}>
            <Icon name="vinkje" size={13} /> Gedekt door{' '}
            {signal.sitters[0]?.sitter?.name ?? signal.sitters[0]?.title ?? 'een oppas'}
          </p>
        )}

        {decision && !covered && (
          <div className="stack stack--sm">
            <p className="chip chip--gezin" style={{ margin: 0 }}>
              <Icon name="vinkje" size={13} />{' '}
              {decision.type === 'thuis'
                ? `${NAME[decision.who]} blijft thuis`
                : decision.type === 'ok'
                  ? 'Geen probleem, bewust besloten'
                  : `${NAME[decision.who]} regelt een oppas (taak staat bij Regelen)`}
            </p>
            <button className="btn btn--sm" onClick={undo}>
              Keuze terugzetten
            </button>
          </div>
        )}

        {!covered && !decision && (
          <>
            <div className="field__label">Wat wordt het?</div>
            <div className="card">
              <Option icon="huis" title="Niels blijft thuis" sub="Irene gaat. Wordt vastgelegd." onClick={() => decide('thuis', 'niels')} />
              <Option icon="huis" title="Irene blijft thuis" sub="Niels gaat. Wordt vastgelegd." onClick={() => decide('thuis', 'irene')} />
              <Option icon="oppas" title="Niels regelt een oppas" sub={`Er komt een taak met deadline ${shortDate(dueTask)}`} onClick={() => decide('oppas', 'niels')} />
              <Option icon="oppas" title="Irene regelt een oppas" sub={`Er komt een taak met deadline ${shortDate(dueTask)}`} onClick={() => decide('oppas', 'irene')} />
              <Option icon="vinkje" title="Geen probleem" sub="Bijvoorbeeld: de kinderen zijn elders." onClick={() => decide('ok')} />
            </div>
            <p className="tiny muted" style={{ margin: 0 }}>
              Zodra er een oppas in de agenda staat voor dit tijdvak, verdwijnt dit vanzelf.
            </p>
          </>
        )}

        <button
          className="btn btn--block"
          onClick={() => {
            onClose();
            openDate(signal.date);
          }}
        >
          <Icon name="kalender" size={16} /> Bekijk de dag
        </button>
      </div>
    </Modal>
  );

  function Option({ icon, title, sub, onClick }: { icon: IconName; title: string; sub: string; onClick: () => void }) {
    return (
      <button type="button" className="rowlink" onClick={onClick}>
        <span className="rowlink__ico">
          <Icon name={icon} size={18} />
        </span>
        <span className="grow">
          <div className="rowlink__t">{title}</div>
          <div className="rowlink__s">{sub}</div>
        </span>
        <Icon name="chevron-rechts" size={17} />
      </button>
    );
  }
}
