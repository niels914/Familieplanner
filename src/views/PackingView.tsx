import { useEffect, useMemo, useState } from 'react';
import {
  PACK_GROUPS,
  PACK_GROUP_LABEL,
  PACK_GROUP_PERSON,
  PACK_GROUP_SHORT,
  TRIP_KINDS,
  TRIP_KIND_LABEL,
  type PackGroup,
  type PackItem,
  type Trip,
  type TripItem,
  type TripKind,
} from '../../shared/types';
import { diffDays, formatLong, todayInNl } from '../../shared/dates';
import { orderLocations, progress } from '../../shared/packing';
import { useData, useStore } from '../lib/store';
import { PackItemForm, TripEditForm, TripForm, TripItemForm } from '../components/PackForms';
import { PageHead } from '../components/PageHead';

const NO_PLACE = 'Nog geen plek';

export function PackingView({ initialTripId = null }: { initialTripId?: string | null }) {
  const { trips } = useData();
  const [tab, setTab] = useState<'reizen' | 'master'>('reizen');
  const [openId, setOpenId] = useState<string | null>(initialTripId);

  const trip = trips.find((t) => t.id === openId);
  if (trip) return <TripDetail trip={trip} onBack={() => setOpenId(null)} />;

  return (
    <div className="page">
      <PageHead title="Paklijst" sub="Wat er mee moet op vakantie, per reis en per persoon." />

      <div className="filters">
        <button className="filter" aria-pressed={tab === 'reizen'} onClick={() => setTab('reizen')}>
          Reizen
        </button>
        <button className="filter" aria-pressed={tab === 'master'} onClick={() => setTab('master')}>
          Masterlijst
        </button>
      </div>

      {tab === 'reizen' ? <TripList onOpen={setOpenId} onToMaster={() => setTab('master')} /> : <MasterList />}
    </div>
  );
}

// ------------------------------------------------------------------- reizen

function TripList({ onOpen, onToMaster }: { onOpen: (id: string) => void; onToMaster: () => void }) {
  const { trips, packItems } = useData();
  const [creating, setCreating] = useState(false);
  const today = todayInNl();

  const isPast = (t: Trip) => diffDays(t.startDate, today) > t.nights;
  const upcoming = trips.filter((t) => !isPast(t)).sort((a, b) => a.startDate.localeCompare(b.startDate));
  const past = trips.filter(isPast).sort((a, b) => b.startDate.localeCompare(a.startDate));

  return (
    <div className="stack">
      <button className="btn btn--primary btn--block" onClick={() => setCreating(true)}>
        + Nieuwe reis
      </button>

      {packItems.length === 0 && (
        <div className="banner banner--info">
          De masterlijst is nog leeg. Laad eerst de startlijst, dan krijgt elke nieuwe reis meteen
          een volledige paklijst.{' '}
          <button className="btn btn--sm" onClick={onToMaster}>
            Naar de masterlijst
          </button>
        </div>
      )}

      {trips.length === 0 && <div className="empty">Nog geen reizen. Maak er een aan om te beginnen.</div>}

      {upcoming.length > 0 && <TripTiles trips={upcoming} onOpen={onOpen} />}
      {past.length > 0 && (
        <>
          <div className="section-title">Eerdere reizen</div>
          <TripTiles trips={past} onOpen={onOpen} />
        </>
      )}

      {creating && (
        <TripForm
          onClose={() => setCreating(false)}
          onCreated={(id) => {
            setCreating(false);
            onOpen(id);
          }}
        />
      )}
    </div>
  );
}

