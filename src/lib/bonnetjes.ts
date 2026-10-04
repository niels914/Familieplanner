/**
 * Bonnetjes in de lijst: zoeken, filteren en groeperen. Gewone functies zonder scherm,
 * zodat te testen is dat "wasmachine" ook "Wasmachine Bosch" vindt en dat de groepen kloppen.
 */

import type { Receipt } from '../../shared/types';
import { PERSON_LABEL } from '../../shared/types';
import { formatShort } from '../../shared/dates';
import { displayTitle, warrantyEnd, warrantyStatus } from '../../shared/warranty';

export type ReceiptFilter = 'alles' | 'loopt' | 'bijna' | 'verlopen' | 'aanvullen';

export const FILTER_LABEL: Record<ReceiptFilter, string> = {
  alles: 'Alles',
  loopt: 'Loopt',
  bijna: 'Bijna afgelopen',
  verlopen: 'Verlopen',
  aanvullen: 'Nog aanvullen',
};

/** Kleine letters en zonder accenten, zodat "Amélie" en "amelie" hetzelfde zijn. */
const plat = (tekst: string) =>
  tekst
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

/** "129,00" voor 12900 cent. */
export const bedrag = (cent: number) => (cent / 100).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Het bedrag zoals je het typt ("129,50" of "129.5") naar centen; undefined bij leeg of onzin. */
export function parseBedrag(tekst: string): number | undefined {
  const schoon = tekst.replace(/[€\s]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.');
  if (!schoon) return undefined;
  const getal = Number(schoon);
  return Number.isFinite(getal) && getal >= 0 ? Math.round(getal * 100) : undefined;
}

/** Zoek in titel, winkel, serienummer, notitie, van wie en het bedrag. Alle woorden moeten voorkomen. */
export function searchReceipts(receipts: Receipt[], query: string): Receipt[] {
  const woorden = plat(query).split(/\s+/).filter(Boolean);
  if (woorden.length === 0) return receipts;
  return receipts.filter((r) => {
    const hooi = plat(
      [
        displayTitle(r),
        r.store,
        r.serial,
        r.notes,
        PERSON_LABEL[r.person],
        r.amountCents !== undefined ? `${bedrag(r.amountCents)} ${Math.round(r.amountCents / 100)}` : '',
      ]
        .filter(Boolean)
        .join(' '),
    );
    return woorden.every((w) => hooi.includes(w));
  });
}

export type GroupId = 'aanvullen' | 'bijna' | 'loopt' | 'geen' | 'verlopen';

export interface ReceiptGroup {
  id: GroupId;
  label: string;
  items: Receipt[];
}

const GROUP_LABEL: Record<GroupId, string> = {
  aanvullen: 'Nog aanvullen',
  bijna: 'Loopt bijna af',
  loopt: 'Loopt',
  geen: 'Zonder garantie',
  verlopen: 'Verlopen',
};

/** In welke groep hoort dit bonnetje? Wat nog aangevuld moet worden gaat voor. */
export function groupOf(r: Receipt, today: string): GroupId {
  if (!r.title.trim()) return 'aanvullen';
  const status = warrantyStatus(r, today);
  if (status.kind === 'bijna') return 'bijna';
  if (status.kind === 'loopt') return 'loopt';
  if (status.kind === 'verlopen') return 'verlopen';
  return 'geen';
}

const FILTER_GROUPS: Record<ReceiptFilter, GroupId[]> = {
  alles: ['aanvullen', 'bijna', 'loopt', 'geen', 'verlopen'],
  loopt: ['bijna', 'loopt'],
  bijna: ['bijna'],
  verlopen: ['verlopen'],
  aanvullen: ['aanvullen'],
};

/**
 * De lijst in groepen, in vaste volgorde. Wat het eerst afloopt staat bovenaan bij "bijna",
 * de rest begint bij het nieuwste bonnetje. Lege groepen verdwijnen.
 */
export function receiptGroups(receipts: Receipt[], today: string, filter: ReceiptFilter = 'alles'): ReceiptGroup[] {
  const nieuwste = (a: Receipt, b: Receipt) => b.purchaseDate.localeCompare(a.purchaseDate) || b.createdAt.localeCompare(a.createdAt);
  const eerstAf = (a: Receipt, b: Receipt) => (warrantyEnd(a) ?? '').localeCompare(warrantyEnd(b) ?? '');

  return FILTER_GROUPS[filter]
    .map((id): ReceiptGroup => ({
      id,
      label: GROUP_LABEL[id],
      items: receipts.filter((r) => groupOf(r, today) === id).sort(id === 'bijna' ? eerstAf : nieuwste),
    }))
    .filter((g) => g.items.length > 0);
}

/** Hoeveel bonnetjes er per filter zijn, voor de getallen bij de knoppen. */
export function filterCounts(receipts: Receipt[], today: string): Record<ReceiptFilter, number> {
  const telling: Record<GroupId, number> = { aanvullen: 0, bijna: 0, loopt: 0, geen: 0, verlopen: 0 };
  for (const r of receipts) telling[groupOf(r, today)]++;
  return {
    alles: receipts.length,
    loopt: telling.bijna + telling.loopt,
    bijna: telling.bijna,
    verlopen: telling.verlopen,
    aanvullen: telling.aanvullen,
  };
}

/** "12 mrt 2028": een datum met jaar, want een garantie loopt vaak over jaren. */
export const datumMetJaar = (datum: string) => `${formatShort(datum)} ${datum.slice(0, 4)}`;
