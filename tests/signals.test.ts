/** Controleert het signaleren van "allebei weg". */
import type { CalendarEvent, Decisions } from '../shared/types';
import {
  awaySpan,
  computeSignals,
  durationLabel,
  isAutoClosed,
  isOpen,
  isSettled,
  signalsForDraft,
  signalsOn,
  spanLabel,
  subtract,
} from '../shared/signals';
import { check, report } from './helpers';

let n = 0;
function ev(p: Partial<CalendarEvent>): CalendarEvent {
  return {
    id: `e${++n}`,
    source: 'local',
    title: 'Item',
    date: '2026-10-09',
    allDay: false,
    person: 'gezin',
    category: 'anders',
    bring: [],
    reminder: true,
    createdAt: '',
    updatedAt: '',
    ...p,
  };
}
const weg = (person: 'niels' | 'irene', time: string, endTime?: string, extra: Partial<CalendarEvent> = {}) =>
  ev({ person, category: 'weg', title: 'Niet thuis', time, endTime, ...extra });

// --- tijdvakken
check('weg met eindtijd', awaySpan(weg('niels', '18:00', '22:00'), '2026-10-09'), [1080, 1320]);
check('weg zonder eindtijd: drie uur geschat', awaySpan(weg('niels', '18:00'), '2026-10-09'), [1080, 1260]);
check('hele dag weg', awaySpan(ev({ person: 'niels', category: 'weg', allDay: true }), '2026-10-09'), [0, 1440]);
check('een kind kan niet "weg" zijn', awaySpan(ev({ person: 'matthijs', category: 'weg', time: '18:00' }), '2026-10-09'), null);
check('ander soort item telt niet', awaySpan(ev({ person: 'niels', category: 'afspraak', time: '18:00' }), '2026-10-09'), null);
check('eindtijd na middernacht wordt tot het einde van de dag', awaySpan(weg('niels', '22:00', '01:00'), '2026-10-09'), [1320, 1440]);

const tweeDaags = weg('niels', '08:00', '17:00', { date: '2026-10-09', endDate: '2026-10-11' });
check('meerdaags: eerste dag vanaf de begintijd', awaySpan(tweeDaags, '2026-10-09'), [480, 1440]);
check('meerdaags: tussendag helemaal', awaySpan(tweeDaags, '2026-10-10'), [0, 1440]);
check('meerdaags: laatste dag tot de eindtijd', awaySpan(tweeDaags, '2026-10-11'), [0, 1020]);

// --- signaleren
const samen = [weg('niels', '17:30', '21:00'), weg('irene', '17:30', '20:00', { title: 'Later thuis' })];
const s1 = signalsOn(samen, '2026-10-09');
check('allebei weg: één signaal', s1.length, 1);
check('het tijdvak is het stuk dat ze allebei weg zijn', spanLabel(s1[0].window), '17:30–20:00');
check('niet gedekt', s1[0].coverage, 'none');
check('sleutel is datum en begin', s1[0].key, '2026-10-09|1050');
check('duur', durationLabel(s1[0].window), '2,5 uur');

check('alleen Niels weg: geen signaal', signalsOn([weg('niels', '18:00', '22:00')], '2026-10-09').length, 0);
check(
  'minder dan een half uur samen: geen signaal',
  signalsOn([weg('niels', '18:00', '19:00'), weg('irene', '18:40', '21:00')], '2026-10-09').length,
  0,
);
check(
  'precies een half uur samen: wel',
  signalsOn([weg('niels', '18:00', '19:00'), weg('irene', '18:30', '21:00')], '2026-10-09').length,
  1,
);
check('andere dag: niets', signalsOn(samen, '2026-10-10').length, 0);
check('zonder eindtijd staat het erbij', signalsOn([weg('niels', '18:00'), weg('irene', '18:00', '22:00')], '2026-10-09')[0].guessed, true);
check('met eindtijden is het geen schatting', s1[0].guessed, false);

