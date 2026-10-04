import { nowInNl, useNow } from '../lib/dayPart';
import { dueInfo, receiptAlertTitle, signalTitle } from '../lib/regelen';
import { useNav } from '../lib/nav';
import { useRegel } from '../lib/useRegel';
import { Icon } from './Icon';

/**
 * Eén regel op Vandaag als er iets te regelen valt binnen een week. Staat er
 * iets dringends tussen, dan zegt de regel dat; anders hoe veel het er zijn.
 */
export function RegelRow() {
  const { go } = useNav();
  const state = useRegel();
  const { date: today } = nowInNl(useNow());

  const soon = state.open
    .filter((i) => {
      const info = dueInfo(i.due, today);
      return info !== null && info.bucket <= 1;
    })
    .sort((a, b) => (a.due ?? '9').localeCompare(b.due ?? '9'));

  if (soon.length === 0) return null;

  const titles = soon
    .slice(0, 2)
    .map((i) => (i.kind === 'task' ? i.task.title : i.kind === 'signal' ? signalTitle(i.signal) : receiptAlertTitle(i.alert)))
    .join(', ');

  return (
    <button className="regelrow" onClick={() => go('regelen')}>
      <Icon name="regelen" size={19} />
      <strong>Regelen</strong>
      {state.urgent > 0 ? (
        <span className="chip chip--warn">{state.urgent} dringend</span>
      ) : (
        <span className="chip">{soon.length} deze week</span>
      )}
      <span className="regelrow__prev grow">{titles}</span>
      <Icon name="chevron-rechts" size={17} />
    </button>
  );
}
