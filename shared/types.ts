/** Gedeelde types tussen de web-app en de Netlify Functions. */

import type { Often } from './shopping';

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
  /** Niels of Irene is niet thuis (of later thuis). Voedt de signalering. */
  | 'weg'
  | 'anders';

/** Welke persoonlijke agenda's we kunnen koppelen. */
export type AgendaFeedId = 'niels' | 'irene';

/** Hoe een gekoppelde agenda in de lijst heet. */
export const AGENDA_FEED_LABEL: Record<AgendaFeedId, string> = {
  niels: 'Gmail',
  irene: 'Agenda',
};

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
  /** 'parro' en 'agenda' komen uit een gekoppelde agenda en worden bij elke sync
   *  overschreven (titel, datum, tijd). Meeneem-lijstje en notitie blijven van jou. */
  source: 'local' | 'parro' | 'agenda';
  parroUid?: string;
  /** Bij source 'agenda': uit wiens agenda, en het id van de afspraak daar. */
  agendaFeed?: AgendaFeedId;
  agendaUid?: string;
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
  /** Wat de gekoppelde agenda bij de laatste sync als omschrijving gaf. Zo weten we of jij de
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
  /** Straat en huisnummer, handig voor een verjaardag of het ophalen. */
  address?: string;
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

export type TaskOwner = 'niels' | 'irene' | 'samen';

/**
 * Iets dat nog geregeld of afgestemd moet worden: een cadeau halen, je
 * aanmelden voor de ouderavond. Het scherm Regelen is de lijst hiervan.
 */
export interface Task {
  id: string;
  title: string;
  /** 'samen' = nog af te stemmen wie het doet. */
  owner: TaskOwner;
  kid?: ChildId;
  /** 'YYYY-MM-DD'. Leeg = geen deadline. */
  due?: string;
  note?: string;
  /** Wat er besloten is, bij iets dat afgestemd moest worden. */
  decision?: string;
  /** Het agenda-item waar deze taak bij hoort. */
  eventId?: string;
  /** Sleutel van het signaal waaruit deze taak ontstond (zie shared/signals.ts). */
  signalKey?: string;
  done: boolean;
  doneAt?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Wat jullie besloten bij een signaal "allebei weg". Het signaal zelf wordt
 * berekend uit de agenda en niet bewaard; alleen de keuze erbij staat hier.
 */
export type SignalDecision =
  | { type: 'thuis'; who: 'niels' | 'irene'; at: string }
  | { type: 'oppas'; who: 'niels' | 'irene'; taskId: string; at: string }
  | { type: 'ok'; at: string };

/** Een keuze zoals het scherm die doorgeeft; het tijdstip zet de server erbij. */
export type NewSignalDecision =
  | { type: 'thuis'; who: 'niels' | 'irene' }
  | { type: 'oppas'; who: 'niels' | 'irene'; taskId: string }
  | { type: 'ok' };

/** Per signaalsleutel de gemaakte keuze. */
export type Decisions = Record<string, SignalDecision>;

/** Een bijlage bij een bonnetje: een foto of een pdf. De bestanden staan in de opslag, hier alleen de verwijzing. */
export interface ReceiptFile {
  id: string;
  kind: 'image' | 'pdf';
  /** Alleen bij een foto: er is ook een miniatuur. */
  thumb?: boolean;
}

/** Een bonnetje met wat erbij hoort om de garantie te kunnen volgen. */
export interface Receipt {
  id: string;
  /** Wat het is. Leeg als het nog aangevuld moet worden. */
  title: string;
  store?: string;
  /** 'YYYY-MM-DD' */
  purchaseDate: string;
  amountCents?: number;
  /** Van wie of voor wie het is; gezin als het niemand in het bijzonder is. */
  person: PersonId;
  /** Fabrieks- of winkelgarantie in maanden vanaf de aankoop. */
  warrantyMonths?: number;
  /** Een afwijkende einddatum (zoals de fabrikant die noemt); gaat voor op de maanden. */
  warrantyUntil?: string;
  /** Tot wanneer je het kunt retourneren. */
  returnUntil?: string;
  serial?: string;
  notes?: string;
  files: ReceiptFile[];
  /** Expliciet aan of uit; zonder keuze herinneren we bij een bedrag vanaf 50 euro. */
  remind?: boolean;
  /** Wat je al hebt afgehandeld ("geen klachten"), met de datum. */
  handled?: { warranty?: string; return?: string };
  /** Welke herinneringen al verstuurd zijn, met de datum. */
  reminded?: { warranty?: string; return?: string };
  createdAt: string;
  updatedAt: string;
}

/** Een garantie of retourtermijn die bijna afloopt. Dit gaat mee met het openen van de app. */
export interface ReceiptAlert {
  id: string;
  title: string;
  kind: 'warranty' | 'return';
  /** Laatste dag, 'YYYY-MM-DD'. */
  date: string;
  daysLeft: number;
}

export interface PushSubscriptionRecord {
  id: string;
  endpoint: string;
  keys: { p256dh: string; auth: string };
  label: string;
  createdAt: string;
}

export interface AgendaSyncState {
  /** Laatste poging. */
  at: string;
  ok: boolean;
  message: string;
  /** Aantal afspraken bij de laatste geslaagde poging. */
  count: number;
}

export interface Settings {
  /** Uur in Europe/Amsterdam waarop de avondherinnering gaat. */
  reminderHour: number;
  /** Laatste succesvolle Parro-sync. */
  parroLastSync?: string;
  parroLastResult?: string;
  parroEventCount?: number;
  /** Laatste sync per gekoppelde persoonlijke agenda. */
  agendaSync?: Partial<Record<AgendaFeedId, AgendaSyncState>>;
  lastReminderDate?: string;
  /** Aan welk kind Parro-items gekoppeld worden. */
  parroPerson?: ChildId;
  /** Vaste info die je met de oppas deelt. */
  sitterBriefing?: string;
  /** Wat vaak op de boodschappenlijst komt, voor de snelkeuze. */
  shoppingOften?: Often;
  /** Wanneer je normaal thuis bent, 'HH:MM'. Daarvan telt "later thuis" tot het opgegeven tijdstip. */
  homeTime?: string;
}

export interface AppData {
  events: CalendarEvent[];
  contacts: Contact[];
  pickupRules: PickupRule[];
  pickupOverrides: PickupOverride[];
  shopping: ShoppingItem[];
  meals: Meal[];
  settings: Settings;
  tasks: Task[];
  decisions: Decisions;
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
  weg: 'Niet thuis',
  anders: 'Anders',
};
