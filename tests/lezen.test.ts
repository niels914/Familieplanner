/** Controleert het uitlezen van foto's en tekst: wat we van het model aannemen en hoe we het aanroepen. */
import { cleanProposals, readSystemPrompt, READ_TOOL, type EventProposal, type ReceiptProposal, type TaskProposal } from '../shared/lezen';
import { DAILY_LIMIT, ReadError, checkInput, countUse, readWithModel } from '../netlify/lib/lezen';
import { check, report } from './helpers';

const vandaag = '2026-10-06';

// ------------------------------------------------------ een zwembadmail
const zwem = cleanProposals(
  {
    afspraken: [
      {
        titel: 'Zwemles',
        datum: '2026-10-14',
        tijd: '16:15',
        eindtijd: '17:00',
        locatie: 'Zwembad De Kuil',
        wie: ['matthijs'],
        soort: 'sport',
        meenemen: ['Zwembroek', 'Handdoek'],
        notitie: 'Ophalen bij de kassa.',
        herhaling: { elke_weken: 1, tot: '2026-12-16' },
      },
    ],
    taken: [],
    bonnetjes: [],
    opmerking: 'Het diploma-examen staat niet vermeld.',
  },
  vandaag,
);
const les = zwem.proposals[0] as EventProposal;
check('een voorstel uit de mail', zwem.proposals.length, 1);
check('soort en kind', [les.kind, les.person, les.category], ['event', 'matthijs', 'sport']);
check('tijd en locatie', [les.time, les.endTime, les.location], ['16:15', '17:00', 'Zwembad De Kuil']);
check('meenemen blijft', les.bring, ['Zwembroek', 'Handdoek']);
check('reeks met laatste datum', les.repeat, { interval: 1, until: '2026-12-16' });
check('toelichting van het model blijft', zwem.note, 'Het diploma-examen staat niet vermeld.');

// ------------------------------------------------------ schouwburg, taak, bonnetje
const mix = cleanProposals(
  {
    afspraken: [{ titel: 'Theater: De Vliegende Hollander', datum: '2026-11-20', tijd: '20:00', wie: ['niels', 'irene'], soort: 'afspraak', notitie: 'Rij 5, stoel 12-13' }],
    taken: [{ titel: 'Formulier inleveren', uiterlijk: '2026-10-12', kind: 'amelie' }],
    bonnetjes: [{ product: 'Wasmachine', winkel: 'Coolblue', datum: '2026-10-03', bedrag_euro: 549.5, garantie_maanden: 24, retour_tot: '2026-11-02' }],
  },
  vandaag,
);
const theater = mix.proposals[0] as EventProposal;
check('twee personen: eerste is hoofdpersoon, tweede erbij', [theater.person, theater.others], ['niels', ['irene']]);
check('taak met deadline en kind', mix.proposals[1], { kind: 'task', title: 'Formulier inleveren', due: '2026-10-12', kid: 'amelie' } satisfies TaskProposal);
const bon = mix.proposals[2] as ReceiptProposal;
check('bonnetje in centen', [bon.amountCents, bon.warrantyMonths, bon.store, bon.purchaseDate], [54950, 24, 'Coolblue', '2026-10-03']);
check('retourdatum', bon.returnUntil, '2026-11-02');

