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

/**
 * Een reeks, zoals zwemles op dinsdag. Elke keer is een eigen item met een
 * eigen meeneem-lijstje en notitie — "deze les met kleren zwemmen" hoort bij
 * één les, niet bij de hele reeks. Dit veld verbindt ze.
 */
export interface SeriesInfo {
  id: string;
  /** 1 = elke week, 2 = om de week. */
  interval: 1 | 2;
  /** Laatste mogelijke datum, 'YYYY-MM-DD'. */
  until: string;
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
  series?: SeriesInfo;
  createdAt: string;
  updatedAt: string;
}

/** Velden die voor een hele reeks gelden. Meenemen en notitie horen daar
 *  bewust niet bij: die zijn per keer. */
export const SERIES_SHARED_FIELDS = [
  'title',
  'time',
  'endTime',
  'allDay',
  'person',
  'category',
  'reminder',
  'location',
] as const;

export type SeriesSharedField = (typeof SERIES_SHARED_FIELDS)[number];

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

export interface AppData {
  events: CalendarEvent[];
  contacts: Contact[];
  pickupRules: PickupRule[];
  pickupOverrides: PickupOverride[];
  shopping: ShoppingItem[];
  meals: Meal[];
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
