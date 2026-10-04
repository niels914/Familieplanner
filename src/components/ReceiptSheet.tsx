/**
 * Een bonnetje bekijken of aanvullen. Eén blad voor nieuw en bestaand. Een foto alleen is
 * genoeg om op te slaan; de rest kun je later aanvullen. De foto's worden eerst geüpload,
 * pas daarna wordt het bonnetje zelf bewaard, zodat er nooit een verwijzing is naar een
 * bestand dat er niet is.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import type { PersonId, Receipt, ReceiptFile } from '../../shared/types';
import { todayInNl } from '../../shared/dates';
import { timeLeftLabel, warrantyStatus } from '../../shared/warranty';
import { bedrag, datumMetJaar, parseBedrag } from '../lib/bonnetjes';
import { prepareFile, receiptFileUrl, type PreparedFile } from '../lib/image';
import { useStore } from '../lib/store';
import { ChipPicker, type ChipOption } from './ChipPicker';
import { Icon } from './Icon';
import { ImageViewer } from './ImageViewer';
import { Modal } from './Modal';
import { MoreOptions } from './MoreOptions';

const PERSONS: ChipOption<PersonId>[] = [
  { value: 'gezin', label: 'Gezin', avatar: 'gezin' },
  { value: 'niels', label: 'Niels', modifier: 'ouder', avatar: 'niels' },
  { value: 'irene', label: 'Irene', modifier: 'ouder', avatar: 'irene' },
  { value: 'matthijs', label: 'Matthijs', modifier: 'matthijs', avatar: 'matthijs' },
  { value: 'amelie', label: 'Amélie', modifier: 'amelie', avatar: 'amelie' },
  { value: 'lotte', label: 'Lotte', modifier: 'lotte', avatar: 'lotte' },
];

type Garantie = 'geen' | '12' | '24' | '36' | '60' | 'anders';
const GARANTIE: ChipOption<Garantie>[] = [
  { value: 'geen', label: 'Geen' },
  { value: '12', label: '1 jaar' },
  { value: '24', label: '2 jaar' },
  { value: '36', label: '3 jaar' },
  { value: '60', label: '5 jaar' },
  { value: 'anders', label: 'Anders' },
];

type Herinnering = 'auto' | 'aan' | 'uit';
const HERINNERING: ChipOption<Herinnering>[] = [
  { value: 'auto', label: 'Automatisch' },
  { value: 'aan', label: 'Aan' },
  { value: 'uit', label: 'Uit' },
];

const garantieKeuze = (months?: number, until?: string): Garantie => {
  if (!months) return until ? 'anders' : 'geen';
  const tekst = String(months);
  return tekst === '12' || tekst === '24' || tekst === '36' || tekst === '60' ? tekst : 'anders';
};

const herinneringKeuze = (remind?: boolean): Herinnering => (remind === undefined ? 'auto' : remind ? 'aan' : 'uit');

export function ReceiptSheet({
  receipt,
  initial,
  onClose,
}: {
  receipt?: Receipt;
  /** De foto waarmee een nieuw bonnetje begint. */
  initial?: PreparedFile;
  onClose: () => void;
}) {
  const { saveReceipt, deleteReceipt, uploadReceiptFile } = useStore();
  const today = todayInNl();
  const id = useRef(receipt?.id ?? crypto.randomUUID()).current;
  const fileInput = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState(receipt?.title ?? '');
  const [store, setStore] = useState(receipt?.store ?? '');
  const [purchaseDate, setPurchaseDate] = useState(receipt?.purchaseDate ?? today);
  const [amount, setAmount] = useState(receipt?.amountCents !== undefined ? bedrag(receipt.amountCents) : '');
  const [person, setPerson] = useState<PersonId>(receipt?.person ?? 'gezin');
  const [garantie, setGarantie] = useState<Garantie>(garantieKeuze(receipt?.warrantyMonths, receipt?.warrantyUntil));
  const [maanden, setMaanden] = useState(receipt?.warrantyMonths ? String(receipt.warrantyMonths) : '');
  const [warrantyUntil, setWarrantyUntil] = useState(receipt?.warrantyUntil ?? '');
  const [returnUntil, setReturnUntil] = useState(receipt?.returnUntil ?? '');
  const [serial, setSerial] = useState(receipt?.serial ?? '');
  const [notes, setNotes] = useState(receipt?.notes ?? '');
  const [herinnering, setHerinnering] = useState<Herinnering>(herinneringKeuze(receipt?.remind));
  const [meerOpen, setMeerOpen] = useState(Boolean(receipt?.serial || receipt?.returnUntil || receipt?.notes || receipt?.remind !== undefined));

  const [files, setFiles] = useState<ReceiptFile[]>(receipt?.files ?? []);
  const [pending, setPending] = useState<PreparedFile[]>(initial ? [initial] : []);
  const [preparing, setPreparing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [viewing, setViewing] = useState<string | null>(null);

  // De voorbeelden van nieuwe foto's netjes opruimen als het blad dicht gaat.
  const pendingRef = useRef(pending);
  pendingRef.current = pending;
  useEffect(() => () => pendingRef.current.forEach((p) => URL.revokeObjectURL(p.previewUrl)), []);

  const months = garantie === 'geen' ? undefined : garantie === 'anders' ? Number(maanden) || undefined : Number(garantie);
  const amountCents = parseBedrag(amount);
  const status = useMemo(
    () => warrantyStatus({ purchaseDate, warrantyMonths: months, warrantyUntil: warrantyUntil || undefined }, today),
    [purchaseDate, months, warrantyUntil, today],
  );

  const hasContent = files.length + pending.length > 0 || title.trim().length > 0;
  const canSave = hasContent && /^\d{4}-\d{2}-\d{2}$/.test(purchaseDate) && !busy && !preparing;
  const isNew = !receipt;

  const addFile = async (file: File | undefined) => {
    if (!file) return;
    setProblem(null);
    setPreparing(true);
    try {
      const prepared = await prepareFile(file);
      setPending((p) => [...p, prepared]);
    } catch (err) {
      setProblem((err as Error).message);
    } finally {
      setPreparing(false);
    }
  };

  const save = async () => {
    if (!canSave) return;
    setBusy(true);
    setProblem(null);
    try {
      const uploaded: ReceiptFile[] = [];
      for (const p of pending) {
        await uploadReceiptFile(id, `${p.id}.${p.kind === 'pdf' ? 'pdf' : 'jpg'}`, p.blob);
        if (p.thumb) await uploadReceiptFile(id, `${p.id}.t.jpg`, p.thumb);
        uploaded.push({ id: p.id, kind: p.kind, ...(p.thumb ? { thumb: true } : {}) });
      }
      await saveReceipt({
        id,
        title: title.trim(),
        store: store.trim() || null,
        purchaseDate,
        amountCents: amountCents ?? null,
        person,
        warrantyMonths: months ?? null,
        warrantyUntil: warrantyUntil || null,
        returnUntil: returnUntil || null,
        serial: serial.trim() || null,
        notes: notes.trim() || null,
        remind: herinnering === 'auto' ? null : herinnering === 'aan',
        files: [...files, ...uploaded],
      });
      onClose();
    } catch (err) {
      setProblem((err as Error).message);
      setBusy(false);
    }
  };

  const remove = () => {
    if (!receipt) return;
    void deleteReceipt(receipt.id).catch(() => {});
    onClose();
  };

  /** Delen met de deelknop van de telefoon (bijvoorbeeld naar de winkel of de reparateur). */
  const share = async () => {
    const eerste = files[0];
    const url = pending[0]?.previewUrl ?? (eerste ? receiptFileUrl(id, eerste.id, eerste.kind) : undefined);
    if (!url) return;
    try {
      const blob = await (await fetch(url)).blob();
      const pdf = (pending[0]?.kind ?? eerste?.kind) === 'pdf';
      const bestand = new File([blob], `${title.trim() || 'bonnetje'}.${pdf ? 'pdf' : 'jpg'}`, { type: blob.type });
      if (navigator.canShare?.({ files: [bestand] })) {
        await navigator.share({ files: [bestand], title: title.trim() || 'Bonnetje' });
      } else {
        window.open(url, '_blank', 'noopener');
      }
    } catch {
      /* geannuleerd in het deelvenster; niets aan de hand */
    }
  };

  const meerVoorbeeld =
    [serial.trim() && 'serienummer', returnUntil && 'retour', notes.trim() && 'notitie']
      .filter(Boolean)
      .join(' · ') || 'Serienummer, retour, notitie, herinnering';

  const tiles = [
    ...files.map((f) => ({
      key: f.id,
      kind: f.kind,
      thumb: f.kind === 'image' ? receiptFileUrl(id, f.id, 'image', Boolean(f.thumb)) : undefined,
      full: receiptFileUrl(id, f.id, f.kind),
      remove: () => setFiles((l) => l.filter((x) => x.id !== f.id)),
    })),
    ...pending.map((p) => ({
      key: p.id,
      kind: p.kind,
      thumb: p.kind === 'image' ? p.previewUrl : undefined,
      full: p.previewUrl,
      remove: () => setPending((l) => l.filter((x) => x.id !== p.id)),
    })),
  ];

  return (
    <>
      <Modal
        title={isNew ? 'Nieuw bonnetje' : 'Bonnetje'}
        onClose={onClose}
        footer={
          <>
            {receipt && (
              <button className="btn btn--danger" onClick={remove} aria-label="Verwijderen" disabled={busy}>
                <Icon name="prullenbak" size={17} />
              </button>
            )}
            {tiles.length > 0 && (
              <button className="btn" onClick={() => void share()} aria-label="Delen" disabled={busy}>
                <Icon name="delen" size={17} />
              </button>
            )}
            <button className="btn btn--primary grow" onClick={() => void save()} disabled={!canSave}>
              {busy ? 'Bezig met opslaan…' : 'Opslaan'}
            </button>
          </>
        }
      >
        <div className="stack">
          <div className="filestrip" aria-label="Foto’s en pdf’s">
            {tiles.map((t, i) => (
              <div key={t.key} className="filetile">
                {t.thumb ? (
                  <button type="button" className="filetile__open" onClick={() => setViewing(t.full)} aria-label={`Foto ${i + 1} bekijken`}>
                    <img src={t.thumb} alt="" />
                  </button>
                ) : (
                  <a className="filetile__open filetile__pdf" href={t.full} target="_blank" rel="noopener noreferrer" aria-label="Pdf openen">
                    <Icon name="bon" size={26} />
                    <span>pdf</span>
                  </a>
                )}
                <button type="button" className="filetile__x" onClick={t.remove} aria-label={`Foto ${i + 1} weghalen`} disabled={busy}>
                  <Icon name="kruis" size={13} />
                </button>
              </div>
            ))}
            <button type="button" className="filetile filetile--add" onClick={() => fileInput.current?.click()} disabled={busy}>
              <Icon name="camera" size={22} />
              <span>{preparing ? 'Bezig…' : tiles.length === 0 ? 'Foto of pdf' : 'Nog een'}</span>
            </button>
            <input
              ref={fileInput}
              type="file"
              accept="image/*,application/pdf"
              hidden
              onChange={(e) => {
                void addFile(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
          </div>

          <div className="field">
            <label htmlFor="bon-titel">Wat is het?</label>
            <input
              id="bon-titel"
              className="input"
              placeholder="Bijvoorbeeld: Wasmachine"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="field-row">
            <div className="field">
              <label htmlFor="bon-winkel">Winkel</label>
              <input id="bon-winkel" className="input" value={store} onChange={(e) => setStore(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="bon-bedrag">Bedrag (€)</label>
              <input
                id="bon-bedrag"
                className="input"
                inputMode="decimal"
                placeholder="129,00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="bon-datum">Gekocht op</label>
            <input
              id="bon-datum"
              className="input"
              style={{ width: 170 }}
              type="date"
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
            />
          </div>

          <ChipPicker
            label="Garantie van de fabrikant of winkel"
            value={garantie}
            options={GARANTIE}
            onChange={(g) => {
              setGarantie(g);
              // Een eigen einddatum hoort alleen bij "Anders".
              if (g !== 'anders') setWarrantyUntil('');
            }}
          />
          {garantie === 'anders' && (
            <div className="field-row">
              <div className="field">
                <label htmlFor="bon-maanden">Aantal maanden</label>
                <input
                  id="bon-maanden"
                  className="input"
                  inputMode="numeric"
                  value={maanden}
                  onChange={(e) => setMaanden(e.target.value.replace(/\D/g, ''))}
                />
              </div>
              <div className="field">
                <label htmlFor="bon-eind">Of tot en met</label>
                <input id="bon-eind" className="input" type="date" value={warrantyUntil} onChange={(e) => setWarrantyUntil(e.target.value)} />
              </div>
            </div>
          )}
          {status.end && (
            <div className="small">
              <span className={`chip ${status.kind === 'bijna' ? 'chip--warn' : ''}`}>
                <Icon name="klok" size={13} />
                {status.kind === 'verlopen' ? 'Verlopen op ' : 'Loopt tot '}
                {datumMetJaar(status.end)} · {timeLeftLabel(today, status.end)}
              </span>
            </div>
          )}
          <p className="small muted bon__wet">
            Daarnaast geldt de wettelijke garantie: een product moet zo lang meegaan als je redelijkerwijs mag verwachten.
            Meld een gebrek binnen 2 maanden nadat je het ziet.
          </p>

          <ChipPicker label="Van wie" value={person} options={PERSONS} onChange={setPerson} />

          <MoreOptions open={meerOpen} onToggle={() => setMeerOpen((o) => !o)} preview={meerVoorbeeld}>
            <div className="field">
              <label htmlFor="bon-serie">Serienummer</label>
              <input id="bon-serie" className="input" value={serial} onChange={(e) => setSerial(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="bon-retour">Retour kan t/m</label>
              <input
                id="bon-retour"
                className="input"
                style={{ width: 170 }}
                type="date"
                value={returnUntil}
                onChange={(e) => setReturnUntil(e.target.value)}
              />
            </div>
            <ChipPicker label="Herinnering" value={herinnering} options={HERINNERING} onChange={setHerinnering} />
            <span className="small muted">
              Automatisch betekent: een herinnering 30 dagen voor het einde van de garantie bij een bedrag vanaf € 50.
            </span>
            <div className="field">
              <label htmlFor="bon-notitie">Notitie</label>
              <textarea id="bon-notitie" className="textarea" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </MoreOptions>

          {problem && (
            <p className="small bon__problem" role="alert">
              {problem}
            </p>
          )}
        </div>
      </Modal>
      {viewing && <ImageViewer src={viewing} title={title.trim() || 'Bonnetje'} onClose={() => setViewing(null)} />}
    </>
  );
}
