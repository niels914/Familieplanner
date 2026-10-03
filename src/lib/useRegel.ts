import { useMemo } from 'react';
import { regelState, type RegelState } from './regelen';
import { nowInNl, useNow } from './dayPart';
import { useData } from './store';

/** Wat er bij Regelen openstaat, altijd berekend uit de actuele gegevens. */
export function useRegel(): RegelState {
  const { events, tasks, decisions } = useData();
  const { date } = nowInNl(useNow());
  return useMemo(() => regelState(events, tasks, decisions, date), [events, tasks, decisions, date]);
}
