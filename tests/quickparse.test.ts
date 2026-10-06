/** Controleert de snelinvoer in gewone taal. */
import { quickParse } from '../src/lib/quickparse';
import { check, report } from './helpers';

const vrijdag = '2026-08-21';

const a = quickParse('Matthijs volgende week donderdag lege schoenendoos mee', vrijdag);
check('volgende week donderdag', a.date, '2026-08-27');
check('persoon herkend', a.person, 'matthijs');
check('meenemen herkend', a.bring, ['lege schoenendoos']);
check('school afgeleid uit kind + meenemen', a.category, 'school');

const b = quickParse('Amélie morgen knuffel mee', vrijdag);
check('morgen', b.date, '2026-08-22');
check('Amélie herkend', b.person, 'amelie');
check('peuterspeelzaal afgeleid', b.category, 'psz');

const c = quickParse('Oppas zaterdag om 19:00', vrijdag);
check('eerstvolgende zaterdag', c.date, '2026-08-22');
check('tijd herkend', c.time, '19:00');
check('geen hele dag als er een tijd staat', c.allDay, false);
check('oppas herkend', c.category, 'oppas');

const d = quickParse('Tandarts 3-11 om 14:30', vrijdag);
check('dag-maand notatie', d.date, '2026-11-03');
check('tijd naast een datum', d.time, '14:30');

const e = quickParse('Verjaardag opa 12 september', vrijdag);
check('maand voluit', e.date, '2026-09-12');
check('verjaardag herkend', e.category, 'verjaardag');

const f = quickParse('Meenemen: fruit, drinken en een beker', vrijdag);
check('meerdere dingen meenemen', f.bring, ['fruit', 'drinken', 'een beker']);
check('zonder datum wordt het vandaag', f.date, vrijdag);

const h = quickParse('Lotte dinsdag reservekleertjes mee', vrijdag);
check('Lotte herkend', h.person, 'lotte');
check('kinderopvang afgeleid voor Lotte', h.category, 'opvang');
check('meenemen voor Lotte', h.bring, ['reservekleertjes']);

const i = quickParse('Lotte naar de crèche 3 september', vrijdag);
check('crèche wordt kinderopvang', i.category, 'opvang');

const g = quickParse('Zwemles vrijdag', vrijdag);
check('de dag van vandaag noemen betekent vandaag', g.date, vrijdag);


// --- tijdvak en niet thuis
const r1 = quickParse('Niels niet thuis 18:00-22:00 15 oktober', vrijdag);
check('niet thuis: soort weg', r1.category, 'weg');
check('niet thuis: wie', r1.person, 'niels');
check('tijdvak: begin', r1.time, '18:00');
check('tijdvak: eind', r1.endTime, '22:00');
check('niet thuis: datum', r1.date, '2026-10-15');
check('niet thuis: titel', r1.title, 'Niet thuis');
check('met tijdvak is het geen hele dag', r1.allDay, false);

const r2 = quickParse('Irene later thuis 20:00 vrijdag', vrijdag, { homeTime: '17:30' });
check('later thuis: weg vanaf de normale thuiskomst', r2.time, '17:30');
check('later thuis: de genoemde tijd is de eindtijd', r2.endTime, '20:00');
check('later thuis: soort weg', r2.category, 'weg');
check('later thuis: titel', r2.title, 'Later thuis');
check('later thuis: wie', r2.person, 'irene');

const r3 = quickParse('Irene later thuis tot 21:00', vrijdag, { homeTime: '18:00' });
check('later thuis tot: de thuiskomst uit de instelling', r3.time, '18:00');
check('later thuis tot: eindtijd', r3.endTime, '21:00');

const r4 = quickParse('Niels niet thuis morgen', vrijdag);
check('niet thuis zonder tijd: hele dag', r4.allDay, true);
check('niet thuis zonder tijd: geen eindtijd', r4.endTime, undefined);

const r5 = quickParse('Oppas zaterdag van 19 tot 23 uur', vrijdag);
check('van … tot …: begin', r5.time, '19:00');
check('van … tot …: eind', r5.endTime, '23:00');
check('van … tot … blijft oppas', r5.category, 'oppas');

const r6 = quickParse('Zwemles dinsdag 16:00 tot 17:00', vrijdag);
check('18:00 tot 19:00 zonder streepje', [r6.time, r6.endTime], ['16:00', '17:00']);

const r7 = quickParse('Tandarts 3-11 om 14:30', vrijdag);
check('een datum als 3-11 is geen tijdvak', r7.endTime, undefined);

const r8 = quickParse('Niels borrel tot 22:00', vrijdag);
check('alleen "tot" zonder begintijd: wel een eindtijd', r8.endTime, '22:00');

const r9 = quickParse('Irene niet thuis 19:00-21:00 8-10', vrijdag);
check('tijdvak vóór een datum: de datum blijft 8-10', r9.date, '2026-10-08');
check('tijdvak vóór een datum: tijden kloppen', [r9.time, r9.endTime], ['19:00', '21:00']);
check('tijdvak vóór een datum: titel is gewoon Niet thuis', r9.title, 'Niet thuis');

const r10 = quickParse('Niels niet thuis 8-10 19:30-11:00', vrijdag);
check('een tijdvak dat op een datum lijkt (30-11) is geen datum', r10.date, '2026-10-08');

check('sport herkend aan het woord', quickParse('Matthijs voetbal zaterdag 10:00', vrijdag).category, 'sport');
check('zwemles is sport', quickParse('Amélie zwemles dinsdag 16:00', vrijdag).category, 'sport');
check('gymtas blijft school', quickParse('Matthijs vrijdag gymtas mee', vrijdag).category, 'school');

report('snelinvoer');
