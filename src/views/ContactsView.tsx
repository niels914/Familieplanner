import { useEffect, useMemo, useState } from 'react';
import type { ChildId, Contact } from '../../shared/types';
import { CHILDREN, PERSON_LABEL } from '../../shared/types';
import { useData } from '../lib/store';
import { euro, initials } from '../lib/events';
import { ContactForm } from '../components/ContactForm';

type Filter = 'alle' | ChildId | 'oppas' | 'overig';

const FILTER_LABEL: Record<Filter, string> = {
  alle: 'Alle',
  matthijs: 'Klas Matthijs',
  amelie: 'Klas Amélie',
  lotte: 'Klas Lotte',
  oppas: 'Oppas',
  overig: 'Overig',
};

export function ContactsView() {
  const { contacts } = useData();
  const [filter, setFilter] = useState<Filter>('alle');
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<Contact | null>(null);
  const [creating, setCreating] = useState(false);

  // Een filter voor een kind zonder contacten is alleen maar ruis; Lotte krijgt
  // pas een chip zodra er een klasgenootje van haar in staat.
  const available = useMemo<Filter[]>(() => {
    const out: Filter[] = ['alle'];
    for (const child of CHILDREN) {
      if (contacts.some((c) => c.kind === 'klasgenoot' && c.childOf === child)) out.push(child);
    }
    if (contacts.some((c) => c.kind === 'oppas')) out.push('oppas');
    if (contacts.some((c) => c.kind === 'overig')) out.push('overig');
    return out;
  }, [contacts]);

  // Verdwijnt het actieve filter (laatste contact weg), val dan terug op alles.
  useEffect(() => {
    if (!available.includes(filter)) setFilter('alle');
  }, [available, filter]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return contacts
      .filter((c) => {
        if (filter === 'oppas') return c.kind === 'oppas';
        if (filter === 'overig') return c.kind === 'overig';
        if (filter === 'matthijs') return c.kind === 'klasgenoot' && c.childOf === 'matthijs';
        if (filter === 'amelie') return c.kind === 'klasgenoot' && c.childOf === 'amelie';
        return true;
      })
      .filter((c) => {
        if (!q) return true;
        const haystack = [
          c.name,
          c.group,
          c.notes,
          c.phone,
          ...c.parents.flatMap((p) => [p.name, p.phone, p.email]),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(q);
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'nl'));
  }, [contacts, filter, query]);

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <h1>Contacten</h1>
          <div className="page__sub">
            Klasgenootjes met de telefoonnummers van hun ouders, plus oppassen.
          </div>
        </div>
        <button className="btn btn--primary btn--sm" onClick={() => setCreating(true)}>
          + Nieuw
        </button>
      </div>

      <input
        className="input"
        placeholder="Zoek op naam, ouder of telefoonnummer"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{ marginBottom: 12 }}
      />

      <div className="filters">
        {available.map((f) => (
          <button key={f} className="filter" aria-pressed={filter === f} onClick={() => setFilter(f)}>
            {FILTER_LABEL[f]}
          </button>
        ))}
      </div>

      <div className="list">
        {list.length === 0 ? (
          <div className="empty">
            {contacts.length === 0
              ? 'Nog geen contacten. Voeg het eerste klasgenootje toe.'
              : 'Niets gevonden.'}
          </div>
        ) : (
          list.map((c) => <ContactTile key={c.id} contact={c} onEdit={() => setEditing(c)} />)
        )}
      </div>

      {editing && <ContactForm initial={editing} onClose={() => setEditing(null)} />}
      {creating && <ContactForm onClose={() => setCreating(false)} />}
    </div>
  );
}

function ContactTile({ contact, onEdit }: { contact: Contact; onEdit: () => void }) {
  const avatarClass =
    contact.kind === 'oppas' ? 'avatar--oppas' : contact.childOf ? `avatar--${contact.childOf}` : '';

  const phones = [
    ...(contact.phone ? [{ name: contact.name, phone: contact.phone }] : []),
    ...contact.parents
      .filter((p) => p.phone)
      .map((p) => ({ name: `${p.name} (${p.role})`, phone: p.phone! })),
  ];

  return (
    <div className="card card--pad">
      <div className="row" style={{ alignItems: 'flex-start' }}>
        <div className={`avatar ${avatarClass}`}>{initials(contact.name)}</div>
        <div className="grow">
          <div className="row row--between">
            <strong>{contact.name}</strong>
            <button className="btn btn--ghost btn--sm" onClick={onEdit}>
              Bewerken
            </button>
          </div>
          <div className="small muted">
            {contact.kind === 'klasgenoot' && (
              <>
                Klasgenootje van {contact.childOf ? PERSON_LABEL[contact.childOf] : '—'}
                {contact.group && ` · ${contact.group}`}
              </>
            )}
            {contact.kind === 'oppas' && (
              <>Oppas{contact.sitterRate ? ` · ${euro(contact.sitterRate)} per uur` : ''}</>
            )}
            {contact.kind === 'overig' && 'Overig contact'}
            {contact.birthday && ` · jarig ${contact.birthday.slice(8)}-${contact.birthday.slice(5, 7)}`}
          </div>

          {phones.length > 0 && (
            <div className="row row--wrap" style={{ marginTop: 8 }}>
              {phones.map((p) => (
                <a key={p.phone} className="phone" href={`tel:${p.phone.replace(/\s/g, '')}`}>
                  📞 {p.name}: {p.phone}
                </a>
              ))}
            </div>
          )}

          {contact.notes && <div className="small muted" style={{ marginTop: 6 }}>{contact.notes}</div>}
        </div>
      </div>
    </div>
  );
}
