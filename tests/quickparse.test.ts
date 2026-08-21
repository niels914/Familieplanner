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

const g = quickParse('Zwemles vrijdag', vrijdag);
check('de dag van vandaag noemen betekent vandaag', g.date, vrijdag);

report('snelinvoer');
