/**
 * Stelt de avondherinnering samen. Los van het versturen, zodat de tekst te
 * testen is: juist hier moet "zwemles, meenemen: kleren om in te zwemmen"
 * gegarandeerd in staan.
 */

import type { CalendarEvent } from '../../shared/types';
import { peopleNames } from '../../shared/people';
import { formatLong } from '../../shared/dates';

export interface Herinnering {
  title: string;
  body: string;
  url: string;
  tag: string;
}

function coversDate(e: CalendarEvent, date: string): boolean {
  if (!e.endDate) return e.date === date;
  return e.date <= date && date <= e.endDate;
}

function sortByTime(a: CalendarEvent, b: CalendarEvent): number {
  if (a.allDay !== b.allDay) return a.allDay ? -1 : 1;
  return (a.time ?? '').localeCompare(b.time ?? '');
}

/** Een eigen notitie gaat mee, een lange omschrijving uit Parro of een agenda niet. */
function eigenNotitie(e: CalendarEvent): string | undefined {
  const notitie = e.notes?.trim();
  if (!notitie) return undefined;
  if (e.source !== 'local' && notitie === (e.syncedNotes ?? '').trim()) return undefined;
  return notitie.length > 80 ? `${notitie.slice(0, 78)}…` : notitie;
}

function beschrijf(e: CalendarEvent): string {
  const wie = e.person === 'gezin' ? '' : `${peopleNames(e)}: `;
  const wanneer = e.allDay ? '' : `${e.time} `;
  let regel = `• ${wanneer}${wie}${e.title}`;

  if (e.sitter) regel += ` (oppas ${e.sitter.name}, ${e.sitter.start}–${e.sitter.end})`;

  const notitie = eigenNotitie(e);
  if (notitie) regel += `\n   ${notitie}`;

  const mee = e.bring.filter((b) => !b.done).map((b) => b.text);
  if (mee.length > 0) regel += `\n   meenemen: ${mee.join(', ')}`;
  return regel;
}

/** Wat er naast de agenda van morgen nog in de melding kan. */
export interface ExtraRegels {
  /** De naam van een feestdag of gezinsdag morgen, zoals "Koningsdag". */
  feestdag?: string;
  /** Regels over verjaardagen waar je binnenkort een cadeau voor wilt hebben. */
  cadeauRegels?: string[];
}

/**
 * Geeft null als er niets te melden is. `garantieRegels` zijn de losse regels over garanties en
 * retourtermijnen die bijna aflopen; `extra` bevat een feestdag van morgen en de cadeau-regels.
 * Die komen onder de agenda van morgen, of staan er alleen als morgen niets gepland is.
 */
export function bouwHerinnering(
  events: CalendarEvent[],
  morgen: string,
  garantieRegels: string[] = [],
  extra: ExtraRegels = {},
): Herinnering | null {
  const relevant = events
    .filter((e) => e.reminder !== false)
    .filter((e) => coversDate(e, morgen))
    .sort(sortByTime);

  const lijst = (kop: string, regels: string[]) => (regels.length > 0 ? `${kop}\n${regels.map((r) => `• ${r}`).join('\n')}` : '');
  const garantie = lijst('Garantie en retour:', garantieRegels);
  const cadeau = lijst('Cadeau regelen:', extra.cadeauRegels ?? []);
  const feest = extra.feestdag ? `Morgen is het ${extra.feestdag}.` : '';

  if (relevant.length === 0 && !feest) {
    if (!garantie && !cadeau) return null;
    if (garantie && !cadeau) {
      return { title: 'Garantie en retour', body: garantie, url: '/?view=bonnetjes', tag: `garantie-${morgen}` };
    }
    if (cadeau && !garantie) {
      return { title: 'Cadeau regelen', body: cadeau, url: '/?view=mensen', tag: `cadeau-${morgen}` };
    }
    return { title: 'Garantie en cadeau', body: `${garantie}\n\n${cadeau}`, url: '/', tag: `regelen-${morgen}` };
  }

  const aantalMee = relevant.reduce((n, e) => n + e.bring.filter((b) => !b.done).length, 0);
  const agenda = relevant.map(beschrijf).join('\n') + (aantalMee > 0 ? `\n\n${aantalMee} ding${aantalMee === 1 ? '' : 'en'} klaarzetten.` : '');

  return {
    title: `Morgen — ${formatLong(morgen)}`,
    body: [feest, agenda, garantie, cadeau].filter(Boolean).join('\n\n'),
    url: `/?date=${morgen}`,
    tag: `dag-${morgen}`,
  };
}
