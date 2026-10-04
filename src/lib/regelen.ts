/**
 * Wat staat er open bij Regelen? Taken die jullie zelf aanmaakten én signalen
 * die de app uit de agenda haalde ("allebei weg"), op één lijst, gegroepeerd
 * op hoe snel het moet.
 *
 * Alles hier is berekend uit de gegevens; er wordt niets bijgehouden. Daardoor
 * blijft de teller op de tab altijd gelijk aan wat je op het scherm ziet.
 */

import type { CalendarEvent, Decisions, Task } from '../../shared/types';
import { addDays, diffDays, formatShort, isoWeekday, weekdayShort } from '../../shared/dates';
import {
  computeSignals,
  isAutoClosed,
  isOpen,
  isSettled,
  spanLabel,
  type Signal,
} from '../../shared/signals';

export interface DueInfo {
  label: string;
  /** Te laat, vandaag of morgen: dit mag niet blijven liggen. */
  hot: boolean;
  /** 0 te laat, 1 deze week, 2 later. */
  bucket: 0 | 1 | 2;
}

export function dueInfo(due: string | undefined, today: string): DueInfo | null {
  if (!due) return null;
  const n = diffDays(today, due);
  if (n < 0) return { label: n === -1 ? '1 dag te laat' : `${-n} dagen te laat`, hot: true, bucket: 0 };
  if (n === 0) return { label: 'vandaag', hot: true, bucket: 1 };
  if (n === 1) return { label: 'morgen', hot: true, bucket: 1 };
  return { label: shortDate(due), hot: false, bucket: n <= 7 ? 1 : 2 };
}

/** "vr 9 okt" */
export function shortDate(date: string): string {
  return `${weekdayShort(isoWeekday(date) - 1)} ${formatShort(date)}`;
}

export function signalTitle(s: Signal): string {
  return `Allebei weg · ${shortDate(s.date)}, ${spanLabel(s.window)}`;
}

/** De titel van de taak die ontstaat als je kiest voor "regel een oppas". */
export function sitterTaskTitle(s: Signal): string {
  return `Oppas regelen voor ${shortDate(s.date)}, ${spanLabel(s.window)}`;
}

/** Deadline voor zo'n taak: twee dagen vooraf, maar nooit in het verleden. */
export function sitterTaskDue(s: Signal, today: string): string {
  const due = addDays(s.date, -2);
  return due < today ? today : due;
}

/** Waarom een oppas-taak vanzelf sloot, voor in de lijst met afgeronde dingen. */
function autoClosedNote(s: Signal | undefined): string {
  const oppas = s?.sitters[0];
  if (!oppas) return 'Opgelost: er staat een oppas in de agenda.';
  const wie = oppas.sitter?.name ?? oppas.title;
  const tijd = oppas.sitter ? ` ${oppas.sitter.start}–${oppas.sitter.end}` : oppas.time ? ` ${oppas.time}` : '';
  return `Opgelost: ${wie}${tijd} staat in de agenda.`;
}

export type RegelItem =
  | { kind: 'task'; task: Task; due: string | undefined }
  | { kind: 'signal'; signal: Signal; due: string };

export interface RegelState {
  signals: Signal[];
  /** Taken en signalen die nog aandacht vragen. */
  open: RegelItem[];
  /** Opgeloste signalen. */
  settledSignals: Signal[];
  /** Afgeronde taken, inclusief oppas-taken die vanzelf sloten. */
  doneTasks: Task[];
  /** Hoeveel dringend is (te laat, vandaag, morgen). Voor de teller op de tab. */
  urgent: number;
  /** Hoeveel er deze week of eerder moet. Voor de regel op Vandaag. */
  soon: number;
}

export function regelState(
  events: CalendarEvent[],
  tasks: Task[],
  decisions: Decisions,
  today: string,
): RegelState {
  const signals = computeSignals(events, today);

  // Een oppas-taak waarvan het signaal inmiddels gedekt is, sluit vanzelf.
  const effective = tasks.map((t): Task => {
    if (t.done || !isAutoClosed(t.signalKey, signals)) return t;
    const s = signals.find((x) => x.key === t.signalKey);
    return { ...t, done: true, decision: autoClosedNote(s) };
  });

  const openTasks = effective.filter((t) => !t.done);
  const doneTasks = effective.filter((t) => t.done);

  const taskExists = (id: string) => tasks.some((t) => t.id === id);

  const openSignals = signals.filter((s) => {
    const d = decisions[s.key];
    // Heeft iemand een oppas-taak aangemaakt, dan loopt het via die taak.
    // Is die taak weggegooid, dan is het signaal weer open.
    if (d?.type === 'oppas' && taskExists(d.taskId)) return false;
    if (d?.type === 'oppas') return s.coverage !== 'full';
    return isOpen(s, decisions);
  });

  const open: RegelItem[] = [
    ...openTasks.map((task): RegelItem => ({ kind: 'task', task, due: task.due })),
    ...openSignals.map((signal): RegelItem => ({ kind: 'signal', signal, due: signal.date })),
  ];

  const urgent = open.filter((i) => dueInfo(i.due, today)?.hot).length;
  const soon = open.filter((i) => {
    const info = dueInfo(i.due, today);
    return info !== null && info.bucket <= 1;
  }).length;

  return {
    signals,
    open,
    settledSignals: signals.filter((s) => isSettled(s, decisions)),
    doneTasks,
    urgent,
    soon,
  };
}

export const GROUPS = [
  { id: 0, label: 'Te laat', hot: true },
  { id: 1, label: 'Deze week', hot: false },
  { id: 2, label: 'Later', hot: false },
  { id: 3, label: 'Geen datum', hot: false },
] as const;

/** In welke groep valt dit item? 3 = geen deadline. */
export function groupOf(item: RegelItem, today: string): 0 | 1 | 2 | 3 {
  return dueInfo(item.due, today)?.bucket ?? 3;
}

export type WhoFilter = 'alle' | 'niels' | 'irene' | 'samen';

/** Een signaal is van niemand in het bijzonder, dus het hoort bij elk filter. */
export function matchesFilter(item: RegelItem, filter: WhoFilter): boolean {
  if (filter === 'alle' || item.kind === 'signal') return true;
  if (filter === 'samen') return item.task.owner === 'samen';
  return item.task.owner === filter || item.task.owner === 'samen';
}
