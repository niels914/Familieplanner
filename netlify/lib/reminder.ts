/**
 * Stelt de avondherinnering samen. Los van het versturen, zodat de tekst te
 * testen is: juist hier moet "zwemles, meenemen: kleren om in te zwemmen"
 * gegarandeerd in staan.
 */

import type { CalendarEvent } from '../../shared/types';
import { PERSON_LABEL } from '../../shared/types';
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
  const wie = e.person === 'gezin' ? '' : `${PERSON_LABEL[e.person]}: `;
  const wanneer = e.allDay ? '' : `${e.time} `;
  let regel = `• ${wanneer}${wie}${e.title}`;

  if (e.sitter) regel += ` (oppas ${e.sitter.name}, ${e.sitter.start}–${e.sitter.end})`;

  const notitie = eigenNotitie(e);
  if (notitie) regel += `\n   ${notitie}`;

  const mee = e.bring.filter((b) => !b.done).map((b) => b.text);
  if (mee.length > 0) regel += `\n   meenemen: ${mee.join(', ')}`;
  return regel;
}

/**
 * Geeft null als er niets te melden is. `garantieRegels` zijn de losse regels over garanties en
 * retourtermijnen die bijna aflopen; die komen onder de agenda van morgen, of staan er alleen als
 * morgen niets gepland is. `reis` is een reis die morgen vertrekt en nog niet ingepakt is: de melding
 * opent dan de paklijst in plaats van de agenda.
 */
export function bouwHerinnering(
  events: CalendarEvent[],
  morgen: string,
  garantieRegels: string[] = [],
  reis?: { id: string; regels: string[] },
): Herinnering | null {
  const relevant = events
    .filter((e) => e.reminder !== false)
    .filter((e) => coversDate(e, morgen))
    .sort(sortByTime);

  const garantie = garantieRegels.length > 0 ? `Garantie en retour:\n${garantieRegels.map((r) => `• ${r}`).join('\n')}` : '';

  const paklijst = reis && reis.regels.length > 0 ? reis.regels.join('\n') : '';
  const url = reis && paklijst ? `/?trip=${reis.id}` : `/?date=${morgen}`;

  if (relevant.length === 0) {
    if (!garantie && !paklijst) return null;
    if (!paklijst) {
      return { title: 'Garantie en retour', body: garantie, url: '/?view=bonnetjes', tag: `garantie-${morgen}` };
    }
    return {
      title: `Morgen — ${formatLong(morgen)}`,
      body: [paklijst, garantie].filter(Boolean).join('\n\n'),
      url,
      tag: `dag-${morgen}`,
    };
  }

  const aantalMee = relevant.reduce((n, e) => n + e.bring.filter((b) => !b.done).length, 0);

  return {
    title: `Morgen — ${formatLong(morgen)}`,
    body:
      relevant.map(beschrijf).join('\n') +
      (aantalMee > 0 ? `\n\n${aantalMee} ding${aantalMee === 1 ? '' : 'en'} klaarzetten.` : '') +
      (paklijst ? `\n\n${paklijst}` : '') +
      (garantie ? `\n\n${garantie}` : ''),
    url,
    tag: `dag-${morgen}`,
  };
}
