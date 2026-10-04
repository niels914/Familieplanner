/** Gedeelde types tussen de web-app en de Netlify Functions. */

export type PersonId = 'matthijs' | 'amelie' | 'lotte' | 'gezin' | 'niels' | 'irene';

/** De kinderen, in volgorde van leeftijd. Gebruikt voor filters, het breng- en
 *  haalschema en de contactenlijst. */
export type ChildId = 'matthijs' | 'amelie' | 'lotte';
export const CHILDREN: ChildId[] = ['matthijs', 'amelie', 'lotte'];

export type Category =
  | 'school'
  | 'psz'
  | 'opvang'
  | 'oppas'
  | 'afspraak'
  | 'verjaardag'
  | 'vrij'
  | 'anders';

export interface BringItem {
  id: string;
  text: string;
  done: boolean;
}

export interface SitterDetails {
  /** Verwijzing naar een contact met kind 'oppas'; leeg als je een losse naam invult. */
  contactId?: string;
  name: string;
  start: string; // 'HH:MM'
  end: string; // 'HH:MM'
  /** Uurtarief in euro. 0 = onbetaald (opa/oma). */
  rate: number;
  paid: boolean;
}

export interface CalendarEvent {
  id: string;
  /** 'parro' komt uit de schoolagenda en wordt bij elke sync overschreven. */
  source: 'local' | 'parro';
  parroUid?: string;
  title: string;
  /** 'YYYY-MM-DD' */
  date: string;
  /** Laatste dag bij meerdaagse items, inclusief. Leeg = eendaags. */
  endDate?: string;
  allDay: boolean;
  /** 'HH:MM', alleen als allDay false is. */
  time?: string;
  endTime?: string;
  person: PersonId;
  category: Category;
  bring: BringItem[];
  notes?: string;
  /** Wat Parro bij de laatste sync als omschrijving gaf. Zo weten we of jij de
   *  notitie hebt aangepast en laten we die met rust. */
  syncedNotes?: string;
  /** Meenemen in de avondherinnering van de dag ervoor. */
  reminder: boolean;
  sitter?: SitterDetails;
  location?: string;
  createdAt: string;
  updatedAt: string;
}

export type ParentRole = 'moeder' | 'vader' | 'verzorger';

export interface Parent {
  id: string;
  name: string;
  role: ParentRole;
  phone?: string;
  email?: string;
}

export type ContactKind = 'klasgenoot' | 'oppas' | 'overig';

