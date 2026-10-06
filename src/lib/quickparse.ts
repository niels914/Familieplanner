/**
 * Snel invoeren in gewone taal: "matthijs volgende week donderdag lege
 * schoenendoos mee" wordt een item op de juiste dag, met een meeneem-lijstje.
 *
 * Bewust eenvoudig en voorspelbaar: wat de parser oppikt, laat de app als
 * voorbeeld zien voordat je opslaat, zodat je het altijd kunt bijsturen.
 */

import type { Category, PersonId } from '../../shared/types';
import { addDays, isoWeekday, parseYmd, ymd } from '../../shared/dates';

export interface QuickResult {
  title: string;
  date: string;
  time?: string;
  /** Eindtijd, als je een tijdvak noemde ("18:00-22:00", "tot 22:00"). */
  endTime?: string;
  allDay: boolean;
  person: PersonId;
  category: Category;
  bring: string[];
  /** Wat de parser herkende, om aan de gebruiker te tonen. */
  matched: string[];
}

const WEEKDAYS: Record<string, number> = {
  maandag: 1, ma: 1,
  dinsdag: 2, di: 2,
  woensdag: 3, wo: 3,
  donderdag: 4, do: 4,
  vrijdag: 5, vr: 5,
  zaterdag: 6, za: 6,
  zondag: 7, zo: 7,
};

const MONTHS: Record<string, number> = {
  januari: 1, jan: 1,
  februari: 2, feb: 2,
  maart: 3, mrt: 3, maa: 3,
  april: 4, apr: 4,
  mei: 5,
  juni: 6, jun: 6,
  juli: 7, jul: 7,
  augustus: 8, aug: 8,
  september: 9, sep: 9, sept: 9,
  oktober: 10, okt: 10,
  november: 11, nov: 11,
  december: 12, dec: 12,
};

const PERSONS: Array<[RegExp, PersonId]> = [
  [/\bmatthijs\b/i, 'matthijs'],
  [/\bam[ée]lie\b|\bamelie\b|\bameli\b/i, 'amelie'],
  [/\blotte\b/i, 'lotte'],
  [/\birene\b/i, 'irene'],
  [/\bniels\b/i, 'niels'],
];

const CATEGORIES: Array<[RegExp, Category]> = [
  [/\boppas(sen)?\b/i, 'oppas'],
  [/\bjarig\b|\bverjaardag\b|\bfeestje\b/i, 'verjaardag'],
  [/\bvakantie\b|\bvrije? dag\b|\bstudiedag\b/i, 'vrij'],
  [/\bpeuterspeelzaal\b|\bpsz\b|\bpeuter\b/i, 'psz'],
  [/\bopvang\b|\bcr[èe]che\b|\bkinderdagverblijf\b|\bkdv\b/i, 'opvang'],
  [/\bsport\b|\bvoetbal\b|\bhockey\b|\bzwem(les|men)\b|\bturnen\b|\bjudo\b|\btennis\b|\batletiek\b|\bballet\b|\bdansles\b|\bkorfbal\b|\bbasketbal\b/i, 'sport'],
  [/\bschool\b|\bgym\b|\bjuf\b|\bmeester\b|\bklas\b/i, 'school'],
];

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Eerstvolgende dag met dit weeknummer; noem je de dag van vandaag, dan is het vandaag. */
function nextWeekday(today: string, target: number): string {
  const delta = (target - isoWeekday(today) + 7) % 7;
  return addDays(today, delta);
}

export interface QuickOptions {
  /** Wanneer jullie normaal thuis zijn; "later thuis" telt vanaf dat uur. */
  homeTime?: string;
}

const pad2 = (n: number) => String(n).padStart(2, '0');
function clock(h: string | undefined, m: string | undefined): string | undefined {
  if (h === undefined) return undefined;
  const hh = Number(h);
  const mm = Number(m ?? 0);
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return undefined;
  return `${pad2(hh)}:${pad2(mm)}`;
}

