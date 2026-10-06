/**
 * De werkagenda van Niels: alleen wat de randen van de dag raakt komt in de app.
 *
 * Een afspraak komt binnen als Niels er vroeg voor weg moet (voor 08:00) of er laat van
 * thuiskomt (na 18:00), reistijd meegerekend. Alles daartussen en alle hele-dagafspraken
 * blijven buiten de app. Daarnaast maken we per dag een "weg"-item voor het ochtend- en
 * het avondritme, zodat de signalering van "allebei weg" ze meeneemt.
 *
 * Reistijd komt uit een blok met als titel "rt" (of "reistijd") vlak voor of na de afspraak.
 * Is er geen blok maar wel een fysieke locatie, dan schatten we een vaste reistijd.
 *
 * Alles hier is rekenwerk zonder scherm of netwerk, zodat de regels te testen zijn.
 */

import { toMin } from './signals';

/** Zo kijkt dit bestand naar een afspraak; de agenda-inlezer levert dit. */
export interface WerkInput {
  uid: string;
  summary: string;
  description?: string;
  location?: string;
  /** 'YYYY-MM-DD' */
  date: string;
  endDate?: string;
  allDay: boolean;
  time?: string;
  endTime?: string;
}

/** Wat we overnemen: een afspraak, of een weg-item voor het ochtend- of avondritme. */
export interface WerkOutput extends WerkInput {
  category?: 'weg';
  /** Meenemen in de avondmelding. Standaard niet (werkafspraken horen daar niet in). */
  reminder?: boolean;
}

export interface WerkSettings {
  /** Vertrek je vóór dit uur, dan telt het als vroeg weg. */
  earlyBefore: string;
  /** Ben je pas ná dit uur thuis, dan telt het als laat thuis. */
  lateAfter: string;
  /** Tot wanneer het ochtendritme loopt (de kinderen vertrekken). */
  morningUntil: string;
  /** Reistijd per kant als er een fysieke locatie is maar geen rt-blok, in minuten. */
  travelMin: number;
}

export const DEFAULT_WERK: WerkSettings = { earlyBefore: '08:00', lateAfter: '18:00', morningUntil: '08:30', travelMin: 45 };

const isTime = (v: unknown): v is string => typeof v === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(v);

/** De instellingen met een veilige terugval: een ongeldige waarde wordt de standaard. */
export function werkSettings(raw?: Partial<WerkSettings>): WerkSettings {
  const travel = Number(raw?.travelMin);
  return {
    earlyBefore: isTime(raw?.earlyBefore) ? raw!.earlyBefore! : DEFAULT_WERK.earlyBefore,
    lateAfter: isTime(raw?.lateAfter) ? raw!.lateAfter! : DEFAULT_WERK.lateAfter,
    morningUntil: isTime(raw?.morningUntil) ? raw!.morningUntil! : DEFAULT_WERK.morningUntil,
    travelMin: Number.isFinite(travel) && travel >= 0 && travel <= 240 ? Math.round(travel) : DEFAULT_WERK.travelMin,
  };
}

/** Een blok dat reistijd voorstelt: de titel begint met "rt" of "reistijd". */
export const isRt = (title: string): boolean => /^\s*(rt|reistijd)\b/i.test(title);

/** Locaties waar je niet naartoe reist. */
const ONLINE = /\b(teams|zoom|webex|skype|meet|online|virtueel|virtual|thuis|home|remote|op afstand)\b|https?:\/\/|www\./i;

/** Een locatie waar je naartoe moet reizen: er staat iets, en het is niet online of thuis. */
export const needsTravel = (location: string | undefined): boolean => {
  const loc = location?.trim();
  return Boolean(loc) && !ONLINE.test(loc!);
};

const pad = (n: number) => String(n).padStart(2, '0');
const fmt = (min: number): string => {
  const c = Math.max(0, Math.min(1439, Math.round(min)));
  return `${pad(Math.floor(c / 60))}:${pad(c % 60)}`;
};
const floor5 = (m: number) => Math.floor(m / 5) * 5;
const ceil5 = (m: number) => Math.ceil(m / 5) * 5;

