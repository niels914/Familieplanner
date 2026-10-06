/**
 * Meeneem-suggesties uit de tekst van een schoolbericht.
 *
 * Staat er in een Parro-bericht "neem gymschoenen mee", dan stelt de app voor om
 * dat als meeneem-item over te nemen. Het blijft een voorstel: er wordt nooit iets
 * automatisch toegevoegd. Alles hier is berekend uit de tekst en wordt niet bewaard;
 * alleen wat jullie afwijzen ("Niet nodig") staat op het item.
 *
 * Het is bewust een strakke, voorspelbare regelset en geen gokwerk. Liever een
 * zin missen dan een verkeerd item voorstellen.
 */

import type { CalendarEvent } from './types';

export interface BringSuggestion {
  text: string;
  /** Genormaliseerde sleutel, om af te wijzen en dubbelen te herkennen. */
  key: string;
}

const MAX_PER_EVENT = 5;
const MAX_WORDS = 4;
const MAX_LENGTH = 40;

/** Woorden die vooraan een voorwerp niet bij het voorwerp horen. */
const LEAD_WORDS = new Set(
  (
    'de het een ook graag alvast alsjeblieft alstublieft svp even dan dus wij we jullie u je jij uw jouw ' +
    'zijn haar hun kind kinderen leerlingen iedereen elk elke morgen vandaag overmorgen maandag dinsdag woensdag ' +
    'donderdag vrijdag zaterdag zondag moet moeten mag mogen kan kunnen wil wilt willen zal zullen vergeet ' +
    'vergeten niet denk denkt aan dat om te zorg zorgt zorgen er voor nog allemaal allen dan'
  ).split(' '),
);

/** Waar een voorwerp ophoudt en de toelichting begint. */
const CLAUSE_CUT =
  /\s+(?:voor|naar|op|bij|tijdens|omdat|zodat|want|als|aan|van thuis|waar|waarin|waarmee)\s+.*$|\s*\(.*$/i;

/** Een zin die zegt dat het juist niet hoeft. */
const NEGATION = /\b(?:geen|niet|hoeft|hoeven|nooit|zonder)\b/i;

const LIST_HEADING =
  /\b(?:wat\s+moet\s+(?:er\s+)?mee|wat\s+nemen\s+we\s+mee|neem\s+(?:het\s+volgende\s+)?mee|meenemen|mee\s+te\s+nemen|meebrengen|mee\s+te\s+brengen|benodigdheden|meegeven|mee\s+te\s+geven)\b[^:\n]*:/i;

/** Een voorwerp met deze woorden is een vage omschrijving, geen ding om in te pakken. */
const VAGUE = /\b(?:alles|wat|nodig|hebben|iets|jullie|dingen)\b/i;

const BULLET = /^\s*(?:[-*•–]|\d+[.)])\s+/;

/** Kleine letters, zonder leestekens en lidwoord, om te vergelijken. */
export function suggestionKey(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .split(/\s+/)
    .filter((w) => w && w !== 'de' && w !== 'het' && w !== 'een')
    .join(' ');
}

function stripLead(words: string[]): string[] {
  let i = 0;
  while (i < words.length - 1 && LEAD_WORDS.has(words[i].toLowerCase())) i++;
  return words.slice(i);
}