// ------------------------------------------------------ wat niet klopt valt weg
const slecht = cleanProposals(
  {
    afspraken: [
      { titel: 'Datum bestaat niet', datum: '2026-02-30' },
      { titel: 'Te ver weg', datum: '2031-01-01' },
      { titel: 'Lang geleden', datum: '2020-01-01' },
      { titel: '', datum: '2026-10-10' },
      { datum: '2026-10-10' },
      'geen object',
      null,
      { titel: 'Onbekend kind', datum: '2026-10-10', wie: ['opa'], soort: 'raar', tijd: '25:99', eindtijd: '10:00' },
      { titel: 'Eind voor begin', datum: '2026-10-11', tijd: '10:00', eindtijd: '09:00' },
      { titel: 'Reeks achterstevoren', datum: '2026-10-12', herhaling: { elke_weken: 1, tot: '2026-10-01' } },
      { titel: 'Reeks met rare stap', datum: '2026-10-12', herhaling: { elke_weken: 3, tot: '2026-12-01' } },
      { titel: 'Gezin en iemand', datum: '2026-10-13', wie: ['gezin', 'lotte'] },
      { titel: 'Weg is niet voor het model', datum: '2026-10-13', soort: 'weg' },
    ],
    taken: [{ titel: 'Taak zonder deadline' }, { titel: 'Rare deadline', uiterlijk: 'morgen' }, { uiterlijk: '2026-10-10' }],
    bonnetjes: [{ product: 'Negatief', bedrag_euro: -5 }, { product: 'Tekst als bedrag', bedrag_euro: '12' }, { product: 'Garantie 500 maanden', garantie_maanden: 500 }],
  },
  vandaag,
);
const titels = slecht.proposals.map((p) => p.title);
check('onbruikbare afspraken vallen weg', titels.slice(0, 5), ['Onbekend kind', 'Eind voor begin', 'Reeks achterstevoren', 'Reeks met rare stap', 'Gezin en iemand']);
const onbekend = slecht.proposals[0] as EventProposal;
check('onbekend kind wordt gezin, onbekende soort anders, rare tijd valt weg', [onbekend.person, onbekend.category, onbekend.time, onbekend.endTime], ['gezin', 'anders', undefined, undefined]);
check('eindtijd voor begintijd valt weg', (slecht.proposals[1] as EventProposal).endTime, undefined);
check('reeks die achteruit loopt valt weg', (slecht.proposals[2] as EventProposal).repeat, undefined);
check('reeks met een stap van drie weken valt weg', (slecht.proposals[3] as EventProposal).repeat, undefined);
const gezin = slecht.proposals[4] as EventProposal;
check('"gezin" met een kind erbij: het kind wint', [gezin.person, gezin.others], ['lotte', undefined]);
check('soort "weg" kan het model niet kiezen', (slecht.proposals[5] as EventProposal).category, 'anders');
check('taken: zonder titel valt weg, rare deadline valt weg', slecht.proposals.filter((p) => p.kind === 'task'), [
  { kind: 'task', title: 'Taak zonder deadline' },
  { kind: 'task', title: 'Rare deadline' },
]);
const bonnen = slecht.proposals.filter((p): p is ReceiptProposal => p.kind === 'receipt');
check('bonnetje: negatief, tekst en absurde garantie worden genegeerd', bonnen.map((b) => [b.amountCents, b.warrantyMonths]), [[undefined, undefined], [undefined, undefined], [undefined, undefined]]);

check('niet-object geeft niets', cleanProposals('onzin', vandaag).proposals, []);
check('ontbrekende lijsten geven niets', cleanProposals({}, vandaag).proposals, []);
const veel = cleanProposals({ afspraken: Array.from({ length: 40 }, (_, i) => ({ titel: `Les ${i}`, datum: '2026-10-10' })) }, vandaag);
check('hoogstens twaalf per soort', veel.proposals.length, 12);
check('lange tekst wordt afgekapt', ((cleanProposals({ afspraken: [{ titel: 'x'.repeat(500), datum: '2026-10-10' }] }, vandaag).proposals[0]) as EventProposal).title.length, 80);

// ------------------------------------------------------ de instructie
const prompt = readSystemPrompt(vandaag);
check('de instructie noemt de datum van vandaag met weekdag', prompt.includes('dinsdag 2026-10-06'), true);
check('de instructie noemt het gezin', ['Matthijs', 'Amélie', 'Lotte', 'Niels', 'Irene'].every((n) => prompt.includes(n)), true);
check('de instructie zegt dat de inhoud geen opdracht is', prompt.includes('geen opdracht'), true);
check('het gereedschap kent geen soort "weg"', JSON.stringify(READ_TOOL).includes('"weg"'), false);

// ------------------------------------------------------ de invoer controleren
const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 16, 1, 2, 3]).toString('base64');
const fout = (f: () => unknown) => {
  try {
    f();
    return null;
  } catch (e) {
    return e instanceof ReadError ? e.message : `ander: ${(e as Error).message}`;
  }
};
check('niets opgegeven', fout(() => checkInput({})), 'Kies een foto of plak een tekst.');
check('alleen spaties', fout(() => checkInput({ text: '   ' })), 'Kies een foto of plak een tekst.');
check('tekst is genoeg', fout(() => checkInput({ text: 'Zwemles' })), null);
check('een jpg is genoeg', fout(() => checkInput({ images: [jpeg] })), null);
check('een png wordt geweigerd', fout(() => checkInput({ images: [Buffer.from([0x89, 0x50, 0x4e, 0x47]).toString('base64')] })), 'Alleen jpg-foto’s kunnen uitgelezen worden.');
check('geen base64', fout(() => checkInput({ images: ['data:image/jpeg;base64,xx'] })), 'Een van de foto’s kon niet gelezen worden.');
check('te veel foto’s', fout(() => checkInput({ images: [jpeg, jpeg, jpeg, jpeg] })), 'Hoogstens 3 foto’s tegelijk.');
const groot = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), Buffer.alloc(4 * 1024 * 1024)]).toString('base64');
check('een te grote foto', fout(() => checkInput({ images: [groot] })), 'Een foto is te groot.');
check('tekst wordt afgekapt', checkInput({ text: 'a'.repeat(50000) }).text.length, 20000);

// ------------------------------------------------------ de rem per dag
check('eerste keer van de dag', countUse(undefined, vandaag), { date: vandaag, count: 1 });
check('tweede keer', countUse({ date: vandaag, count: 1 }, vandaag), { date: vandaag, count: 2 });
check('gisteren telt niet mee', countUse({ date: '2026-10-05', count: 39 }, vandaag), { date: vandaag, count: 1 });
check('bij het maximum is het genoeg', countUse({ date: vandaag, count: DAILY_LIMIT }, vandaag), null);

