/* Lokale nepserver: serveert dist/ en bootst de API na met data in het geheugen.
   Alleen voor het visueel controleren van de app; hoort niet in productie. */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';

const ROOT = new URL('../dist/', import.meta.url).pathname;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webmanifest': 'application/manifest+json', '.json': 'application/json' };

const uid = () => Math.random().toString(36).slice(2, 10);
const today = new Date().toISOString().slice(0, 10);
const plus = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };

const db = {
  events: [
    { id: uid(), source: 'parro', parroUid: 'p1', title: 'Schoolreisje groep 1/2', date: plus(6), allDay: true, person: 'matthijs', category: 'school', bring: [{ id: uid(), text: 'Rugzak met lunch', done: false }, { id: uid(), text: 'Regenjas', done: true }], notes: 'Vertrek om 8:45 vanaf het plein.', reminder: true, createdAt: '', updatedAt: '' },
    { id: uid(), source: 'local', title: 'Lege schoenendoos mee', date: plus(1), allDay: true, person: 'matthijs', category: 'school', bring: [{ id: uid(), text: 'Lege schoenendoos', done: false }], reminder: true, createdAt: '', updatedAt: '' },
    { id: uid(), source: 'local', title: 'Knuffeldag', date: plus(1), allDay: true, person: 'amelie', category: 'psz', bring: [{ id: uid(), text: 'Knuffel', done: false }], reminder: true, createdAt: '', updatedAt: '' },
    { id: uid(), source: 'local', title: 'Oppas', date: plus(2), allDay: true, person: 'gezin', category: 'oppas', bring: [], reminder: true, sitter: { name: 'Sanne', start: '18:30', end: '23:00', rate: 6.5, paid: false }, createdAt: '', updatedAt: '' },
    { id: uid(), source: 'local', title: 'Oppas (etentje)', date: plus(-9), allDay: true, person: 'gezin', category: 'oppas', bring: [], reminder: true, sitter: { name: 'Sanne', start: '19:00', end: '23:30', rate: 6.5, paid: true }, createdAt: '', updatedAt: '' },
    { id: uid(), source: 'local', title: 'Zwemles', date: today, time: '16:15', allDay: false, person: 'matthijs', category: 'afspraak', bring: [], reminder: true, createdAt: '', updatedAt: '' },
    { id: uid(), source: 'parro', parroUid: 'p9', title: 'Luizencontrole', date: today, time: '08:30', allDay: false, person: 'matthijs', category: 'school', bring: [], reminder: true, createdAt: '', updatedAt: '' },
    { id: uid(), source: 'local', title: 'Fruitdag', date: today, allDay: true, person: 'amelie', category: 'psz', bring: [{ id: uid(), text: 'Appel', done: true }], reminder: true, createdAt: '', updatedAt: '' },
    { id: uid(), source: 'local', title: 'Consultatiebureau Lotte', date: today, time: '11:15', allDay: false, person: 'lotte', category: 'afspraak', bring: [{ id: uid(), text: 'Groeiboekje', done: false }], reminder: true, createdAt: '', updatedAt: '' },
    { id: uid(), source: 'local', title: 'Consultatiebureau', date: plus(3), time: '10:00', allDay: false, person: 'lotte', category: 'afspraak', bring: [{ id: uid(), text: 'Groeiboekje', done: false }], reminder: true, createdAt: '', updatedAt: '' },
    { id: uid(), source: 'local', title: 'Wenmiddag opvang', date: plus(1), allDay: true, person: 'lotte', category: 'opvang', bring: [{ id: uid(), text: 'Reservekleertjes', done: false }, { id: uid(), text: 'Speen', done: false }], reminder: true, createdAt: '', updatedAt: '' },
    { id: uid(), source: 'parro', parroUid: 'p2', title: 'Studiedag — alle kinderen vrij', date: plus(12), allDay: true, person: 'matthijs', category: 'school', bring: [], reminder: true, createdAt: '', updatedAt: '' },
  ],
  contacts: [
    { id: uid(), kind: 'klasgenoot', name: 'Fenna de Wit', childOf: 'matthijs', group: 'groep 1/2A', birthday: '2021-03-14', giftIdeas: 'Iets met paarden', parents: [{ id: uid(), name: 'Marieke de Wit', role: 'moeder', phone: '06 12345678' }, { id: uid(), name: 'Joost de Wit', role: 'vader', phone: '06 87654321' }], createdAt: '', updatedAt: '' },
    { id: uid(), kind: 'klasgenoot', name: 'Sem Bakker', childOf: 'matthijs', group: 'groep 1/2A', parents: [{ id: uid(), name: 'Anne Bakker', role: 'moeder', phone: '06 24681012' }], notes: 'Woont om de hoek, noten-allergie.', createdAt: '', updatedAt: '' },
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
  shopping: [
    { id: uid(), text: 'Melk', done: false, createdAt: '' },
    { id: uid(), text: 'Luiers maat 5', done: false, createdAt: '' },
    { id: uid(), text: 'Brood', done: true, createdAt: '' },
  ],
  meals: [{ date: today, dish: 'Pasta pesto', ingredients: ['pesto', 'pijnboompitten'] }],
  settings: { reminderHour: 19, parroLastSync: new Date().toISOString(), parroLastResult: 'Parro gesynchroniseerd: 2 nieuw, 0 bijgewerkt, 0 verwijderd.' },
};

createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const send = (code, body, type = 'application/json') => { res.writeHead(code, { 'content-type': type }); res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body)); };

  if (url.pathname.startsWith('/api/')) {
    const path = url.pathname.slice(5);
    if (path === 'session') return send(200, { authenticated: true });
    if (path === 'data') return send(200, { ...db, push: { configured: true, publicKey: 'x' }, parroConfigured: true });
    let body = '';
    for await (const chunk of req) body += chunk;
    const payload = body ? JSON.parse(body) : {};
    if (path === 'events' && req.method === 'POST') {
      const i = db.events.findIndex((e) => e.id === payload.id);
      if (i >= 0) db.events[i] = { ...db.events[i], ...payload }; else db.events.push({ ...payload, id: uid(), source: 'local' });
      return send(200, { events: db.events });
    }
    return send(200, db);
  }

  let file = url.pathname === '/' ? '/index.html' : url.pathname;
  try {
    const data = await readFile(join(ROOT, file));
    return send(200, data, TYPES[extname(file)] ?? 'application/octet-stream');
  } catch {
    const html = await readFile(join(ROOT, 'index.html'));
    return send(200, html, 'text/html');
  }
}).listen(4173, () => console.log('mock op http://localhost:4173'));