/** Eén voorwerp schoonmaken: voorloopwoorden en toelichting eraf. */
function cleanItem(raw: string): string | null {
  const cut = raw.replace(CLAUSE_CUT, '').replace(/[.!?:;"'“”‘’]+/g, ' ').trim();
  const words = stripLead(cut.split(/\s+/).filter(Boolean));
  const text = words.join(' ').trim();
  if (text.length < 2 || text.length > MAX_LENGTH) return null;
  if (words.length > MAX_WORDS) return null;
  if (!/\p{L}/u.test(text) || VAGUE.test(text)) return null;
  if (words.every((w) => LEAD_WORDS.has(w.toLowerCase()))) return null;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** "a, b en c" of "a of b" in losse voorwerpen. */
function splitList(object: string): string[] {
  return object
    .split(/\s*(?:,|;|\bplus\b|\+|\ben\b|\bof\b|\/)\s*/i)
    .map(cleanItem)
    .filter((s): s is string => s !== null);
}

/**
 * De voorwerpen die in één zin staan, of niets. Drie vormen:
 *  - "Neem morgen gymschoenen mee"
 *  - "De kinderen moeten een bidon en fruit meenemen"
 *  - (lijsten met een kopje staan in `itemsInText`)
 */
function itemsInSentence(sentence: string): string[] {
  // "Vergeet niet ..." bevat "niet" maar is juist een aanmoediging.
  const plain = sentence.replace(/\bvergeet\s+(?:je\s+|u\s+)?niet\b|\bniet\s+(?:te\s+)?vergeten\b/gi, 'vergeet');
  if (NEGATION.test(plain)) return [];

  // Werkwoord eerst: "neem X mee", "breng X mee", "geef uw kind X mee".
  const verbFirst = plain.match(
    /\b(?:neem|neemt|nemen|breng|brengt|brengen|geef|geeft|geven)\b\s+(.+?)\s+(?:mee|met\s+(?:je|u|hem|haar)\s+mee)\b/i,
  );
  if (verbFirst) return splitList(verbFirst[1]);

  // Voorwerp eerst: "X meenemen", "X mee te geven".
  const objectFirst = plain.match(
    /(.+?)\s+(?:mee\s*te\s*(?:nemen|geven|brengen)|mee\s*(?:nemen|geven|brengen|neemt|geeft|brengt)|meegeven|meenemen|meebrengen)\b/i,
  );
  if (objectFirst) {
    // Alles tot en met het laatste hulpwerkwoord ("moeten", "wilt u") is onderwerp.
    const object = objectFirst[1].replace(
      /^.*\b(?:moeten|moet|mogen|mag|kunnen|kan|willen|wil|wilt|zullen|zal|graag|vergeet|denk\s+aan|denkt\s+u\s+aan|zorg\s+dat|zorgt\s+u\s+dat)\b\s*(?:u\b|je\b|jij\b)?/i,
      '',
    );
    return splitList(object);
  }
  return [];
}

/** Alle voorwerpen uit een stuk tekst, in volgorde, zonder dubbelen. */
export function itemsInText(text: string): string[] {
  const found: string[] = [];
  const lines = text.split(/\r?\n/);

  const rest: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const heading = line.match(LIST_HEADING);
    if (!heading) {
      rest.push(line);
      continue;
    }
    // "Meenemen: a, b en c" op één regel, of "Meenemen:" met streepjes eronder.
    const inline = line.slice((heading.index ?? 0) + heading[0].length).trim();
    if (inline) {
      found.push(...splitList(inline.replace(/[.!?]+$/, '')));
      continue;
    }
    while (i + 1 < lines.length && BULLET.test(lines[i + 1])) {
      i++;
      const item = cleanItem(lines[i].replace(BULLET, ''));
      if (item) found.push(item);
    }
  }

  for (const sentence of rest.join('\n').split(/[.!?\n;]+/)) {
    if (sentence.trim()) found.push(...itemsInSentence(sentence));
  }

  const seen = new Set<string>();
  return found.filter((item) => {
    const key = suggestionKey(item);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Staat dit al in het lijstje? Ook "gymschoenen" tegenover "gymschoenen met naam". */
function alreadyThere(key: string, others: string[]): boolean {
  return others.some((o) => o === key || (key.length >= 4 && o.length >= 4 && (o.includes(key) || key.includes(o))));
}

/**
 * De suggesties voor één item: alleen voor Parro-berichten die nog niet voorbij zijn,
 * zonder wat al in het meeneem-lijstje staat en zonder wat jullie hebben afgewezen.
 */
export function bringSuggestions(
  event: Pick<CalendarEvent, 'source' | 'title' | 'notes' | 'syncedNotes' | 'bring' | 'suggestionsOff' | 'date' | 'endDate'>,
  today: string,
): BringSuggestion[] {
  if (event.source !== 'parro') return [];
  if ((event.endDate ?? event.date) < today) return [];

  const text = [event.title, event.syncedNotes, event.notes !== event.syncedNotes ? event.notes : undefined]
    .filter(Boolean)
    .join('\n');
  const have = event.bring.map((b) => suggestionKey(b.text));
  const off = event.suggestionsOff ?? [];

  const out: BringSuggestion[] = [];
  for (const item of itemsInText(text)) {
    const key = suggestionKey(item);
    if (off.includes(key) || alreadyThere(key, have)) continue;
    out.push({ text: item, key });
    if (out.length === MAX_PER_EVENT) break;
  }
  return out;
}
