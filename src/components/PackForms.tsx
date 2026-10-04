import { useMemo, useState } from 'react';
import {
  DEFAULT_PACK_LOCATIONS,
  PACK_GROUPS,
  PACK_GROUP_LABEL,
  PACK_PEOPLE,
  PERSON_LABEL,
  TRIP_KINDS,
  TRIP_KIND_LABEL,
  type PackGroup,
  type PackItem,
  type PackPerson,
  type Trip,
  type TripItem,
  type TripKind,
} from '../../shared/types';
import { belongsOnTrip } from '../../shared/packing';
import { todayInNl } from '../../shared/dates';
import { Modal } from './Modal';
import { useData, useStore } from '../lib/store';

/** Alle bekende plekken, voor de suggesties bij het invullen van een locatie. */
function useLocationOptions(): string[] {
  const { packItems, trips } = useData();
  return useMemo(() => {
    const found = new Set<string>(DEFAULT_PACK_LOCATIONS);
    for (const i of packItems) if (i.location) found.add(i.location);
    for (const t of trips) for (const i of t.items) if (i.location) found.add(i.location);
    return [...found];
  }, [packItems, trips]);
}

function LocationDatalist({ id }: { id: string }) {
  const options = useLocationOptions();
  return (
    <datalist id={id}>
      {options.map((o) => (
        <option key={o} value={o} />
      ))}
    </datalist>
  );
}

const DEFAULT_NIGHTS: Record<TripKind, number> = { kamperen: 14, huisje: 3, logeren: 2 };

// ---------------------------------------------------------------- nieuwe reis

