import type { BringSuggestion } from '../../shared/suggesties';
import type { CalendarEvent } from '../../shared/types';
import { useStore } from './store';

/**
 * Een voorstel overnemen of afwijzen. Beide bewaren de sleutel op het item, zodat een
 * voorstel niet terugkomt als je het later zelf uit het lijstje haalt.
 */
export function useBringSuggestions() {
  const { saveEvent } = useStore();

  const remember = (event: CalendarEvent, key: string) =>
    event.suggestionsOff?.includes(key) ? event.suggestionsOff : [...(event.suggestionsOff ?? []), key];

  return {
    adopt: (event: CalendarEvent, s: BringSuggestion) =>
      void saveEvent({
        ...event,
        bring: [...event.bring, { id: crypto.randomUUID(), text: s.text, done: false }],
        suggestionsOff: remember(event, s.key),
      }).catch(() => {}),
    dismiss: (event: CalendarEvent, s: BringSuggestion) =>
      void saveEvent({ ...event, suggestionsOff: remember(event, s.key) }).catch(() => {}),
  };
}