export interface Contact {
  id: string;
  kind: ContactKind;
  /** Naam van het klasgenootje, de oppas of de contactpersoon. */
  name: string;
  /** Van welk kind is dit een klasgenootje. */
  childOf?: ChildId;
  group?: string;
  /** 'YYYY-MM-DD' of '--MM-DD' als het jaar onbekend is. */
  birthday?: string;
  giftIdeas?: string;
  parents: Parent[];
  /** Alleen bij kind 'oppas'. */
  sitterRate?: number;
  phone?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type Weekday = 1 | 2 | 3 | 4 | 5;

export interface PickupRule {
  id: string;
  weekday: Weekday;
  child: ChildId;
  /** Wie brengt. Leeg = nog niet afgesproken. */
  dropoff?: string;
  /** Wie haalt. */
  pickup?: string;
  note?: string;
}

export interface PickupOverride {
  id: string;
  date: string;
  child: ChildId;
  dropoff?: string;
  pickup?: string;
  note?: string;
}

export interface ShoppingItem {
  id: string;
  text: string;
  done: boolean;
  /** Waar het vandaan komt, bijv. 'Weekmenu: lasagne'. */
  source?: string;
  createdAt: string;
}

export interface Meal {
  /** 'YYYY-MM-DD' is de sleutel. */
  date: string;
  dish: string;
  notes?: string;
  ingredients: string[];
}

export interface PushSubscriptionRecord {
  id: string;
  endpoint: string;
  keys: { p256dh: string; auth: string };
  label: string;
  createdAt: string;
}

export interface Settings {
  /** Uur in Europe/Amsterdam waarop de avondherinnering gaat. */
  reminderHour: number;
  /** Laatste succesvolle Parro-sync. */
  parroLastSync?: string;
  parroLastResult?: string;
  parroEventCount?: number;
  lastReminderDate?: string;
  /** Aan welk kind Parro-items gekoppeld worden. */
  parroPerson?: ChildId;
  /** Vaste info die je met de oppas deelt. */
  sitterBriefing?: string;
}

// ------------------------------------------------------------------ paklijst

/** Soorten reizen. Bepaalt welke spullen uit de masterlijst op de paklijst komen. */
export type TripKind = 'kamperen' | 'huisje' | 'logeren';
export const TRIP_KINDS: TripKind[] = ['kamperen', 'huisje', 'logeren'];
export const TRIP_KIND_LABEL: Record<TripKind, string> = {
  kamperen: 'Kamperen',
  huisje: 'Huisje',
  logeren: 'Logeren',
};

/** Wie er mee kan op reis. */
export type PackPerson = 'matthijs' | 'amelie' | 'lotte' | 'irene' | 'niels';
export const PACK_PEOPLE: PackPerson[] = ['matthijs', 'amelie', 'lotte', 'irene', 'niels'];

/** De kolommen van de oorspronkelijke Excel: eerst de gezamenlijke spullen,
 *  dan een lijst per persoon. */
export type PackGroup =
  | 'tent'
  | 'servies'
  | 'matthijs'
  | 'amelie'
  | 'lotte'
  | 'irene'
  | 'niels'
  | 'handdoeken'
  | 'overig';

export const PACK_GROUPS: PackGroup[] = [
  'tent',
  'servies',
  'matthijs',
  'amelie',
  'lotte',
  'irene',
  'niels',
  'handdoeken',
  'overig',
];

export const PACK_GROUP_LABEL: Record<PackGroup, string> = {
  tent: 'Tent en toebehoren',
  servies: 'Servies en keuken',
  matthijs: 'Matthijs',
  amelie: 'Amélie',
  lotte: 'Lotte',
  irene: 'Irene',
  niels: 'Niels',
  handdoeken: 'Handdoeken en doeken',
  overig: 'Overig',
};

/** Korte naam voor in een regel, waar het volledige label te lang is. */
export const PACK_GROUP_SHORT: Record<PackGroup, string> = {
  tent: 'Tent',
  servies: 'Keuken',
  matthijs: 'Matthijs',
  amelie: 'Amélie',
  lotte: 'Lotte',
  irene: 'Irene',
  niels: 'Niels',
  handdoeken: 'Doeken',
  overig: 'Overig',
};

/** Groepen die bij één persoon horen; ze verdwijnen als die persoon niet mee is. */
export const PACK_GROUP_PERSON: Partial<Record<PackGroup, PackPerson>> = {
  matthijs: 'matthijs',
  amelie: 'amelie',
  lotte: 'lotte',
  irene: 'irene',
  niels: 'niels',
};

/** Een zomervakantie van 2 tot 2,5 week; de aantallen in de masterlijst gelden hiervoor. */
export const PACK_BASE_NIGHTS = 14;

/** Plekken waar spullen in of op de auto en het karretje terechtkomen, in
 *  de volgorde waarin je inlaadt. */
export const DEFAULT_PACK_LOCATIONS = [
  'Karretje (los)',
  'Krat zeilen',
  'Krat servies & koken',
  'Krat speelgoed',
  'Krat kookstel',
  'Krat tentspullen',
  'Krat snoeren & overig',
  'Fietsen op karretje',
  'Dakkoffer',
  'Auto',
  'Tas Niels',
  'Tas Irene',
  'Tas Amélie',
  'Tas Matthijs',
];

/** Eén ding in de masterlijst: het startpunt voor elke nieuwe reis. */
export interface PackItem {
  id: string;
  name: string;
  group: PackGroup;
  /** Aantal voor een reis van PACK_BASE_NIGHTS nachten. */
  qty: number;
  /** Schaalt het aantal mee met het aantal nachten (kleding, doeken)? */
  scales: boolean;
  /** Bij welke soorten reizen dit mee moet. Leeg = op geen enkele lijst (bijv. een wens). */
  kinds: TripKind[];
  /** Alleen mee als de reis naar het buitenland gaat (paspoort, ANWB-pas). */
  abroadOnly?: boolean;
  /** Vaste plek bij het inladen, bijv. 'Krat zeilen' of 'Dakkoffer'. */
  location?: string;
  /** Hebben we nog niet of willen we vervangen. */
  toBuy?: boolean;
  link?: string;
  note?: string;
}

/** Een regel op de paklijst van één reis: een kopie van het masteritem, zodat
 *  aanpassingen voor deze reis de masterlijst niet vervuilen. */
export interface TripItem {
  id: string;
  masterId?: string;
  name: string;
  group: PackGroup;
  qty: number;
  location?: string;
  packed: boolean;
  toBuy?: boolean;
  note?: string;
}

export interface Trip {
  id: string;
  name: string;
  kind: TripKind;
  /** 'YYYY-MM-DD' */
  startDate: string;
  nights: number;
  abroad: boolean;
  who: PackPerson[];
  items: TripItem[];
  createdAt: string;
  updatedAt: string;
}

export interface AppData {
  events: CalendarEvent[];
  contacts: Contact[];
  pickupRules: PickupRule[];
  pickupOverrides: PickupOverride[];
  shopping: ShoppingItem[];
  meals: Meal[];
  packItems: PackItem[];
  trips: Trip[];
  settings: Settings;
}

export const PERSON_LABEL: Record<PersonId, string> = {
  matthijs: 'Matthijs',
  amelie: 'Amélie',
  lotte: 'Lotte',
  gezin: 'Gezin',
  niels: 'Niels',
  irene: 'Irene',
};

export const CATEGORY_LABEL: Record<Category, string> = {
  school: 'School',
  psz: 'Peuterspeelzaal',
  opvang: 'Kinderopvang',
  oppas: 'Oppas',
  afspraak: 'Afspraak',
  verjaardag: 'Verjaardag',
  vrij: 'Vrij / vakantie',
  anders: 'Anders',
};