// --- oppas
const oppasVol = ev({ category: 'oppas', title: 'Oppas Marloes', time: '17:00', endTime: '21:30', sitter: { name: 'Marloes', start: '17:00', end: '21:30', rate: 7, paid: false } });
const s2 = signalsOn([...samen, oppasVol], '2026-10-09')[0];
check('oppas die alles dekt: gedekt', s2.coverage, 'full');
check('de oppas staat bij het signaal', s2.sitters.length, 1);

const oppasDeel = ev({ category: 'oppas', time: '18:00', endTime: '19:00', sitter: { name: 'Sanne', start: '18:00', end: '19:00', rate: 7, paid: false } });
const s3 = signalsOn([...samen, oppasDeel], '2026-10-09')[0];
check('oppas dekt een deel', s3.coverage, 'partial');
check('wat nog openstaat', s3.gaps.map(spanLabel), ['17:30–18:00', '19:00–20:00']);

const oppasAlleenSitter = ev({ category: 'oppas', allDay: true, sitter: { name: 'Sanne', start: '17:00', end: '23:00', rate: 7, paid: false } });
check('oppas telt via de tijden van de oppas, ook als het item een hele dag is', signalsOn([...samen, oppasAlleenSitter], '2026-10-09')[0].coverage, 'full');

const oppasZonderTijd = ev({ category: 'oppas', allDay: true });
check('oppas zonder tijden dekt niets', signalsOn([...samen, oppasZonderTijd], '2026-10-09')[0].coverage, 'none');

check('subtract: stukjes onder een half uur vallen weg', subtract([0, 100], [[10, 90]]), []);

// --- open en opgelost
const geen: Decisions = {};
check('open zolang er niets besloten is', isOpen(s1[0], geen), true);
check('besluit "thuis": niet meer open', isOpen(s1[0], { [s1[0].key]: { type: 'thuis', who: 'niels', at: '' } }), false);
check('besluit "thuis": opgelost', isSettled(s1[0], { [s1[0].key]: { type: 'thuis', who: 'niels', at: '' } }), true);
check('besluit "geen probleem": opgelost', isSettled(s1[0], { [s1[0].key]: { type: 'ok', at: '' } }), true);
check(
  'besluit "oppas regelen": nog niet opgelost',
  isSettled(s1[0], { [s1[0].key]: { type: 'oppas', who: 'irene', taskId: 't', at: '' } }),
  false,
);
check('gedekt door oppas: opgelost zonder besluit', isSettled(s2, geen), true);
check('gedekt signaal is niet meer open', isOpen(s2, geen), false);
check('oppas-taak sluit vanzelf als de oppas er staat', isAutoClosed(s2.key, [s2]), true);
check('oppas-taak blijft open zolang niet gedekt', isAutoClosed(s1[0].key, s1), false);

// --- vooruitkijken
const komend = computeSignals([...samen], '2026-10-06');
check('computeSignals vindt het signaal in de komende dagen', komend.length, 1);
check('verleden telt niet', computeSignals([...samen], '2026-10-10').length, 0);

// --- waarschuwing tijdens het invullen
const bestaand = [weg('irene', '17:30', '20:00', { title: 'Later thuis' })];
const concept = weg('niels', '18:00', '22:00');
const w = signalsForDraft(bestaand, concept, '2026-10-06');
check('waarschuwing bij een concept dat botst', w.length, 1);
check('het stuk dat botst', spanLabel(w[0].window), '18:00–20:00');
check('een concept dat niet botst geeft niets', signalsForDraft(bestaand, weg('niels', '21:00', '23:00'), '2026-10-06').length, 0);
const aangepast = { ...concept, time: '21:00', endTime: '23:00' };
check('een bestaand item aanpassen telt het oude niet mee', signalsForDraft([...bestaand, concept], aangepast, '2026-10-06').length, 0);

report('signaleren');
