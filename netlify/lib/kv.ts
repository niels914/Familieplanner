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

export interface KvOptions<C extends string> {
  backend: KvBackend;
  /** Wat een collectie bevat zolang er nog niets is opgeslagen. */
  empty: Record<C, unknown>;
  /** Hoe vaak een bewerking opnieuw geprobeerd wordt na een conflict. */
  maxAttempts?: number;
  sleep?: (ms: number) => Promise<void>;
}

const wacht = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export function createKv<C extends string>(options: KvOptions<C>) {
  const { backend, empty } = options;
  const maxAttempts = options.maxAttempts ?? 8;
  const sleep = options.sleep ?? wacht;

  const leeg = <T>(collection: C): T => structuredClone(empty[collection]) as T;

  async function read<T>(collection: C): Promise<T> {
    const rij = await backend.get(collection);
    return rij ? (structuredClone(rij.data) as T) : leeg<T>(collection);
  }

  /**
   * Lees, wijzig, schrijf. Is er tussendoor iets veranderd, dan wordt de
   * wijziging opnieuw toegepast op de verse gegevens in plaats van die te
   * overschrijven. Beide telefoons houden zo hun wijziging.
   */
  async function update<T>(collection: C, mutate: (current: T) => T): Promise<T> {
    for (let poging = 1; poging <= maxAttempts; poging++) {
      const rij = await backend.get(collection);

      const huidig = rij ? (structuredClone(rij.data) as T) : leeg<T>(collection);
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
