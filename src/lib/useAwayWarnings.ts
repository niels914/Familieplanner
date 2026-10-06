import { useMemo } from 'react';
import type { CalendarEvent } from '../../shared/types';
import { todayInNl } from '../../shared/dates';
import { signalsForDraft, type Signal } from '../../shared/signals';
import { useData } from './store';

export const DRAFT_ID = '__nieuw__';

/**
 * Terwijl je een "niet thuis" invult: botst dat met wat de ander al heeft
 * aangegeven? Geeft de signalen die er door dit concept bij komen.
 */
export function useAwayWarnings(draft: Partial<CalendarEvent> | null): Signal[] {
  const { events } = useData();

  return useMemo(() => {
    if (!draft || draft.category !== 'weg' || !draft.date) return [];
    if (draft.person !== 'niels' && draft.person !== 'irene') return [];
    const concept: CalendarEvent = {
      id: draft.id ?? DRAFT_ID,
      source: 'local',
      title: draft.title ?? '',
      date: draft.date,
      endDate: draft.endDate,
      allDay: !draft.time,
      time: draft.time,
      endTime: draft.time ? draft.endTime : undefined,
      person: draft.person,
      category: 'weg',
      bring: [],
      reminder: false,
      createdAt: '',
      updatedAt: '',
    };
    return signalsForDraft(events, concept, todayInNl());
  }, [draft, events]);
}