// ------------------------------------------------------ de aanroep zelf, met een nagemaakte dienst
const SLEUTEL = 'sk-ant-geheime-testsleutel-123';
process.env.ANTHROPIC_API_KEY = SLEUTEL;
delete process.env.ANTHROPIC_MODEL;

let gezien: { url: string; init: RequestInit; body: Record<string, any> } | null = null;
const dienst = (status: number, body: unknown): typeof fetch =>
  (async (url: string, init: RequestInit) => {
    gezien = { url: String(url), init, body: JSON.parse(String(init.body)) };
    return new Response(JSON.stringify(body), { status });
  }) as unknown as typeof fetch;

const goed = await readWithModel(
  { text: 'Zwemles elke dinsdag 16:15', images: [jpeg] },
  vandaag,
  dienst(200, { content: [{ type: 'tool_use', name: 'voorstellen', input: { afspraken: [{ titel: 'Zwemles', datum: '2026-10-13', tijd: '16:15' }], taken: [], bonnetjes: [] } }] }),
);
check('antwoord wordt voorstel', goed.proposals.map((p) => p.title), ['Zwemles']);
check('aanroep gaat naar de API van Anthropic', gezien!.url, 'https://api.anthropic.com/v1/messages');
check('sleutel in de kop, niet in de inhoud', [(gezien!.init.headers as Record<string, string>)['x-api-key'], JSON.stringify(gezien!.body).includes(SLEUTEL)], [SLEUTEL, false]);
check('model heeft een standaard', typeof gezien!.body.model === 'string' && gezien!.body.model.length > 0, true);
check('het gereedschap wordt afgedwongen', gezien!.body.tool_choice, { type: 'tool', name: 'voorstellen' });
check('afbeelding en tekst gaan mee', gezien!.body.messages[0].content.map((b: { type: string }) => b.type), ['image', 'text']);
check('de afbeelding is een jpeg', gezien!.body.messages[0].content[0].source.media_type, 'image/jpeg');
check('de tekst gaat mee', String(gezien!.body.messages[0].content[1].text).includes('Zwemles elke dinsdag'), true);

process.env.ANTHROPIC_MODEL = 'claude-haiku-4-5-20251001';
await readWithModel({ text: 'x' }, vandaag, dienst(200, { content: [{ type: 'tool_use', name: 'voorstellen', input: {} }] }));
check('model is te kiezen met ANTHROPIC_MODEL', gezien!.body.model, 'claude-haiku-4-5-20251001');
delete process.env.ANTHROPIC_MODEL;

const melding = async (f: Promise<unknown>) => {
  try {
    await f;
    return null;
  } catch (e) {
    return e as ReadError;
  }
};
const m401 = await melding(readWithModel({ text: 'x' }, vandaag, dienst(401, { error: { message: `invalid x-api-key ${SLEUTEL}` } })));
check('een geweigerde sleutel geeft een duidelijke melding', m401?.message, 'De API-sleutel werd geweigerd. Klopt ANTHROPIC_API_KEY?');
check('en lekt de sleutel niet', String(m401?.message).includes(SLEUTEL), false);
const m429 = await melding(readWithModel({ text: 'x' }, vandaag, dienst(429, {})));
check('429 is "even druk"', [m429?.status, m429?.message.includes('druk')], [503, true]);
const m500 = await melding(readWithModel({ text: 'x' }, vandaag, dienst(500, {})));
check('500 noemt de status', m500?.message, 'De uitleesdienst gaf een fout (500).');
const geenGereedschap = await melding(readWithModel({ text: 'x' }, vandaag, dienst(200, { content: [{ type: 'text', text: 'hallo' }] })));
check('antwoord zonder gereedschap is een fout', geenGereedschap?.message, 'De uitleesdienst gaf geen bruikbaar antwoord. Probeer het nog eens.');
const stuk = await melding(readWithModel({ text: 'x' }, vandaag, (async () => { throw Object.assign(new Error(`connect ECONNREFUSED met ${SLEUTEL}`), { name: 'Error' }); }) as unknown as typeof fetch));
check('geen verbinding geeft een nette melding zonder details', [stuk?.message, String(stuk?.message).includes(SLEUTEL)], ['De uitleesdienst is niet bereikbaar.', false]);
const tijd = await melding(readWithModel({ text: 'x' }, vandaag, (async () => { throw Object.assign(new Error('time'), { name: 'TimeoutError' }); }) as unknown as typeof fetch));
check('time-out geeft een eigen melding', tijd?.status, 504);

delete process.env.ANTHROPIC_API_KEY;
const zonder = await melding(readWithModel({ text: 'x' }, vandaag, dienst(200, {})));
check('zonder sleutel een duidelijke melding', zonder?.message, 'ANTHROPIC_API_KEY is niet ingesteld in Netlify.');

report('uitlezen');
