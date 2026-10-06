/**
 * Overzicht van één reeks, zoals zwemles. Hier voeg je per keer iets toe:
 * vink de lessen aan waarin Matthijs met kleren zwemt en zet in één keer
 * "kleren om in te zwemmen" op hun meeneem-lijstje. De avond ervoor staat
 * het dan in de herinnering.
 */

import { useMemo, useState } from 'react';
import type { CalendarEvent } from '../../shared/types';
import { PERSON_LABEL } from '../../shared/types';
import { formatLong, todayInNl } from '../../shared/dates';
import { byDate } from '../lib/events';
import { useData, useStore } from '../lib/store';
import { Modal } from './Modal';
import { EventForm } from './EventForm';
import { EmptyState } from './EmptyState';
import { Icon } from './Icon';

export function SeriesView({ seriesId, onClose }: { seriesId: string; onClose: () => void }) {
  const { events } = useData();
  const { addBringBulk, deleteSeries, setNotice } = useStore();
  const [editing, setEditing] = useState<CalendarEvent | null>(null);
  const [gekozen, setGekozen] = useState<Set<string>>(new Set());
  const [tekst, setTekst] = useState('');
  const [toonVoorbij, setToonVoorbij] = useState(false);
  const [busy, setBusy] = useState(false);

  const vandaag = todayInNl();
  const keren = useMemo(
    () => events.filter((e) => e.series?.id === seriesId).sort(byDate),
    [events, seriesId],
  );
  const voorbij = keren.filter((e) => e.date < vandaag);
  const zichtbaar = toonVoorbij ? keren : keren.filter((e) => e.date >= vandaag);

  /** Wat er in deze reeks al eens mee moest: met één tik opnieuw te gebruiken. */
  const suggesties = useMemo(() => {
    const gezien = new Map<string, string>();
    for (const e of keren) for (const b of e.bring) gezien.set(b.text.toLowerCase(), b.text);
    return [...gezien.values()].slice(0, 4);
  }, [keren]);

  if (keren.length === 0) {
    return (
      <Modal title="Reeks" onClose={onClose}>
        <EmptyState icon="herhaal" title="Deze reeks bestaat niet meer." />
      </Modal>
    );
  }

  const eerste = keren[0];
  const reeks = eerste.series!;
  const weekdag = formatLong(eerste.date).split(' ')[0];

  const wissel = (id: string) =>
    setGekozen((oud) => {
      const nieuw = new Set(oud);
      if (nieuw.has(id)) nieuw.delete(id);
      else nieuw.add(id);
      return nieuw;
    });

  const voegToe = async (wat: string) => {
    const t = wat.trim();
    if (!t || gekozen.size === 0) return;
    setBusy(true);
    try {
      await addBringBulk([...gekozen], t);
      setNotice(`"${t}" toegevoegd aan ${gekozen.size} keer.`);
      setGekozen(new Set());
      setTekst('');
    } finally {
      setBusy(false);
    }
  };

  const verwijderReeks = async () => {
    setBusy(true);
    try {
      await deleteSeries(seriesId);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Modal
        title={eerste.title}
        onClose={onClose}
        footer={
          gekozen.size > 0 ? (
            <div className="stack stack--sm grow">
              <span className="small">
                <strong>{gekozen.size} keer gekozen.</strong> Wat moet er dan mee?
              </span>
              {suggesties.length > 0 && (
                <div className="picks">
                  {suggesties.map((s) => (
                    <button key={s} className="pick" disabled={busy} onClick={() => void voegToe(s)}>
                      <Icon name="plus" size={14} /> {s}
                    </button>
                  ))}
                </div>
              )}
              <div className="row">
                <input
                  className="input grow"
                  placeholder="Bijv. kleren om in te zwemmen"
                  aria-label="Wat moet er mee bij de gekozen keren"
                  value={tekst}
                  onChange={(e) => setTekst(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void voegToe(tekst);
                  }}
                />
                <button
                  className="btn btn--primary"
                  disabled={busy || !tekst.trim()}
                  onClick={() => void voegToe(tekst)}
                >
                  Toevoegen
                </button>
              </div>
            </div>
          ) : (
            <div className="row row--between grow">
              <span className="small muted">Vink keren aan om er iets aan toe te voegen.</span>
              <button className="btn btn--danger btn--sm" onClick={verwijderReeks} disabled={busy}>
                Reeks verwijderen
              </button>
            </div>
          )
        }
      >
        <p className="small muted" style={{ marginTop: 0 }}>
          <Icon name="herhaal" size={15} style={{ verticalAlign: -3 }} />{' '}
          {reeks.interval === 2 ? 'Om de week' : 'Elke week'} op {weekdag}
          {eerste.time ? ` om ${eerste.time}` : ''}
          {eerste.person !== 'gezin' ? ` · ${PERSON_LABEL[eerste.person]}` : ''} · {keren.length} keer,
          t/m {formatLong(keren[keren.length - 1].date).split(' ').slice(1).join(' ')}
        </p>

        {zichtbaar.length === 0 ? (
          <EmptyState icon="herhaal" title="Alle keren zijn voorbij." />
        ) : (
          <ul className="reekslijst">
            {zichtbaar.map((e) => {
              const mee = e.bring.filter((b) => !b.done);
              const afwijkend = e.time !== eerste.time || e.title !== eerste.title;
              return (
                <li key={e.id} className={`reeksrij ${e.date < vandaag ? 'reeksrij--voorbij' : ''}`}>
                  <input
                    type="checkbox"
                    aria-label={`${formatLong(e.date)} kiezen`}
                    checked={gekozen.has(e.id)}
                    onChange={() => wissel(e.id)}
                  />
                  <button className="reeksrij__open" onClick={() => setEditing(e)}>
                    <span className="reeksrij__datum cap">
                      {formatLong(e.date)}
                      {e.date === vandaag && <span className="chip chip--gezin">vandaag</span>}
                    </span>
                    {afwijkend && (
                      <span className="reeksrij__extra">
                        {e.time ? `${e.time} · ` : ''}
                        {e.title}
                      </span>
                    )}
                    {e.notes && <span className="reeksrij__extra">{e.notes}</span>}
                    {mee.length > 0 && (
                      <span className="reeksrij__mee iconrow">
                        <Icon name="rugzak" size={14} /> {mee.map((b) => b.text).join(', ')}
                      </span>
                    )}
                  </button>
                  <Icon name="chevron-rechts" size={16} className="muted" />
                </li>
              );
            })}
          </ul>
        )}

        {voorbij.length > 0 && (
          <button className="btn btn--ghost btn--sm" onClick={() => setToonVoorbij((v) => !v)}>
            {toonVoorbij ? 'Voorbije keren verbergen' : `Ook de ${voorbij.length} voorbije keren tonen`}
          </button>
        )}
      </Modal>

      {editing && <EventForm initial={editing} date={editing.date} onClose={() => setEditing(null)} />}
    </>
  );
}
