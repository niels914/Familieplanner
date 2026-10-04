import { useState } from 'react';
import type { Contact, SitterDetails } from '../../shared/types';
import { euro, sitterHours } from '../lib/events';
import { Icon } from './Icon';
import { TimeField } from './TimeField';

/** Een nieuw oppasmoment begint met deze tijden en zonder tarief. */
export const LEGE_OPPAS: SitterDetails = { name: '', start: '18:00', end: '22:00', rate: 0, paid: false };

/**
 * De oppasgegevens van een agenda-item: wie, van hoe laat tot hoe laat, wat het kost en of het
 * betaald is. Kies je een oppas uit Contacten, dan komt het tarief mee.
 */
export function SitterFields({
  sitter,
  sitters,
  onChange,
}: {
  sitter: SitterDetails | undefined;
  /** De oppassen uit Contacten. */
  sitters: Contact[];
  onChange: (patch: Partial<SitterDetails>) => void;
}) {
  // Zonder gekoppeld contact tonen we meteen het veld om een naam in te vullen.
  const [eigenNaam, setEigenNaam] = useState(!sitter?.contactId);
  const uren = sitter ? sitterHours(sitter.start, sitter.end) : 0;

  return (
    <div className="card card--pad stack stack--sm">
      <strong className="small">Oppasgegevens</strong>

      {sitters.length > 0 && (
        <div className="picks">
          {sitters.map((s) => (
            <button
              key={s.id}
              type="button"
              className="pick"
              aria-pressed={sitter?.contactId === s.id}
              onClick={() => {
                setEigenNaam(false);
                onChange({ contactId: s.id, name: s.name, rate: s.sitterRate ?? 0 });
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
              onChange({ contactId: undefined });
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
          value={sitter?.name ?? ''}
          onChange={(e) => onChange({ name: e.target.value })}
        />
      )}

      <div className="field-row">
        <div className="field">
          <label htmlFor="ev-start">Van</label>
          <TimeField
            id="ev-start"
            label="Van"
            value={sitter?.start ?? LEGE_OPPAS.start}
            onChange={(v) => onChange({ start: v })}
          />
        </div>
        <div className="field">
          <label htmlFor="ev-end">Tot</label>
          <TimeField
            id="ev-end"
            label="Tot"
            value={sitter?.end ?? LEGE_OPPAS.end}
            onChange={(v) => onChange({ end: v })}
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
            value={sitter?.rate ?? 0}
            onChange={(e) => onChange({ rate: Number(e.target.value) })}
          />
        </div>
        <span className="small muted grow" style={{ paddingTop: 18 }}>
          {uren.toLocaleString('nl-NL', { maximumFractionDigits: 1 })} uur ·{' '}
          <strong>{euro(uren * (sitter?.rate ?? 0))}</strong>
        </span>
        <button
          type="button"
          className="pick"
          style={{ marginTop: 16 }}
          aria-pressed={sitter?.paid ?? false}
          onClick={() => onChange({ paid: !sitter?.paid })}
        >
          <Icon name="vinkje" size={15} /> Betaald
        </button>
      </div>
    </div>
  );
}
