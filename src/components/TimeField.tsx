import { HOUR_OPTIONS, minuteOptions, timeParts, withHour, withMinute } from '../lib/time';

/**
 * Een tijd kiezen als uur en minuut, de minuten per vijf. Op een telefoon opent elke
 * keuzelijst als draaiwieltje; de waarde blijft gewoon 'HH:MM'. Met `allowEmpty` kan het
 * veld ook leeg zijn (een eindtijd is niet verplicht): dan geeft `onChange` een lege tekst.
 */
export function TimeField({
  id,
  value,
  onChange,
  label,
  disabled,
  allowEmpty = false,
}: {
  /** Komt op het uur-veld, zodat een label ernaar kan verwijzen. */
  id?: string;
  value: string | undefined;
  onChange: (value: string) => void;
  /** Voor schermlezers, bijvoorbeeld "Tijdstip". */
  label: string;
  disabled?: boolean;
  allowEmpty?: boolean;
}) {
  const { hour, minute } = timeParts(value);
  const leeg = hour === '';

  return (
    <div className="timefield" role="group" aria-label={label}>
      <select
        id={id}
        className="select"
        aria-label={`${label}, uur`}
        value={hour}
        disabled={disabled}
        onChange={(e) => onChange(withHour(value, e.target.value))}
      >
        {(allowEmpty || leeg) && <option value="">--</option>}
        {HOUR_OPTIONS.map((h) => (
          <option key={h} value={h}>
            {h}
          </option>
        ))}
      </select>
      <span aria-hidden="true">:</span>
      <select
        className="select"
        aria-label={`${label}, minuten`}
        value={minute}
        disabled={disabled || leeg}
        onChange={(e) => onChange(withMinute(value, e.target.value))}
      >
        {leeg && <option value="">--</option>}
        {minuteOptions(minute).map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
    </div>
  );
}