export function quickParse(input: string, today: string, options: QuickOptions = {}): QuickResult {
  let rest = ` ${input.trim()} `;
  const matched: string[] = [];

  const consume = (re: RegExp): RegExpMatchArray | null => {
    const m = rest.match(re);
    if (m) {
      rest = rest.replace(m[0], ' ');
      matched.push(m[0].trim());
    }
    return m;
  };

  // --- wie ---
  let person: PersonId = 'gezin';
  for (const [re, id] of PERSONS) {
    if (re.test(rest)) {
      person = id;
      rest = rest.replace(re, ' ');
      matched.push(id);
      break;
    }
  }

  // --- tijdvak ---
  // Vóór de datum: in "19:00-21:00 8-10" mag "00-21" nooit als dag-maand gelezen worden.
  let time: string | undefined;
  let endTime: string | undefined;

  // Een tijdvak: "18:00-22:00", "18:00 tot 22:00", "van 18 tot 22 uur".
  const range =
    rest.match(/\b(\d{1,2})[:.u](\d{2})\s*(?:-|–|tot)\s*(\d{1,2})[:.u](\d{2})\b/i) ??
    rest.match(/\bvan\s+(\d{1,2})(?:[:.u](\d{2}))?\s*(?:uur\s*)?(?:tot|-|–)\s*(\d{1,2})(?:[:.u](\d{2}))?\s*(?:uur)?\b/i);
  if (range) {
    const start = clock(range[1], range[2]);
    const end = clock(range[3], range[4]);
    if (start && end) {
      time = start;
      endTime = end;
      rest = rest.replace(range[0], ' ');
      matched.push(range[0].trim());
    }
  }

  // --- datum ---
  let date = today;
  let dateFound = false;

  const relative = consume(/\b(vandaag|morgen|overmorgen|volgende week|komende week)\b/i);
  let weeksAhead = 0;
  if (relative) {
    const word = relative[1].toLowerCase();
    if (word === 'vandaag') { date = today; dateFound = true; }
    else if (word === 'morgen') { date = addDays(today, 1); dateFound = true; }
    else if (word === 'overmorgen') { date = addDays(today, 2); dateFound = true; }
    else { weeksAhead = 1; date = addDays(today, 7); dateFound = true; }
  }

  consume(/\b(aanstaande|a\.s\.|as)\b/i);

  const weekdayMatch = rest.match(
    /\b(maandag|dinsdag|woensdag|donderdag|vrijdag|zaterdag|zondag)\b/i,
  );
  if (weekdayMatch) {
    const target = WEEKDAYS[weekdayMatch[1].toLowerCase()];
    if (weeksAhead > 0) {
      // "volgende week donderdag": tel vanaf de maandag van volgende week.
      const nextMonday = addDays(today, 8 - isoWeekday(today));
      date = addDays(nextMonday, target - 1);
    } else {
      date = nextWeekday(today, target);
    }
    rest = rest.replace(weekdayMatch[0], ' ');
    matched.push(weekdayMatch[1]);
    dateFound = true;
  }

  if (!dateFound) {
    const named = rest.match(
      /\b(\d{1,2})\s+(januari|jan|februari|feb|maart|mrt|maa|april|apr|mei|juni|jun|juli|jul|augustus|aug|september|sept|sep|oktober|okt|november|nov|december|dec)\b/i,
    );
    if (named) {
      const day = Number(named[1]);
      const month = MONTHS[named[2].toLowerCase()];
      date = resolveDayMonth(today, day, month);
      rest = rest.replace(named[0], ' ');
      matched.push(named[0].trim());
      dateFound = true;
    }
  }

  if (!dateFound) {
    const numeric = rest.match(/\b(\d{1,2})[-/](\d{1,2})(?:[-/](\d{2,4}))?\b/);
    if (numeric) {
      const day = Number(numeric[1]);
      const month = Number(numeric[2]);
      if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        if (numeric[3]) {
          const year = Number(numeric[3].length === 2 ? `20${numeric[3]}` : numeric[3]);
          date = ymd(new Date(year, month - 1, day));
        } else {
          date = resolveDayMonth(today, day, month);
        }
        rest = rest.replace(numeric[0], ' ');
        matched.push(numeric[0]);
        dateFound = true;
      }
    }
  }

  // --- niet thuis / later thuis ---
  // Eerst deze uitdrukkingen, zodat hun tijden hieronder goed gelezen worden.
  const laterThuis = consume(/\blater\s+thuis\b/i);
  const nietThuis = laterThuis ? null : consume(/\bniet\s+thuis\b/i);

  // --- tijd ---
  // "tot 22:00" of "tot 22 uur" geeft de eindtijd.
  if (!endTime) {
    const until = rest.match(/\btot\s+(\d{1,2})(?:[:.u](\d{2})|\s*uur)\b/i);
    if (until) {
      const t = clock(until[1], until[2]);
      if (t) {
        endTime = t;
        rest = rest.replace(until[0], ' ');
        matched.push(until[0].trim());
      }
    }
  }

  if (!time) {
    const timeMatch = rest.match(/\b(?:om\s+)?(\d{1,2})[:.u](\d{2})\b|\bom\s+(\d{1,2})\s*uur\b/i);
    if (timeMatch) {
      const t = clock(timeMatch[1] ?? timeMatch[3], timeMatch[2]);
      if (t) {
        time = t;
        rest = rest.replace(timeMatch[0], ' ');
        matched.push(timeMatch[0].trim());
      }
    }
  }

  // "Later thuis 20:00": je bent dan om 20:00 thuis, en weg vanaf je normale
  // thuiskomst. Eén tijd is hier dus de eindtijd.
  if (laterThuis) {
    if (time && !endTime) {
      endTime = time;
      time = options.homeTime ?? '17:30';
    } else if (!time) {
      time = options.homeTime ?? '17:30';
    }
  }

  // --- categorie ---
  let category: Category = 'anders';
  if (laterThuis || nietThuis) {
    category = 'weg';
  } else {
    for (const [re, cat] of CATEGORIES) {
      if (re.test(rest)) {
        category = cat;
        break;
      }
    }
  }

  // --- meenemen ---
  const bring: string[] = [];
  const explicit = rest.match(/\bmee\s*(?:nemen|geven)?\s*[:\-]\s*(.+)$/i);
  if (explicit) {
    bring.push(...splitItems(explicit[1]));
    rest = rest.replace(explicit[0], ' ');
  } else {
    const trailing = rest.match(/(.+?)\s+mee(?:nemen|geven)?\s*$/i);
    if (trailing) {
      bring.push(...splitItems(trailing[1]));
      rest = ' ';
    }
  }

  let title = rest.replace(/\s+/g, ' ').trim().replace(/^[,;:\-\s]+|[,;:\-\s]+$/g, '');

  if (!title && bring.length > 0) {
    title = `Meenemen: ${bring.join(', ')}`;
  }
  if (!title && laterThuis) title = 'Later thuis';
  if (!title && nietThuis) title = 'Niet thuis';
  if (!title) title = 'Nieuw item';

  if (category === 'anders' && bring.length > 0) {
    if (person === 'matthijs') category = 'school';
    else if (person === 'amelie') category = 'psz';
    else if (person === 'lotte') category = 'opvang';
  }

  return {
    title: capitalize(title),
    date,
    time,
    endTime,
    allDay: !time,
    person,
    category,
    bring,
    matched,
  };
}

function splitItems(text: string): string[] {
  return text
    .split(/,| en /i)
    .map((s) => s.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

/** Dag+maand: dit jaar, tenzij die datum al voorbij is. */
function resolveDayMonth(today: string, day: number, month: number): string {
  const now = parseYmd(today);
  const candidate = new Date(now.getFullYear(), month - 1, day);
  if (ymd(candidate) < today) candidate.setFullYear(now.getFullYear() + 1);
  return ymd(candidate);
}
