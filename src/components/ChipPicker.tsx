/**
 * Keuze uit een handvol mogelijkheden als chips in plaats van een dropdown.
 * Scheelt een tik en je ziet meteen wat er te kiezen valt — op een telefoon
 * het verschil tussen twee handelingen en één.
 */

import type { PersonId } from '../../shared/types';
import { Avatar } from './Avatar';
import { Icon, type IconName } from './Icon';

export interface ChipOption<T extends string> {
  value: T;
  label: string;
  /** Extra klasse voor een eigen kleur, bijvoorbeeld per kind. */
  modifier?: string;
  icon?: IconName;
  /** Toon het dier van deze persoon voor het label. */
  avatar?: PersonId;
}

/** Zoals ChipPicker, maar je kunt er meer dan één kiezen. `onToggle` krijgt de aangetikte keuze. */
export function ChipMultiPicker<T extends string>({
  label,
  values,
  options,
  onToggle,
  hint,
}: {
  label: string;
  values: T[];
  options: ChipOption<T>[];
  onToggle: (value: T) => void;
  hint?: string;
}) {
  return (
    <div className="field">
      <span className="field__label">
        {label}
        {hint && <span className="field__hint"> · {hint}</span>}
      </span>
      <div className="picks" role="group" aria-label={label}>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`pick ${option.modifier ? `pick--${option.modifier}` : ''}`}
            aria-pressed={values.includes(option.value)}
            onClick={() => onToggle(option.value)}
          >
            {option.avatar && <Avatar who={option.avatar} size={22} />}
            {option.icon && <Icon name={option.icon} size={15} />}
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ChipPicker<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T | undefined;
  options: ChipOption<T>[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="field">
      <span className="field__label">{label}</span>
      <div className="picks" role="group" aria-label={label}>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`pick ${option.modifier ? `pick--${option.modifier}` : ''}`}
            aria-pressed={value === option.value}
            onClick={() => onChange(option.value)}
          >
            {option.avatar && <Avatar who={option.avatar} size={22} />}
            {option.icon && <Icon name={option.icon} size={15} />}
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
