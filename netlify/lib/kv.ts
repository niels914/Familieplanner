/**
 * De opslaglogica, los van waar de gegevens echt staan.
 *
 * Een "backend" kan twee dingen: een document met versienummer ophalen, en
 * een document schrijven mits het versienummer nog klopt. Daarop bouwen we
 * lezen, bijwerken en (voor één keer) het overzetten van de oude opslag.
 * Omdat dit niets weet van Supabase is het volledig te testen.
 */

export interface KvRow {
  data: unknown;
  version: number;
}

export interface KvBackend {
  get(collection: string): Promise<KvRow | null>;
  /**
   * Schrijft alleen als de versie nog klopt. `expected` null betekent: de rij
   * mag nog niet bestaan. Geeft de nieuwe versie, of null bij een conflict.
   */
  write(collection: string, data: unknown, expected: number | null): Promise<number | null>;
}

/** Leest eenmalig uit de vorige opslag (Netlify Blobs). Null = niets gevonden. */
export type LegacyReader = (collection: string) => Promise<unknown | null>;

export interface KvOptions<C extends string> {
  backend: KvBackend;
  /** Wat een collectie bevat zolang er nog niets is opgeslagen. */
  empty: Record<C, unknown>;
  legacy?: LegacyReader;
  /** Hoe vaak een bewerking opnieuw geprobeerd wordt na een conflict. */
  maxAttempts?: number;
  sleep?: (ms: number) => Promise<void>;
  log?: (message: string) => void;
}

const wacht = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export function createKv<C extends string>(options: KvOptions<C>) {
  const { backend, empty, legacy } = options;
  const maxAttempts = options.maxAttempts ?? 8;
  const sleep = options.sleep ?? wacht;
  const log = options.log ?? ((m: string) => console.log(m));

  const leeg = <T>(collection: C): T => structuredClone(empty[collection]) as T;

  /** Wat er in de oude opslag staat, of null. Fouten daar mogen nooit
   *  doorwerken: dan beginnen we gewoon leeg. */
  async function legacyWaarde(collection: C): Promise<unknown | null> {
    if (!legacy) return null;
    try {
      return await legacy(collection);
    } catch {
      return null;
    }
  }

  async function read<T>(collection: C): Promise<T> {
    const rij = await backend.get(collection);
    if (rij) return structuredClone(rij.data) as T;

    // Nog niets in de nieuwe opslag. Staat er iets in de oude, dan nemen we
    // dat over en bewaren we het meteen, zodat dit maar één keer hoeft.
    const oud = await legacyWaarde(collection);
    if (oud === null || oud === undefined) return leeg<T>(collection);

    const versie = await backend.write(collection, oud, null);
    if (versie !== null) log(`[opslag] ${collection} overgezet van de oude opslag`);
    // Bij een conflict was iemand ons net voor met dezelfde overzetting; dan
    // is de waarde die we hebben nog steeds de juiste om terug te geven.
    return structuredClone(oud) as T;
  }

  /**
   * Lees, wijzig, schrijf. Is er tussendoor iets veranderd, dan wordt de
   * wijziging opnieuw toegepast op de verse gegevens in plaats van die te
   * overschrijven. Beide telefoons houden zo hun wijziging.
   */
  async function update<T>(collection: C, mutate: (current: T) => T): Promise<T> {
    for (let poging = 1; poging <= maxAttempts; poging++) {
      const rij = await backend.get(collection);

      let huidig: T;
      if (rij) {
        huidig = structuredClone(rij.data) as T;
      } else {
        const oud = await legacyWaarde(collection);
        huidig =
          oud !== null && oud !== undefined ? (structuredClone(oud) as T) : leeg<T>(collection);
      }

      const volgende = mutate(huidig);
      const versie = await backend.write(collection, volgende, rij ? rij.version : null);
      if (versie !== null) return volgende;

      // Conflict: even wachten (met een beetje spreiding) en opnieuw proberen.
      await sleep(25 * poging + Math.floor(Math.random() * 25));
    }
    throw new Error(
      `Kon ${collection} niet opslaan: er werd te vaak tegelijk iets anders gewijzigd. Probeer het nog eens.`,
    );
  }

  /** Vervangt een collectie in zijn geheel (laatste schrijver wint). */
  async function overwrite<T>(collection: C, waarde: T): Promise<void> {
    await update<T>(collection, () => waarde);
  }

  return { read, update, overwrite };
}
