/** Controleert wat er bij Regelen openstaat en hoe dat gegroepeerd wordt. */
import type { CalendarEvent, Decisions, Task } from '../shared/types';
import {
  dueInfo,
  groupOf,
  matchesFilter,
  regelState,
  signalTitle,
  sitterTaskDue,
  sitterTaskTitle,
} from '../src/lib/regelen';
import { check, report } from './helpers';

const today = '2026-10-06';

// --- deadline
check('te laat', dueInfo('2026-10-05', today)?.label, '1 dag te laat');
check('te laat is dringend', dueInfo('2026-10-04', today)?.hot, true);
check('meerdere dagen te laat', dueInfo('2026-10-03', today)?.label, '3 dagen te laat');
check('vandaag', dueInfo('2026-10-06', today)?.label, 'vandaag');
check('morgen is dringend', dueInfo('2026-10-07', today)?.hot, true);
check('over drie dagen is niet dringend', dueInfo('2026-10-09', today)?.hot, false);
check('over drie dagen: deze week', dueInfo('2026-10-09', today)?.bucket, 1);
check('over een week: nog deze week', dueInfo('2026-10-13', today)?.bucket, 1);
check('over acht dagen: later', dueInfo('2026-10-14', today)?.bucket, 2);
check('geen datum: geen info', dueInfo(undefined, today), null);
check('datum als label', dueInfo('2026-10-09', today)?.label, 'vr 9 okt');

// --- openstaand
let n = 0;
const task = (p: Partial<Task>): Task => ({
  id: `t${++n}`, title: 'Taak', owner: 'samen', done: false, createdAt: '', updatedAt: '', ...p,
});
const ev = (p: Partial<CalendarEvent>): CalendarEvent => ({
  id: `e${++n}`, source: 'local', title: 'Item', date: '2026-10-09', allDay: false, person: 'gezin',
  category: 'anders', bring: [], reminder: true, createdAt: '', updatedAt: '', ...p,
});
const weg = (person: 'niels' | 'irene', time: string, endTime: string) =>
  ev({ person, category: 'weg', title: 'Niet thuis', time, endTime });

const agenda = [weg('niels', '17:30', '21:00'), weg('irene', '17:30', '20:00')];
const geenBesluit: Decisions = {};

const s0 = regelState([], [task({ due: '2026-10-05' }), task({ due: '2026-10-20' }), task({})], {}, today);
check('drie open taken', s0.open.length, 3);
check('één dringend', s0.urgent, 1);
check('één binnen een week of eerder', s0.soon, 1);

const s1 = regelState(agenda, [], geenBesluit, today);
check('signaal telt mee als open item', s1.open.length, 1);
check('signaal is van het type signaal', s1.open[0].kind, 'signal');
check('signaal vrijdag over drie dagen: niet dringend', s1.urgent, 0);
check('signaal vrijdag: telt mee in "deze week"', s1.soon, 1);
check('titel van het signaal', signalTitle(s1.signals[0]), 'Allebei weg · vr 9 okt, 17:30–20:00');

const key = s1.signals[0].key;
const s2 = regelState(agenda, [], { [key]: { type: 'thuis', who: 'niels', at: '' } }, today);
check('iemand blijft thuis: niet meer open', s2.open.length, 0);
check('en staat bij opgelost', s2.settledSignals.length, 1);

// --- oppas regelen -> taak
check('titel van de oppas-taak', sitterTaskTitle(s1.signals[0]), 'Oppas regelen voor vr 9 okt, 17:30–20:00');
check('deadline twee dagen vooraf', sitterTaskDue(s1.signals[0], today), '2026-10-07');
check('deadline nooit in het verleden', sitterTaskDue(s1.signals[0], '2026-10-08'), '2026-10-08');

const oppasTaak = task({ title: 'Oppas regelen', owner: 'irene', signalKey: key, due: '2026-10-07' });
const dec: Decisions = { [key]: { type: 'oppas', who: 'irene', taskId: oppasTaak.id, at: '' } };
const s3 = regelState(agenda, [oppasTaak], dec, today);
check('met een oppas-taak staat het één keer op de lijst', s3.open.length, 1);
check('en dat is de taak, niet het signaal', s3.open[0].kind, 'task');

const oppasIn = ev({ category: 'oppas', title: 'Oppas Marloes', sitter: { name: 'Marloes', start: '17:00', end: '21:30', rate: 7, paid: false }, allDay: true });
const s4 = regelState([...agenda, oppasIn], [oppasTaak], dec, today);
check('staat er een oppas in de agenda, dan sluit de taak vanzelf', s4.open.length, 0);
check('en staat bij afgerond', s4.doneTasks.length, 1);
check('met uitleg waarom', s4.doneTasks[0].decision, 'Opgelost: Marloes 17:00–21:30 staat in de agenda.');
check('de opgeslagen taak zelf is niet aangeraakt', oppasTaak.done, false);

const s5 = regelState(agenda, [], dec, today);
check('oppas-taak weggegooid: het signaal is weer open', s5.open.length, 1);

// --- groepen en filter
check('groep te laat', groupOf({ kind: 'task', task: task({}), due: '2026-10-01' }, today), 0);
check('groep geen datum', groupOf({ kind: 'task', task: task({}), due: undefined }, today), 3);
const van = (owner: Task['owner']) => ({ kind: 'task' as const, task: task({ owner }), due: undefined });
check('filter Niels toont ook "afstemmen"', matchesFilter(van('samen'), 'niels'), true);
check('filter Niels verbergt taken van Irene', matchesFilter(van('irene'), 'niels'), false);
check('filter afstemmen toont alleen afstemmen', matchesFilter(van('niels'), 'samen'), false);
check('een signaal hoort bij elk filter', matchesFilter(s1.open[0], 'irene'), true);

report('regelen');
