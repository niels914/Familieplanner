/**
 * Een leeg scherm hoort niet als een fout te voelen. Eén icoon, één zin, en
 * waar het kan de knop die je toch zou zoeken.
 */

import type { ReactNode } from 'react';
import { Icon, type IconName } from './Icon';

export function EmptyState({
  icon,
  title,
  hint,
  action,
}: {
  icon: IconName;
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="emptystate">
      <span className="emptystate__icon" aria-hidden="true">
        <Icon name={icon} size={26} />
      </span>
      <p className="emptystate__title">{title}</p>
      {hint && <p className="emptystate__hint">{hint}</p>}
      {action}
    </div>
  );
}
