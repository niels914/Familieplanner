/**
 * Bonnetjes en garantie. Bereikbaar via Gezin. Eén grote knop om een foto te maken, daaronder
 * wat je al hebt, in groepen: wat nog aangevuld moet worden en wat bijna afloopt staat bovenaan.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Receipt } from '../../shared/types';
import { PERSON_LABEL } from '../../shared/types';
import { todayInNl } from '../../shared/dates';
import { displayTitle, timeLeftLabel, warrantyStatus } from '../../shared/warranty';
import {
  FILTER_LABEL,
  bedrag,
  datumMetJaar,
  filterCounts,
  receiptGroups,
  searchReceipts,
  type ReceiptFilter,
} from '../lib/bonnetjes';
import { prepareFile, receiptFileUrl, type PreparedFile } from '../lib/image';
import { useNav } from '../lib/nav';
import { useData, useStore } from '../lib/store';
import { Avatar } from '../components/Avatar';
import { EmptyState } from '../components/EmptyState';
import { Icon } from '../components/Icon';
import { PageHead } from '../components/PageHead';
import { ReceiptSheet } from '../components/ReceiptSheet';

const FILTERS: ReceiptFilter[] = ['alles', 'loopt', 'bijna', 'verlopen', 'aanvullen'];

type Open = { receipt?: Receipt; initial?: PreparedFile } | null;

export function BonnetjesView() {
  const { receipts } = useData();
  const { loadReceipts } = useStore();
  const { receiptId, clearReceipt } = useNav();
  const today = todayInNl();
  const camera = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<ReceiptFilter>('alles');
  const [open, setOpen] = useState<Open>(null);
  const [preparing, setPreparing] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    void loadReceipts().catch(() => {});
    // Alleen bij het openen van het scherm; opslaan werkt de lijst zelf bij.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Een herinnering of de Regelen-lijst opent direct het goede bonnetje.
  useEffect(() => {
    if (!receiptId || !receipts) return;
    const gevonden = receipts.find((r) => r.id === receiptId);
    if (gevonden) setOpen({ receipt: gevonden });
    clearReceipt();
  }, [receiptId, receipts, clearReceipt]);

  const lijst = receipts ?? [];
  const counts = useMemo(() => filterCounts(lijst, today), [lijst, today]);
  const groepen = useMemo(() => receiptGroups(searchReceipts(lijst, query), today, filter), [lijst, query, today, filter]);

  // Een filter zonder bonnetjes is ruis: dan val je terug op alles.
  useEffect(() => {
    if (filter !== 'alles' && counts[filter] === 0) setFilter('alles');
  }, [counts, filter]);

  const kies = async (file: File | undefined) => {
    if (!file) return;
    setProblem(null);
    setPreparing(true);
    try {
      setOpen({ initial: await prepareFile(file) });
    } catch (err) {
      setProblem((err as Error).message);
    } finally {
      setPreparing(false);
    }
  };

  return (
    <div className="page">
      <PageHead title="Bonnetjes" sub="Foto maken, garantie bijhouden. Wij herinneren je op tijd." />

      <button className="btn btn--primary btn--block bon__camera" onClick={() => camera.current?.click()} disabled={preparing}>
        <Icon name="camera" size={20} /> {preparing ? 'Foto wordt klaargemaakt…' : 'Foto maken'}
      </button>
      <input
        ref={camera}
        type="file"
        accept="image/*,application/pdf"
        hidden
        onChange={(e) => {
          void kies(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
      <button type="button" className="bon__handmatig" onClick={() => setOpen({})}>
        of zonder foto invullen
      </button>
      {problem && (
        <p className="small bon__problem" role="alert">
          {problem}
        </p>
      )}

      {receipts && lijst.length > 0 && (
        <>
          <input
            className="input"
            type="search"
            placeholder="Zoek op naam, winkel, serienummer"
            aria-label="Zoeken in bonnetjes"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ margin: '14px 0 10px' }}
          />
          <div className="picks" style={{ marginBottom: 6 }}>
            {FILTERS.filter((f) => f === 'alles' || counts[f] > 0).map((f) => (
              <button key={f} className="pick" aria-pressed={filter === f} onClick={() => setFilter(f)}>
                {FILTER_LABEL[f]} <span className="pick__count">{counts[f]}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {!receipts ? (
        <p className="small muted" style={{ marginTop: 18 }} aria-busy="true">
          Bonnetjes laden…
        </p>
      ) : lijst.length === 0 ? (
        <EmptyState
          icon="bon"
          title="Nog geen bonnetjes."
          hint="Maak een foto van een bonnetje, ook als je nu nog niet alles weet. Aanvullen kan later."
        />
      ) : groepen.length === 0 ? (
        <EmptyState
          icon="zoeken"
          title={query.trim() ? `Niets gevonden voor ‘${query.trim()}’.` : 'Niets gevonden.'}
          action={
            <button
              className="btn btn--sm"
              onClick={() => {
                setQuery('');
                setFilter('alles');
              }}
            >
              Alles tonen
            </button>
          }
        />
      ) : (
        groepen.map((groep) => (
          <section key={groep.id}>
            <h2 className="grouphead">
              {groep.label}
              <span className="grouphead__count">{groep.items.length}</span>
            </h2>
            <div className="list">
              {groep.items.map((r) => (
                <ReceiptRow key={r.id} receipt={r} today={today} onOpen={() => setOpen({ receipt: r })} />
              ))}
            </div>
          </section>
        ))
      )}

      {open && <ReceiptSheet receipt={open.receipt} initial={open.initial} onClose={() => setOpen(null)} />}
    </div>
  );
}

function ReceiptRow({ receipt, today, onOpen }: { receipt: Receipt; today: string; onOpen: () => void }) {
  const status = warrantyStatus(receipt, today);
  const eerste = receipt.files[0];
  const titel = displayTitle(receipt);
  const meta = [receipt.store, datumMetJaar(receipt.purchaseDate), receipt.amountCents !== undefined ? `€ ${bedrag(receipt.amountCents)}` : null]
    .filter(Boolean)
    .join(' · ');

  return (
    <button type="button" className="card bonrow" onClick={onOpen} aria-label={`${titel} openen`}>
      <span className="bonrow__thumb">
        {eerste?.kind === 'image' ? (
          <img src={receiptFileUrl(receipt.id, eerste.id, 'image', Boolean(eerste.thumb))} alt="" loading="lazy" />
        ) : (
          <Icon name="bon" size={22} />
        )}
      </span>
      <span className="grow bonrow__text">
        <strong className="bonrow__title">{titel}</strong>
        <span className="small muted bonrow__meta">{meta}</span>
        <span className="bonrow__chips">
          {!receipt.title.trim() && <span className="chip chip--warn">Nog aanvullen</span>}
          {status.end && (
            <span className={`chip ${status.kind === 'bijna' ? 'chip--warn' : status.kind === 'verlopen' ? 'chip--parro' : ''}`}>
              {status.kind === 'verlopen' ? `Garantie verlopen ${datumMetJaar(status.end)}` : `Garantie ${timeLeftLabel(today, status.end)}`}
            </span>
          )}
          {receipt.person !== 'gezin' && (
            <span className="chip chip--parro">
              <Avatar who={receipt.person} size={16} /> {PERSON_LABEL[receipt.person]}
            </span>
          )}
        </span>
      </span>
      <Icon name="chevron-rechts" size={17} />
    </button>
  );
}
