/** Controleert het groeperen en de voortgang bij klaarzetten, en de begroeting. */
import type { CalendarEvent, PersonId } from '../shared/types';
import { GREETING, dayPart } from '../src/lib/dayPart';
import { doneBring, groupByPerson, openBring, progressLabel, progressShare } from '../src/lib/prep';
import { check, report } from './helpers';

const event = (title: string, person: PersonId, bring: Array<[string, boolean]>): CalendarEvent => ({
  id: title,
  source: 'local',
  title,
  date: '2026-10-07',
  allDay: true,
  person,
  category: 'school',
  bring: bring.map(([text, done], i) => ({ id: `${title}-${i}`, text, done })),
  reminder: true,
  createdAt: '',
  updatedAt: '',
});

const events = [
  event('Zwemles', 'amelie', [['Handdoek', false], ['Badpak', true]]),
  event('Gym', 'matthijs', [['Gymtas', false]]),
  event('Vergadering', 'niels', [['Laptop', false]]),
  event('Boodschappen halen', 'gezin', [['Tassen', false]]),
  event('Schoolreisje', 'matthijs', [['Lunch', true], ['Regenjas', false]]),
  event('Peuterspeelzaal', 'lotte', []),
];

const open = openBring(events);
check('open: alleen wat nog niet af is', open.map((i) => i.item.text), ['Handdoek', 'Gymtas', 'Laptop', 'Tassen', 'Regenjas']);
check('afgevinkt geteld', doneBring(events), 2);

const groepen = groupByPerson(open);
check('kinderen eerst, dan ouders, dan gezin', groepen.map((g) => g.person), ['matthijs', 'amelie', 'niels', 'gezin']);
check('binnen een kind: volgorde van de dag blijft', groepen[0].items.map((i) => i.item.text), ['Gymtas', 'Regenjas']);
check('een persoon zonder spullen krijgt geen groep', groepen.some((g) => g.person === 'lotte'), false);
check('leeg blijft leeg', groupByPerson([]), []);

check('voortgang: 2 van 7', progressLabel(2, 5), '2 van 7 klaar');
check('voortgang: nog niets afgevinkt', progressLabel(0, 4), '4 te doen');
check('voortgang: alles klaar', progressLabel(4, 0), 'Alles klaar');
check('voortgang: niets om te doen', progressLabel(0, 0), '');
check('aandeel', progressShare(3, 1), 0.75);
check('aandeel zonder spullen', progressShare(0, 0), 0);

check('ochtend', GREETING[dayPart(8)], 'Goedemorgen');
check('middag', GREETING[dayPart(13)], 'Goedemiddag');
check('avond', GREETING[dayPart(20)], 'Goedenavond');
check('12 uur is middag', GREETING[dayPart(12)], 'Goedemiddag');
check('18 uur is avond', GREETING[dayPart(18)], 'Goedenavond');

report('klaarzetten');
