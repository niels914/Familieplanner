/**
 * De korte feiten over een dag: wie brengt, wie haalt, en wat we eten.
 * Eén strook in plaats van kaarten, gedeeld door Vandaag en de Agenda zodat
 * een dag er overal hetzelfde uitziet.
 */

import { PERSON_LABEL } from '../../shared/types';
import type { PickupForDay } from '../lib/events';
import { Icon } from './Icon';

export function DayFacts({ pickups, dish }: { pickups: PickupForDay[]; dish?: string }) {
  if (pickups.length === 0 && !dish) return null;

  return (
    <div className="facts">
      {pickups.map((p) => (
        <div key={p.child} className="fact">
          <span className={`chip chip--${p.child}`}>{PERSON_LABEL[p.child]}</span>
          <span className="fact__value">
            <em>brengen</em> {p.dropoff || '—'} <em>halen</em> {p.pickup || '—'}
            {p.isOverride && <span className="chip chip--warn">afwijking</span>}
          </span>
        </div>
      ))}
      {dish && (
        <div className="fact">
          <span className="fact__icon">
            <Icon name="eten" size={16} />
          </span>
          <span className="fact__value">
            <em>eten</em> {dish}
          </span>
        </div>
      )}
    </div>
  );
}
