import { useState } from 'react';
import type { ChildId, Contact, Parent, ParentRole } from '../../shared/types';
import { CHILDREN, PERSON_LABEL } from '../../shared/types';
import { Modal } from './Modal';
import { useStore } from '../lib/store';

const ROLES: ParentRole[] = ['moeder', 'vader', 'verzorger'];

function empty(): Partial<Contact> {
  return { kind: 'klasgenoot', name: '', childOf: 'matthijs', parents: [] };
}

export function ContactForm({
  initial,
  onClose,
}: {
  initial?: Contact;
  onClose: () => void;
}) {
  const { saveContact, deleteContact, setNotice } = useStore();
  const [draft, setDraft] = useState<Partial<Contact>>(initial ?? empty());
  const [busy, setBusy] = useState(false);

  const set = <K extends keyof Contact>(key: K, value: Contact[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const setParent = (id: string, patch: Partial<Parent>) =>
    set(
      'parents',
      (draft.parents ?? []).map((p) => (p.id === id ? { ...p, ...patch } : p)),
    );

  const addParent = () =>
    set('parents', [
      ...(draft.parents ?? []),
      { id: crypto.randomUUID(), name: '', role: 'moeder' as ParentRole },
    ]);

  const submit = async () => {
    if (!draft.name?.trim()) {
      setNotice('Geef een naam op.');
      return;
    }
    setBusy(true);
    try {
      await saveContact({
        ...draft,
        name: draft.name.trim(),
        parents: (draft.parents ?? []).filter((p) => p.name.trim() || p.phone?.trim()),
      });
      onClose();
    } catch {
      /* melding komt uit de store */
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!initial) return;
    if (!confirm(`${initial.name} verwijderen?`)) return;
    setBusy(true);
    try {
      await deleteContact(initial.id);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  const isClassmate = draft.kind === 'klasgenoot';

  return (
    <Modal
      title={initial ? 'Contact bewerken' : 'Nieuw contact'}
      onClose={onClose}
      footer={
        <>
          {initial && (
            <button className="btn btn--danger" onClick={remove} disabled={busy}>
              Verwijderen
            </button>
          )}
          <button className="btn btn--primary grow" onClick={submit} disabled={busy}>
            {busy ? 'Bezig…' : 'Opslaan'}
          </button>
        </>
      }
    >
      <div className="stack">
        <div className="field">
          <label htmlFor="ct-kind">Soort contact</label>
          <select
            id="ct-kind"
            className="select"
            value={draft.kind ?? 'klasgenoot'}
            onChange={(e) => set('kind', e.target.value as Contact['kind'])}
          >
            <option value="klasgenoot">Klasgenootje</option>
            <option value="oppas">Oppas</option>
            <option value="overig">Overig</option>
          </select>
        </div>

        <div className="field">
          <label htmlFor="ct-name">{isClassmate ? 'Naam van het klasgenootje' : 'Naam'}</label>
          <input
            id="ct-name"
            className="input"
            value={draft.name ?? ''}
            onChange={(e) => set('name', e.target.value)}
          />
        </div>

        {isClassmate && (
          <div className="field-row">
            <div className="field">
              <label htmlFor="ct-child">Klasgenootje van</label>
              <select
                id="ct-child"
                className="select"
                value={draft.childOf ?? 'matthijs'}
                onChange={(e) => set('childOf', e.target.value as ChildId)}
              >
                {CHILDREN.map((c) => (
                  <option key={c} value={c}>
                    {PERSON_LABEL[c]}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="ct-group">Groep / klas</label>
              <input
                id="ct-group"
                className="input"
                placeholder="Bijv. groep 1/2A"
                value={draft.group ?? ''}
                onChange={(e) => set('group', e.target.value)}
              />
            </div>
          </div>
        )}

        {draft.kind === 'oppas' && (
          <div className="field-row">
            <div className="field">
              <label htmlFor="ct-phone">Telefoon</label>
              <input
                id="ct-phone"
                className="input"
                type="tel"
                value={draft.phone ?? ''}
                onChange={(e) => set('phone', e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="ct-rate">Uurtarief (€)</label>
              <input
                id="ct-rate"
                className="input"
                type="number"
                min="0"
                step="0.5"
                value={draft.sitterRate ?? 0}
                onChange={(e) => set('sitterRate', Number(e.target.value))}
              />
            </div>
          </div>
        )}

        {draft.kind === 'overig' && (
          <div className="field">
            <label htmlFor="ct-phone2">Telefoon</label>
            <input
              id="ct-phone2"
              className="input"
              type="tel"
              value={draft.phone ?? ''}
              onChange={(e) => set('phone', e.target.value)}
            />
          </div>
        )}

        <div className="field-row">
          <div className="field">
            <label htmlFor="ct-bday">Verjaardag</label>
            <input
              id="ct-bday"
              className="input"
              type="date"
              value={draft.birthday ?? ''}
              onChange={(e) => set('birthday', e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="ct-gift">Cadeau-idee</label>
            <input
              id="ct-gift"
              className="input"
              value={draft.giftIdeas ?? ''}
              onChange={(e) => set('giftIdeas', e.target.value)}
            />
          </div>
        </div>

        {isClassmate && (
          <div className="field">
            <label>Ouders</label>
            <div className="stack stack--sm">
              {(draft.parents ?? []).map((p) => (
                <div key={p.id} className="card card--pad stack stack--sm">
                  <div className="row">
                    <input
                      className="input grow"
                      placeholder="Naam"
                      value={p.name}
                      onChange={(e) => setParent(p.id, { name: e.target.value })}
                    />
                    <select
                      className="select"
                      style={{ width: 120 }}
                      value={p.role}
                      onChange={(e) => setParent(p.id, { role: e.target.value as ParentRole })}
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="row">
                    <input
                      className="input grow"
                      type="tel"
                      placeholder="Telefoonnummer"
                      value={p.phone ?? ''}
                      onChange={(e) => setParent(p.id, { phone: e.target.value })}
                    />
                    <button
                      className="btn btn--ghost btn--sm"
                      aria-label="Ouder verwijderen"
                      onClick={() =>
                        set('parents', (draft.parents ?? []).filter((x) => x.id !== p.id))
                      }
                    >
                      ✕
                    </button>
                  </div>
                  <input
                    className="input"
                    type="email"
                    placeholder="E-mail (optioneel)"
                    value={p.email ?? ''}
                    onChange={(e) => setParent(p.id, { email: e.target.value })}
                  />
                </div>
              ))}
              <button className="btn btn--sm" onClick={addParent}>
                + Ouder toevoegen
              </button>
            </div>
          </div>
        )}

        <div className="field">
          <label htmlFor="ct-notes">Notitie</label>
          <textarea
            id="ct-notes"
            className="textarea"
            placeholder="Bijv. allergieën, adres, wie waar woont"
            value={draft.notes ?? ''}
            onChange={(e) => set('notes', e.target.value)}
          />
        </div>
      </div>
    </Modal>
  );
}