/** "1 u 30 min", "45 min", "2 u". */
export function durationLabel(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} u` : `${h} u ${m} min`;
}

/** Een afspraak met de tijden in minuten, en wat we van de reistijd weten. */
interface Slot {
  src: WerkInput;
  start: number;
  end: number;
  /** Reistijd heen en terug in minuten; 0 als er geen reis is. */
  before: number;
  after: number;
  /** Staat de reistijd in de agenda (rt-blok), of is het een schatting? */
  beforeFrom: 'agenda' | 'schatting' | null;
  afterFrom: 'agenda' | 'schatting' | null;
  travels: boolean;
}

const RT_MARGIN = 10;
const GUESS_DURATION = 60;

export interface WerkResult {
  /** Wat in de app terechtkomt: de afspraken aan de randen en de weg-items. */
  items: WerkOutput[];
  /** Hoeveel afspraken uit de agenda zijn overgenomen (zonder de weg-items). */
  taken: number;
}

/**
 * Bepaalt wat uit de werkagenda in de app komt.
 * @param homeTime  wanneer jullie normaal thuis zijn; het avondritme begint daar
 */
export function planWerk(events: WerkInput[], settings: WerkSettings, homeTime: string): WerkResult {
  const early = toMin(settings.earlyBefore);
  const late = toMin(settings.lateAfter);

  const byDate = new Map<string, WerkInput[]>();
  for (const e of events) {
    // Hele dagen en afspraken over meerdere dagen laten we buiten beschouwing.
    if (e.allDay || !e.time || (e.endDate && e.endDate > e.date)) continue;
    byDate.set(e.date, [...(byDate.get(e.date) ?? []), e]);
  }

  const items: WerkOutput[] = [];
  let taken = 0;

  for (const [date, list] of [...byDate].sort(([a], [b]) => a.localeCompare(b))) {
    const times = (e: WerkInput) => {
      const start = toMin(e.time!);
      let end = e.endTime ? toMin(e.endTime) : start + GUESS_DURATION;
      if (end <= start) end = e.endTime ? 1440 : start + GUESS_DURATION;
      return { start, end: Math.min(1440, end) };
    };

    const rts = list.filter((e) => isRt(e.summary)).map((src) => ({ src, ...times(src), used: false }));
    const others = list.filter((e) => !isRt(e.summary));

    const slots: Slot[] = others.map((src) => {
      const { start, end } = times(src);
      const rtBefore = rts.find((r) => !r.used && Math.abs(r.end - start) <= RT_MARGIN);
      if (rtBefore) rtBefore.used = true;
      const rtAfter = rts.find((r) => !r.used && Math.abs(r.start - end) <= RT_MARGIN);
      if (rtAfter) rtAfter.used = true;

      const physical = needsTravel(src.location);
      const before = rtBefore ? rtBefore.end - rtBefore.start : physical ? settings.travelMin : 0;
      const after = rtAfter ? rtAfter.end - rtAfter.start : physical ? settings.travelMin : 0;
      return {
        src,
        start,
        end,
        before,
        after,
        beforeFrom: rtBefore ? 'agenda' : physical ? 'schatting' : null,
        afterFrom: rtAfter ? 'agenda' : physical ? 'schatting' : null,
        travels: Boolean(rtBefore || rtAfter || physical),
      };
    });

    // Een rt-blok zonder afspraak ernaast: we weten niet waarheen, maar wel dat je onderweg bent.
    const losseRt = rts.filter((r) => !r.used);

    // -- wat komt binnen
    const kept = slots.filter((s) => s.start - s.before < early || s.end + s.after > late);
    const keptRt = losseRt.filter((r) => r.start < early || r.end > late);

    for (const s of kept) {
      const lines: string[] = [];
      if (s.before > 0) lines.push(`Reistijd heen: ${durationLabel(s.before)} (${s.beforeFrom === 'agenda' ? 'uit je agenda' : 'geschat'})`);
      if (s.after > 0) lines.push(`Reistijd terug: ${durationLabel(s.after)} (${s.afterFrom === 'agenda' ? 'uit je agenda' : 'geschat'})`);
      items.push({
        uid: s.src.uid,
        summary: s.src.summary,
        location: s.src.location,
        date,
        allDay: false,
        time: s.src.time,
        endTime: s.src.endTime,
        description: lines.length > 0 ? lines.join('\n') : undefined,
      });
    }
    for (const r of keptRt) {
      items.push({
        uid: r.src.uid,
        summary: r.src.summary,
        location: r.src.location,
        date,
        allDay: false,
        time: r.src.time,
        endTime: r.src.endTime,
      });
    }
    taken += kept.length + keptRt.length;

    // -- wanneer is Niels weg van huis? Alleen afspraken met reistijd tellen; een online gesprek
    //    om 07:30 vanuit de woonkamer is geen "weg".
    const travelling = slots.filter((s) => s.travels);
    let leave = Infinity;
    let leaveWhy = '';
    let home = -Infinity;
    let homeWhy = '';
    for (const s of travelling) {
      const l = s.start - s.before;
      if (l < leave) {
        leave = l;
        leaveWhy = `${s.src.summary} om ${s.src.time}, ${s.before > 0 ? `${durationLabel(s.before)} reistijd (${s.beforeFrom === 'agenda' ? 'uit je agenda' : 'geschat'})` : 'geen reistijd opgegeven'}`;
      }
      const h = s.end + s.after;
      if (h > home) {
        home = h;
        homeWhy = `${s.src.summary} tot ${s.src.endTime ?? fmt(s.end)}, ${s.after > 0 ? `${durationLabel(s.after)} reistijd (${s.afterFrom === 'agenda' ? 'uit je agenda' : 'geschat'})` : 'geen reistijd opgegeven'}`;
      }
    }
    for (const r of losseRt) {
      if (r.start < leave) {
        leave = r.start;
        leaveWhy = `Reistijd (${r.src.summary}) vanaf ${r.src.time}`;
      }
      if (r.end > home) {
        home = r.end;
        homeWhy = `Reistijd (${r.src.summary}) tot ${r.src.endTime ?? fmt(r.end)}`;
      }
    }

    if (leave < early) {
      const start = Math.max(0, floor5(leave));
      const end = Math.max(toMin(settings.morningUntil), early);
      items.push({
        uid: `dag:${date}:ochtend`,
        summary: `Niels weg om ${fmt(start)}`,
        description: leaveWhy,
        date,
        allDay: false,
        time: fmt(start),
        endTime: fmt(end),
        category: 'weg',
        reminder: true,
      });
    }
    if (home > late) {
      const end = Math.min(1439, ceil5(home));
      const start = Math.min(toMin(homeTime), late);
      items.push({
        uid: `dag:${date}:avond`,
        summary: `Niels thuis om ${fmt(end)}`,
        description: homeWhy,
        date,
        allDay: false,
        time: fmt(start),
        endTime: fmt(end),
        category: 'weg',
        reminder: true,
      });
    }
  }

  return { items, taken };
}