function TripTiles({ trips, onOpen }: { trips: Trip[]; onOpen: (id: string) => void }) {
  const today = todayInNl();
  return (
    <div className="list">
      {trips.map((t) => {
        const { packed, total } = progress(t.items);
        const days = diffDays(today, t.startDate);
        const when =
          days > 1 ? `over ${days} dagen` : days === 1 ? 'morgen' : days === 0 ? 'vandaag' : formatLong(t.startDate);
        return (
          <button key={t.id} className="tile" onClick={() => onOpen(t.id)}>
            <div className="avatar">{t.kind === 'kamperen' ? '⛺' : t.kind === 'huisje' ? '🏠' : '🛏'}</div>
            <span className="grow">
              <strong>{t.name}</strong>
              <div className="small muted">
                <span className="cap">{when}</span> · {t.nights} {t.nights === 1 ? 'nacht' : 'nachten'} ·{' '}
                {packed}/{total} ingepakt
              </div>
              <Progress packed={packed} total={total} />
            </span>
            <span className="muted">›</span>
          </button>
        );
      })}
    </div>
  );
}

function Progress({ packed, total }: { packed: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((packed / total) * 100);
  return (
    <div className="progress" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div className="progress__bar" style={{ width: `${pct}%` }} />
    </div>
  );
}

// ------------------------------------------------------------ één paklijst

function TripDetail({ trip, onBack }: { trip: Trip; onBack: () => void }) {
  const { reload, toggleTripItem } = useStore();
  const [mode, setMode] = useState<'verzamelen' | 'inladen'>('verzamelen');
  const [onlyOpen, setOnlyOpen] = useState(false);
  const [editing, setEditing] = useState<TripItem | null>(null);
  const [adding, setAdding] = useState<{ group?: PackGroup } | null>(null);
  const [editingTrip, setEditingTrip] = useState(false);

  // Met z'n tweeën inpakken: haal elke paar seconden de wijzigingen van de ander op.
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') void reload();
    }, 8000);
    return () => clearInterval(timer);
  }, [reload]);

  const { packed, total } = progress(trip.items);

  const sections = useMemo(() => {
    const visible = trip.items.filter((i) => !onlyOpen || !i.packed);
    if (mode === 'verzamelen') {
      return PACK_GROUPS.map((g) => ({
        key: g,
        label: PACK_GROUP_LABEL[g],
        chip: PACK_GROUP_PERSON[g] ?? 'gezin',
        all: trip.items.filter((i) => i.group === g),
        items: visible.filter((i) => i.group === g),
        group: g as PackGroup | undefined,
      }));
    }
    const places = orderLocations(trip.items.flatMap((i) => (i.location ? [i.location] : [])));
    return [...places, NO_PLACE].map((place) => {
      const match = (i: TripItem) => (place === NO_PLACE ? !i.location : i.location === place);
      return {
        key: place,
        label: place,
        chip: 'gezin' as string,
        all: trip.items.filter(match),
        items: visible.filter(match),
        group: undefined as PackGroup | undefined,
      };
    });
  }, [trip.items, mode, onlyOpen]);

  const shown = sections.filter((s) => s.items.length > 0 || (!onlyOpen && s.all.length > 0));
  const days = diffDays(todayInNl(), trip.startDate);

  return (
    <div className="page">
      <button className="btn btn--ghost btn--sm" onClick={onBack} style={{ marginLeft: -8 }}>
        ‹ Alle reizen
      </button>
      <PageHead
        title={trip.name}
        sub={
          <>
            <span className="cap">{formatLong(trip.startDate)}</span> · {trip.nights}{' '}
            {trip.nights === 1 ? 'nacht' : 'nachten'}
            {days > 0 && ` · nog ${days} ${days === 1 ? 'dag' : 'dagen'}`}
            {trip.abroad && ' · buitenland'}
          </>
        }
        actions={
          <button className="btn btn--sm" onClick={() => setEditingTrip(true)}>
            Bewerken
          </button>
        }
      />

      <div className="card card--pad stack stack--sm" style={{ marginBottom: 12 }}>
        <div className="row row--between">
          <strong>
            {packed} van {total} ingepakt
          </strong>
          <span className="muted small">{total - packed} te gaan</span>
        </div>
        <Progress packed={packed} total={total} />
      </div>

      <div className="filters">
        <button className="filter" aria-pressed={mode === 'verzamelen'} onClick={() => setMode('verzamelen')}>
          Verzamelen
        </button>
        <button className="filter" aria-pressed={mode === 'inladen'} onClick={() => setMode('inladen')}>
          Inladen
        </button>
        <button className="filter" aria-pressed={onlyOpen} onClick={() => setOnlyOpen((v) => !v)}>
          Alleen wat nog moet
        </button>
      </div>

      {total === 0 && (
        <div className="empty">
          Er staat nog niets op de lijst. Voeg hieronder iets toe, of vul de masterlijst en maak een
          nieuwe reis.
        </div>
      )}
      {total > 0 && packed === total && onlyOpen && <div className="empty">Alles is ingepakt. 🎉</div>}

      <div className="stack">
        {shown.map((section) => {
          const done = section.all.filter((i) => i.packed).length;
          return (
            <section key={section.key} className="stack stack--sm">
              <div className="packhead">
                <span className={`chip chip--${section.chip}`}>{section.label}</span>
                <span className="muted tiny">
                  {done}/{section.all.length}
                </span>
                {mode === 'verzamelen' && (
                  <button
                    className="btn btn--ghost btn--sm packhead__add"
                    onClick={() => setAdding({ group: section.group })}
                    aria-label={`Iets toevoegen bij ${section.label}`}
                  >
                    +
                  </button>
                )}
              </div>
              <div className="list">
                {section.items.map((item) => (
                  <PackRow
                    key={item.id}
                    item={item}
                    mode={mode}
                    onToggle={() => void toggleTripItem(trip.id, item.id)}
                    onEdit={() => setEditing(item)}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <button className="btn btn--block" style={{ marginTop: 16 }} onClick={() => setAdding({})}>
        + Iets toevoegen
      </button>

      {adding && (
        <TripItemForm trip={trip} defaultGroup={adding.group} onClose={() => setAdding(null)} />
      )}
      {editing && <TripItemForm trip={trip} initial={editing} onClose={() => setEditing(null)} />}
      {editingTrip && (
        <TripEditForm
          trip={trip}
          onClose={() => setEditingTrip(false)}
          onDeleted={() => {
            setEditingTrip(false);
            onBack();
          }}
        />
      )}
    </div>
  );
}

function PackRow({
  item,
  mode,
  onToggle,
  onEdit,
}: {
  item: TripItem;
  mode: 'verzamelen' | 'inladen';
  onToggle: () => void;
  onEdit: () => void;
}) {
  const person = PACK_GROUP_PERSON[item.group];
  return (
    <div className={`shopitem packrow ${item.packed ? 'shopitem--done' : ''}`}>
      <label className="packitem grow">
        <input type="checkbox" checked={item.packed} onChange={onToggle} />
        <span className="packitem__line grow">
          <span className="shopitem__text">
            {item.name}
            {item.qty > 1 && <strong className="packitem__qty"> ×{item.qty}</strong>}
          </span>
          {mode === 'inladen' && (
            <span className={`chip chip--${person ?? 'gezin'}`}>{PACK_GROUP_SHORT[item.group]}</span>
          )}
          {mode === 'verzamelen' && item.location && <span className="muted tiny">{item.location}</span>}
          {item.toBuy && <span className="chip chip--warn">🛒 nog kopen</span>}
          {item.note && <span className="muted tiny">{item.note}</span>}
        </span>
      </label>
      <button className="btn btn--ghost btn--sm" onClick={onEdit} aria-label={`${item.name} bewerken`}>
        ✎
      </button>
    </div>
  );
}

// -------------------------------------------------------------- masterlijst

function MasterList() {
  const { packItems } = useData();
  const { seedPackItems, markPackItemBought, setNotice } = useStore();
  const [kind, setKind] = useState<TripKind | 'alles' | 'kopen'>('alles');
  const [editing, setEditing] = useState<PackItem | null>(null);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);

  const toBuyCount = packItems.filter((i) => i.toBuy).length;
  const filtered = packItems.filter((i) =>
    kind === 'alles' ? true : kind === 'kopen' ? i.toBuy : i.kinds.includes(kind),
  );

  const loadSeed = async () => {
    setBusy(true);
    try {
      const added = await seedPackItems();
      setNotice(`${added} spullen uit de Excel geladen.`);
    } catch (err) {
      setNotice((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (packItems.length === 0) {
    return (
      <div className="card card--pad stack center">
        <div style={{ fontSize: '2rem' }}>🧳</div>
        <strong>De masterlijst is nog leeg</strong>
        <p className="muted small">
          Hier staat alles wat jullie ooit meenemen. Elke nieuwe reis krijgt hieruit automatisch een
          paklijst. Begin met de lijst uit jullie Excel; daarna pas je alles hier aan.
        </p>
        <button className="btn btn--primary" onClick={loadSeed} disabled={busy}>
          {busy ? 'Bezig…' : 'Startlijst uit de Excel laden'}
        </button>
        <button className="btn btn--ghost btn--sm" onClick={() => setAdding(true)}>
          Of begin met een leeg item
        </button>
        {adding && <PackItemForm onClose={() => setAdding(false)} />}
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="filters" style={{ margin: 0 }}>
        <button className="filter" aria-pressed={kind === 'alles'} onClick={() => setKind('alles')}>
          Alles ({packItems.length})
        </button>
        {TRIP_KINDS.map((k) => (
          <button key={k} className="filter" aria-pressed={kind === k} onClick={() => setKind(k)}>
            {TRIP_KIND_LABEL[k]}
          </button>
        ))}
        <button className="filter" aria-pressed={kind === 'kopen'} onClick={() => setKind('kopen')}>
          🛒 Aanschaffen ({toBuyCount})
        </button>
      </div>

      <button className="btn btn--block" onClick={() => setAdding(true)}>
        + Nieuw item
      </button>

      {filtered.length === 0 && <div className="empty">Niets gevonden.</div>}

      {PACK_GROUPS.map((group) => {
        const items = filtered.filter((i) => i.group === group);
        if (items.length === 0) return null;
        return (
          <section key={group} className="stack stack--sm">
            <div className="packhead">
              <span className={`chip chip--${PACK_GROUP_PERSON[group] ?? 'gezin'}`}>
                {PACK_GROUP_LABEL[group]}
              </span>
              <span className="muted tiny">{items.length}</span>
            </div>
            <div className="list">
              {items.map((item) => (
                <div key={item.id} className="shopitem packrow">
                  <button className="packitem packitem--button grow" onClick={() => setEditing(item)}>
                    <span className="packitem__line grow">
                      <span className="shopitem__text">
                        {item.name}
                        {item.qty > 1 && <strong className="packitem__qty"> ×{item.qty}</strong>}
                        {item.scales && (
                          <span className="muted tiny" title="Past zich aan de duur aan">
                            {' '}
                            ↕
                          </span>
                        )}
                      </span>
                      {item.kinds.length === 0 ? (
                        <span className="chip">alleen aanschaflijst</span>
                      ) : (
                        item.kinds.length < TRIP_KINDS.length && (
                          <span className="muted tiny">
                            {item.kinds.map((k) => TRIP_KIND_LABEL[k]).join(', ')}
                          </span>
                        )
                      )}
                      {item.abroadOnly && <span className="chip">buitenland</span>}
                      {item.location && <span className="muted tiny">{item.location}</span>}
                      {item.note && <span className="muted tiny">{item.note}</span>}
                      {item.toBuy && <span className="chip chip--warn">🛒 nog kopen</span>}
                    </span>
                  </button>
                  {item.toBuy && (
                    <>
                      {item.link && (
                        <a className="btn btn--ghost btn--sm" href={item.link} target="_blank" rel="noreferrer">
                          ↗
                        </a>
                      )}
                      <button className="btn btn--sm" onClick={() => void markPackItemBought(item.id)}>
                        Gekocht
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          </section>
        );
      })}

      {adding && <PackItemForm onClose={() => setAdding(false)} />}
      {editing && <PackItemForm initial={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
