/** Voorbeelddata voor de lokale testserver: een gewone week bij het gezin. */

const uid = () => Math.random().toString(36).slice(2, 10);
const today = new Date().toISOString().slice(0, 10);
const plus = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };

export function voorbeeldData() {
  return {
  events: [
    { id: uid(), source: 'agenda', agendaFeed: 'niels', agendaUid: 'g1', title: 'Klantgesprek Den Haag', date: plus(1), time: '10:00', endTime: '15:00', allDay: false, person: 'niels', category: 'afspraak', bring: [], reminder: false, location: 'Den Haag', createdAt: '', updatedAt: '' },
    { id: uid(), source: 'parro', parroUid: 'p1', title: 'Schoolreisje groep 1/2', date: plus(6), allDay: true, person: 'matthijs', category: 'school', bring: [{ id: uid(), text: 'Rugzak met lunch', done: false }, { id: uid(), text: 'Regenjas', done: true }], notes: 'Vertrek om 8:45 vanaf het plein.', reminder: true, createdAt: '', updatedAt: '' },
    { id: uid(), source: 'local', title: 'Lege schoenendoos mee', date: plus(1), allDay: true, person: 'matthijs', category: 'school', bring: [{ id: uid(), text: 'Lege schoenendoos', done: false }], reminder: true, createdAt: '', updatedAt: '' },
    { id: uid(), source: 'local', title: 'Knuffeldag', date: plus(1), allDay: true, person: 'amelie', category: 'psz', bring: [{ id: uid(), text: 'Knuffel', done: false }], reminder: true, createdAt: '', updatedAt: '' },
    { id: uid(), source: 'local', title: 'Oppas', date: plus(2), allDay: true, person: 'gezin', category: 'oppas', bring: [], reminder: true, sitter: { name: 'Sanne', start: '18:30', end: '23:00', rate: 6.5, paid: false }, createdAt: '', updatedAt: '' },
    { id: uid(), source: 'local', title: 'Oppas (bioscoop)', date: plus(-3), allDay: true, person: 'gezin', category: 'oppas', bring: [], reminder: true, sitter: { name: 'Joris', start: '19:30', end: '23:00', rate: 7, paid: false }, createdAt: '', updatedAt: '' },
    { id: uid(), source: 'local', title: 'Oppas (etentje)', date: plus(-9), allDay: true, person: 'gezin', category: 'oppas', bring: [], reminder: true, sitter: { name: 'Sanne', start: '19:00', end: '23:30', rate: 6.5, paid: true }, createdAt: '', updatedAt: '' },
    { id: uid(), source: 'local', title: 'Bibliotheek', date: today, time: '16:15', allDay: false, person: 'matthijs', category: 'afspraak', bring: [], reminder: true, createdAt: '', updatedAt: '' },
    { id: uid(), source: 'parro', parroUid: 'p9', title: 'Luizencontrole', date: today, time: '08:30', allDay: false, person: 'matthijs', category: 'school', bring: [], reminder: true, createdAt: '', updatedAt: '' },
    { id: uid(), source: 'local', title: 'Fruitdag', date: today, allDay: true, person: 'amelie', category: 'psz', bring: [{ id: uid(), text: 'Appel', done: true }], reminder: true, createdAt: '', updatedAt: '' },
    { id: uid(), source: 'local', title: 'Consultatiebureau Lotte', date: today, time: '11:15', allDay: false, person: 'lotte', category: 'afspraak', bring: [{ id: uid(), text: 'Groeiboekje', done: false }], reminder: true, createdAt: '', updatedAt: '' },
    { id: uid(), source: 'local', title: 'Consultatiebureau', date: plus(3), time: '10:00', allDay: false, person: 'lotte', category: 'afspraak', bring: [{ id: uid(), text: 'Groeiboekje', done: false }], reminder: true, createdAt: '', updatedAt: '' },
    { id: uid(), source: 'local', title: 'Wenmiddag opvang', date: plus(1), allDay: true, person: 'lotte', category: 'opvang', bring: [{ id: uid(), text: 'Reservekleertjes', done: false }, { id: uid(), text: 'Speen', done: false }], reminder: true, createdAt: '', updatedAt: '' },
    // Allebei weg over drie dagen, nog niet geregeld: dit geeft een signaal.
    { id: uid(), source: 'local', title: 'Borrel', date: plus(3), time: '17:30', endTime: '21:00', allDay: false, person: 'niels', category: 'weg', bring: [], reminder: false, createdAt: '', updatedAt: '' },
    { id: uid(), source: 'local', title: 'Later thuis', date: plus(3), time: '17:30', endTime: '20:00', allDay: false, person: 'irene', category: 'weg', bring: [], reminder: false, createdAt: '', updatedAt: '' },
    // Allebei weg, maar de oppas van overmorgen dekt het: geen signaal.
    { id: uid(), source: 'local', title: 'Etentje', date: plus(2), time: '19:00', endTime: '22:00', allDay: false, person: 'niels', category: 'weg', bring: [], reminder: false, createdAt: '', updatedAt: '' },
    { id: uid(), source: 'local', title: 'Etentje', date: plus(2), time: '19:00', endTime: '22:00', allDay: false, person: 'irene', category: 'weg', bring: [], reminder: false, createdAt: '', updatedAt: '' },
    { id: uid(), source: 'parro', parroUid: 'p2', title: 'Studiedag — alle kinderen vrij', date: plus(12), allDay: true, person: 'matthijs', category: 'school', bring: [], reminder: true, createdAt: '', updatedAt: '' },
  ],
  contacts: [
    { id: uid(), kind: 'klasgenoot', name: 'Fenna de Wit', childOf: 'matthijs', group: 'groep 1/2A', address: 'Dierenriem 18', parents: [{ id: uid(), name: 'Marieke de Wit', role: 'moeder', phone: '06 12345678' }, { id: uid(), name: 'Joost de Wit', role: 'vader', phone: '06 87654321' }], createdAt: '', updatedAt: '' },
    { id: uid(), kind: 'klasgenoot', name: 'Sem Bakker', childOf: 'matthijs', group: 'groep 1/2A', parents: [{ id: uid(), name: 'Anne Bakker', role: 'moeder', phone: '06 24681012' }], notes: 'Woont om de hoek, noten-allergie.', createdAt: '', updatedAt: '' },
    { id: uid(), kind: 'oppas', name: 'Joris Peters', phone: '06 55667788', sitterRate: 7, notes: 'Alleen doordeweeks.', parents: [], createdAt: '', updatedAt: '' },
    { id: uid(), kind: 'overig', name: 'Opa Henk', phone: '06 99887766', birthday: `1950-${plus(1).slice(5)}`, parents: [], createdAt: '', updatedAt: '' },
    { id: uid(), kind: 'overig', name: 'Huisarts Elst', phone: '0481 371234', parents: [], createdAt: '', updatedAt: '' },
    { id: uid(), kind: 'oppas', name: 'Sanne Vermeer', phone: '06 11223344', sitterRate: 6.5, notes: 'Kan meestal op vrijdag en zaterdag.', parents: [], createdAt: '', updatedAt: '' },
  ],
  pickupRules: [
    { id: uid(), weekday: 1, child: 'matthijs', dropoff: 'Irene', pickup: 'Niels' },
    { id: uid(), weekday: 2, child: 'matthijs', dropoff: 'Niels', pickup: 'BSO' },
    { id: uid(), weekday: 1, child: 'amelie', dropoff: 'Irene', pickup: 'Irene' },
    { id: uid(), weekday: 2, child: 'lotte', dropoff: 'Niels', pickup: 'Irene' },
    { id: uid(), weekday: 3, child: 'matthijs', dropoff: 'Irene', pickup: 'Niels' },
    { id: uid(), weekday: 3, child: 'amelie', dropoff: 'Niels', pickup: 'Opa & oma' },
    { id: uid(), weekday: 5, child: 'matthijs', dropoff: 'Irene', pickup: 'Niels' },
    { id: uid(), weekday: 5, child: 'amelie', dropoff: 'Niels', pickup: 'Opa & oma' },
  ],
  pickupOverrides: [],
  tasks: [
    { id: uid(), title: 'Cadeau halen voor Daan', owner: 'niels', kid: 'matthijs', due: plus(-1), done: false, createdAt: '', updatedAt: '' },
    { id: uid(), title: 'Aanmelden ouderavond', owner: 'samen', due: plus(4), done: false, createdAt: '', updatedAt: '' },
    { id: uid(), title: 'Tandarts afspreken', owner: 'irene', kid: 'amelie', done: false, createdAt: '', updatedAt: '' },
    { id: uid(), title: 'Formulier schoolreisje', owner: 'irene', done: true, decision: 'Irene heeft het ingeleverd', createdAt: '', updatedAt: '' },
  ],
  decisions: {},
  shopping: [
    { id: uid(), text: 'Melk', done: false, createdAt: '' },
    { id: uid(), text: 'Luiers maat 5', done: false, createdAt: '' },
    { id: uid(), text: 'Brood', done: true, createdAt: '' },
  ],
  meals: [{ date: today, dish: 'Pasta pesto', ingredients: ['pesto', 'pijnboompitten'] }],
  settings: { reminderHour: 19, parroLastSync: new Date().toISOString(), parroLastResult: 'Parro gesynchroniseerd: 2 nieuw, 0 bijgewerkt, 0 verwijderd.', agendaSync: { niels: { at: new Date().toISOString(), ok: true, message: 'Gmail van Niels: 3 nieuw, 0 bijgewerkt, 0 verwijderd.', count: 42 } } },
};
}
