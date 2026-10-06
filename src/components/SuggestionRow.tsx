import type { BringSuggestion } from '../../shared/suggesties';
import { Icon } from './Icon';

/**
 * Wat de app uit het Parro-bericht haalde als "mee te nemen". Een voorstel: niets
 * komt in het lijstje voordat iemand op Meenemen tikt, en wat niet klopt gaat weg
 * met het kruisje (Niet nodig).
 */
export function SuggestionRow({
  suggestions,
  onAdopt,
  onDismiss,
}: {
  suggestions: BringSuggestion[];
  onAdopt: (s: BringSuggestion) => void;
  onDismiss: (s: BringSuggestion) => void;
}) {
  if (suggestions.length === 0) return null;
  return (
    <div className="suggest" role="group" aria-label="Suggesties uit het bericht">
      <div className="suggest__head iconrow">
        <Icon name="rugzak" size={15} />
        Uit het bericht, meenemen?
      </div>
      {suggestions.map((s) => (
        <div key={s.key} className="suggest__row">
          <span className="suggest__text">{s.text}</span>
          <button type="button" className="btn btn--sm" onClick={() => onAdopt(s)} aria-label={`${s.text} meenemen`}>
            Meenemen
          </button>
          <button
            type="button"
            className="btn btn--sm btn--ghost suggest__no"
            onClick={() => onDismiss(s)}
            aria-label={`${s.text} niet nodig`}
            title="Niet nodig"
          >
            <Icon name="kruis" size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
