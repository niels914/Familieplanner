/**
 * Waar je bent in de app, en de handelingen die elk scherm nodig heeft:
 * naar een dag springen, het Nieuw-blad openen, naar het Gezin-scherm.
 * Staat hier zodat een scherm dat niet hoeft door te geven via zijn ouders.
 */

import { createContext, useContext } from 'react';
import type { CalendarEvent } from '../../shared/types';

export type View =
  | 'vandaag'
  | 'agenda'
  | 'regelen'
  | 'mensen'
  | 'gezin'
  | 'brengen'
  | 'bonnetjes'
  | 'paklijst'
  | 'instellingen';

export type NewMode = 'agenda' | 'taak';

export interface Nav {
  view: View;
  go: (view: View) => void;
  /** De dag die in de Agenda geselecteerd is. */
  selected: string;
  setSelected: (date: string) => void;
  /** Springt naar een dag in de Agenda. */
  openDate: (date: string) => void;
  /** Opent het Nieuw-blad. Zonder soort kiest het er zelf een bij het scherm. */
  openNew: (mode?: NewMode, text?: string) => void;
  /** Opent het blad met het signaal "allebei weg". */
  openSignal: (key: string) => void;
  /** Opent een taak om te bekijken of aan te passen. */
  openTask: (id: string) => void;
  /** Opent een agenda-item om te bekijken of aan te passen. */
  openEvent: (event: CalendarEvent) => void;
  /** Gaat naar Bonnetjes en opent dat bonnetje. */
  openReceipt: (id: string) => void;
  /** Welk bonnetje er geopend moet worden zodra het scherm Bonnetjes er is. */
  receiptId: string | null;
  clearReceipt: () => void;
}

export const NavContext = createContext<Nav | null>(null);

export function useNav(): Nav {
  const ctx = useContext(NavContext);
  if (!ctx) throw new Error('useNav moet binnen de app-schil gebruikt worden.');
  return ctx;
}