export function TripForm({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const { createTrip, setNotice } = useStore();
  const { packItems } = useData();
  const [kind, setKind] = useState<TripKind>('kamperen');
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState(todayInNl());
  const [nights, setNights] = useState(DEFAULT_NIGHTS.kamperen);
  const [abroad, setAbroad] = useState(false);
  const [who, setWho] = useState<PackPerson[]>(PACK_PEOPLE);
  const [busy, setBusy] = useState(false);

  const pickKind = (next: TripKind) => {
    // Alleen meeverschuiven zolang je de duur niet zelf hebt aangepast.
    if (nights === DEFAULT_NIGHTS[kind]) setNights(DEFAULT_NIGHTS[next]);
    setKind(next);
  };

  const count = packItems.filter((i) => belongsOnTrip(i, { kind, nights, abroad, who })).length;

  const submit = async () => {
    const title = name.trim() || `${TRIP_KIND_LABEL[kind]} ${startDate.slice(0, 4)}`;
    setBusy(true);
    try {
      const id = await createTrip({ name: title, kind, startDate, nights, abroad, who });
      setNotice('Paklijst gemaakt.');
      onCreated(id);
    } catch {
      // Foutmelding komt uit de store.
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title="Nieuwe reis"
      onClose={onClose}
      footer={
        <button className="btn btn--primary grow" onClick={submit} disabled={busy || !startDate}>
          {busy ? 'Bezig…' : `Paklijst maken (${count} spullen)`}
        </button>
      }
    >
      <div className="stack">
        {packItems.length === 0 && (
          <div className="banner">
            De masterlijst is nog leeg, dus de paklijst wordt ook leeg. Laad eerst de startlijst
            onder <strong>Masterlijst</strong>.
          </div>
        )}

        <div className="field">
          <label>Soort reis</label>
          <div className="filters" style={{ margin: 0 }}>
            {TRIP_KINDS.map((k) => (
              <button
                key={k}
                type="button"
                className="filter"
                aria-pressed={kind === k}
                onClick={() => pickKind(k)}
              >
                {TRIP_KIND_LABEL[k]}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label htmlFor="trip-name">Naam</label>
          <input
            id="trip-name"
            className="input"
            value={name}
            placeholder={`${TRIP_KIND_LABEL[kind]} ${startDate.slice(0, 4)}`}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="field-row">
          <div className="field">
            <label htmlFor="trip-start">Vertrek</label>
            <input
              id="trip-start"
              type="date"
              className="input"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="trip-nights">Nachten</label>
            <input
              id="trip-nights"
              type="number"
              min={1}
              max={60}
              inputMode="numeric"
              className="input"
              value={nights}
              onChange={(e) => setNights(Math.max(1, Number(e.target.value) || 1))}
            />
          </div>
        </div>

        <div className="field">
          <label>Wie gaan er mee</label>
          <div className="row row--wrap" style={{ gap: 14 }}>
            {PACK_PEOPLE.map((p) => (
              <label key={p} className="checkline">
                <input
                  type="checkbox"
                  checked={who.includes(p)}
                  onChange={(e) =>
                    setWho((w) => (e.target.checked ? [...w, p] : w.filter((x) => x !== p)))
                  }
                />
                {PERSON_LABEL[p]}
              </label>
            ))}
          </div>
        </div>

        <label className="checkline">
          <input type="checkbox" checked={abroad} onChange={(e) => setAbroad(e.target.checked)} />
          We gaan naar het buitenland (paspoorten, ANWB-pas)
        </label>

        <div className="small muted">
          Aantallen kleding en doeken worden aangepast aan {nights}{' '}
          {nights === 1 ? 'nacht' : 'nachten'}.
        </div>
      </div>
    </Modal>
  );
}

// ------------------------------------------------------------ reis bewerken

export function TripEditForm({
  trip,
  onClose,
  onDeleted,
}: {
  trip: Trip;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const { updateTrip, deleteTrip } = useStore();
  const [name, setName] = useState(trip.name);
  const [startDate, setStartDate] = useState(trip.startDate);
  const [abroad, setAbroad] = useState(trip.abroad);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try {
      await updateTrip({ id: trip.id, name, startDate, abroad });
      onClose();
    } catch {
      // Foutmelding komt uit de store.
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!confirm(`"${trip.name}" en de hele paklijst verwijderen?`)) return;
    setBusy(true);
    try {
      await deleteTrip(trip.id);
      onDeleted();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title="Reis bewerken"
      onClose={onClose}
      footer={
        <>
          <button className="btn btn--danger" onClick={remove} disabled={busy}>
            Verwijderen
          </button>
          <button className="btn btn--primary grow" onClick={save} disabled={busy || !name.trim()}>
            Opslaan
          </button>
        </>
      }
    >
      <div className="stack">
        <div className="field">
          <label htmlFor="te-name">Naam</label>
          <input id="te-name" className="input" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="te-start">Vertrek</label>
          <input
            id="te-start"
            type="date"
            className="input"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <label className="checkline">
          <input type="checkbox" checked={abroad} onChange={(e) => setAbroad(e.target.checked)} />
          Buitenland
        </label>
        <div className="small muted">
          De lijst zelf blijft zoals hij is. Wil je andere aantallen of een ander soort reis, maak
          dan een nieuwe reis aan.
        </div>
      </div>
    </Modal>
  );
}

// ------------------------------------------------------- regel op een paklijst

export function TripItemForm({
  trip,
  initial,
  defaultGroup,
  onClose,
}: {
  trip: Trip;
  initial?: TripItem;
  defaultGroup?: PackGroup;
  onClose: () => void;
}) {
  const { saveTripItem, deleteTripItem } = useStore();
  const [name, setName] = useState(initial?.name ?? '');
  const [group, setGroup] = useState<PackGroup>(initial?.group ?? defaultGroup ?? 'overig');
  const [qty, setQty] = useState(initial?.qty ?? 1);
  const [location, setLocation] = useState(initial?.location ?? '');
  const [note, setNote] = useState(initial?.note ?? '');
  const [toBuy, setToBuy] = useState(initial?.toBuy ?? false);
  const [saveToMaster, setSaveToMaster] = useState(false);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try {
      await saveTripItem(
        trip.id,
        { id: initial?.id, name, group, qty, location, note, toBuy },
        saveToMaster,
      );
      onClose();
    } catch {
      // Foutmelding komt uit de store.
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!initial) return;
    setBusy(true);
    try {
      await deleteTripItem(trip.id, initial.id);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title={initial ? 'Regel bewerken' : 'Iets toevoegen'}
      onClose={onClose}
      footer={
        <>
          {initial && (
            <button className="btn btn--danger" onClick={remove} disabled={busy}>
              Weghalen
            </button>
          )}
          <button className="btn btn--primary grow" onClick={save} disabled={busy || !name.trim()}>
            Opslaan
          </button>
        </>
      }
    >
      <div className="stack">
        <div className="field-row" style={{ gridTemplateColumns: '1fr 90px' }}>
          <div className="field">
            <label htmlFor="ti-name">Wat</label>
            <input
              id="ti-name"
              className="input"
              autoFocus={!initial}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="ti-qty">Aantal</label>
            <input
              id="ti-qty"
              type="number"
              min={1}
              inputMode="numeric"
              className="input"
              value={qty}
              onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
            />
          </div>
        </div>

        <div className="field-row">
          <div className="field">
            <label htmlFor="ti-group">Van wie of waarvoor</label>
            <select
              id="ti-group"
              className="select"
              value={group}
              onChange={(e) => setGroup(e.target.value as PackGroup)}
            >
              {PACK_GROUPS.map((g) => (
                <option key={g} value={g}>
                  {PACK_GROUP_LABEL[g]}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="ti-loc">Waar komt het</label>
            <input
              id="ti-loc"
              className="input"
              list="pack-locations"
              placeholder="Bijv. Dakkoffer"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
            <LocationDatalist id="pack-locations" />
          </div>
        </div>

        <div className="field">
          <label htmlFor="ti-note">Notitie</label>
          <input id="ti-note" className="input" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>

        <label className="checkline">
          <input type="checkbox" checked={toBuy} onChange={(e) => setToBuy(e.target.checked)} />
          Nog kopen voor we weggaan
        </label>

        {!initial && (
          <label className="checkline">
            <input
              type="checkbox"
              checked={saveToMaster}
              onChange={(e) => setSaveToMaster(e.target.checked)}
            />
            Ook in de masterlijst zetten, voor volgende reizen ({TRIP_KIND_LABEL[trip.kind].toLowerCase()})
          </label>
        )}
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------- masterlijst-item

export function PackItemForm({
  initial,
  onClose,
}: {
  initial?: PackItem;
  onClose: () => void;
}) {
  const { savePackItem, deletePackItem } = useStore();
  const [draft, setDraft] = useState<Partial<PackItem>>(
    initial ?? { name: '', group: 'overig', qty: 1, scales: false, kinds: ['kamperen'] },
  );
  const [busy, setBusy] = useState(false);

  const set = <K extends keyof PackItem>(key: K, value: PackItem[K] | undefined) =>
    setDraft((d) => ({ ...d, [key]: value }));
  const kinds = draft.kinds ?? [];

  const save = async () => {
    if (!draft.name?.trim()) return;
    setBusy(true);
    try {
      await savePackItem({
        ...draft,
        // Een leeg veld moet de oude waarde echt wissen.
        location: draft.location ?? '',
        link: draft.link ?? '',
        note: draft.note ?? '',
      });
      onClose();
    } catch {
      // Foutmelding komt uit de store.
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!initial) return;
    if (!confirm(`"${initial.name}" uit de masterlijst halen? Bestaande reizen houden hem.`)) return;
    setBusy(true);
    try {
      await deletePackItem(initial.id);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title={initial ? 'Item bewerken' : 'Nieuw item'}
      onClose={onClose}
      footer={
        <>
          {initial && (
            <button className="btn btn--danger" onClick={remove} disabled={busy}>
              Verwijderen
            </button>
          )}
          <button className="btn btn--primary grow" onClick={save} disabled={busy || !draft.name?.trim()}>
            Opslaan
          </button>
        </>
      }
    >
      <div className="stack">
        <div className="field-row" style={{ gridTemplateColumns: '1fr 90px' }}>
          <div className="field">
            <label htmlFor="pi-name">Wat</label>
            <input
              id="pi-name"
              className="input"
              autoFocus={!initial}
              value={draft.name ?? ''}
              onChange={(e) => set('name', e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="pi-qty">Aantal</label>
            <input
              id="pi-qty"
              type="number"
              min={1}
              inputMode="numeric"
              className="input"
              value={draft.qty ?? 1}
              onChange={(e) => set('qty', Math.max(1, Number(e.target.value) || 1))}
            />
          </div>
        </div>

        <label className="checkline">
          <input
            type="checkbox"
            checked={draft.scales ?? false}
            onChange={(e) => set('scales', e.target.checked)}
          />
          Aantal past zich aan de duur aan (kleding, doeken)
        </label>

        <div className="field">
          <label htmlFor="pi-group">Van wie of waarvoor</label>
          <select
            id="pi-group"
            className="select"
            value={draft.group ?? 'overig'}
            onChange={(e) => set('group', e.target.value as PackGroup)}
          >
            {PACK_GROUPS.map((g) => (
              <option key={g} value={g}>
                {PACK_GROUP_LABEL[g]}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label>Mee bij</label>
          <div className="row row--wrap" style={{ gap: 14 }}>
            {TRIP_KINDS.map((k) => (
              <label key={k} className="checkline">
                <input
                  type="checkbox"
                  checked={kinds.includes(k)}
                  onChange={(e) =>
                    set('kinds', e.target.checked ? [...kinds, k] : kinds.filter((x) => x !== k))
                  }
                />
                {TRIP_KIND_LABEL[k]}
              </label>
            ))}
          </div>
          {kinds.length === 0 && (
            <div className="small muted">Bij niets aangevinkt komt dit op geen enkele paklijst.</div>
          )}
        </div>

        <label className="checkline">
          <input
            type="checkbox"
            checked={draft.abroadOnly ?? false}
            onChange={(e) => set('abroadOnly', e.target.checked)}
          />
          Alleen bij reizen naar het buitenland
        </label>

        <div className="field">
          <label htmlFor="pi-loc">Vaste plek bij het inladen</label>
          <input
            id="pi-loc"
            className="input"
            list="pack-locations"
            placeholder="Bijv. Krat zeilen"
            value={draft.location ?? ''}
            onChange={(e) => set('location', e.target.value)}
          />
          <LocationDatalist id="pack-locations" />
        </div>

        <label className="checkline">
          <input
            type="checkbox"
            checked={draft.toBuy ?? false}
            onChange={(e) => set('toBuy', e.target.checked)}
          />
          Nog aanschaffen
        </label>

        {draft.toBuy && (
          <div className="field">
            <label htmlFor="pi-link">Link</label>
            <input
              id="pi-link"
              className="input"
              inputMode="url"
              placeholder="https://"
              value={draft.link ?? ''}
              onChange={(e) => set('link', e.target.value)}
            />
          </div>
        )}

        <div className="field">
          <label htmlFor="pi-note">Notitie</label>
          <input
            id="pi-note"
            className="input"
            value={draft.note ?? ''}
            onChange={(e) => set('note', e.target.value)}
          />
        </div>
      </div>
    </Modal>
  );
}
