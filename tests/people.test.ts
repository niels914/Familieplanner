/** Meerdere personen bij één item: kiezen, tonen en de signalering. */
import type { CalendarEvent } from '../shared/types';
import { cleanOthers, involves, peopleNames, peopleOf, togglePerson } from '../shared/people';
import { signalsOn } from '../shared/signals';
import { check, report } from './helpers';

const ev = (extra: Partial<CalendarEvent>): CalendarEvent => ({
  id: 'e', source: 'local', title: 'Uitje', date: '2026-12-12', allDay: false, time: '14:00', endTime: '17:00',
  person: 'niels', category: 'anders', bring: [], reminder: true, createdAt: '', updatedAt: '', ...extra,
});

check('betrokkenen, de eerste eerst', peopleOf(ev({ person: 'niels', others: ['irene'] })), ['niels', 'irene']);
check('zonder anderen alleen de eerste', peopleOf(ev({})), ['niels']);
check('iemand die erbij hoort', [involves(ev({ others: ['irene'] }), 'irene'), involves(ev({ others: ['irene'] }), 'lotte')], [true, false]);
check('namen in gewone taal', [peopleNames(ev({ others: ['irene'] })), peopleNames(ev({ person: 'matthijs', others: ['amelie', 'lotte'] })), peopleNames(ev({ person: 'gezin' }))], ['Niels en Irene', 'Matthijs, Amélie en Lotte', 'Gezin']);

check('opschonen', cleanOthers('niels', ['irene', 'niels', 'irene', 'gezin']), ['irene']);
check('niets over: undefined', [cleanOthers('niels', []), cleanOthers('niels', null), cleanOthers('gezin', ['irene'])], [undefined, undefined, undefined]);

// aantikken
check('Irene erbij', togglePerson({ person: 'niels' }, 'irene'), { person: 'niels', others: ['irene'] });
check('Irene weer weg', togglePerson({ person: 'niels', others: ['irene'] }, 'irene'), { person: 'niels', others: [] });
check('de eerste weghalen: de volgende schuift op', togglePerson({ person: 'niels', others: ['irene', 'lotte'] }, 'niels'), { person: 'irene', others: ['lotte'] });
check('de laatste kun je niet uitzetten', togglePerson({ person: 'niels' }, 'niels'), { person: 'niels', others: [] });
check('"gezin" vervangt de rest', togglePerson({ person: 'niels', others: ['irene'] }, 'gezin'), { person: 'gezin', others: [] });
check('vanaf "gezin" kies je één persoon', togglePerson({ person: 'gezin' }, 'lotte'), { person: 'lotte', others: [] });

// signalering: een uitje van Niels én Irene, zonder oppas, is "allebei weg"
const samen = ev({ category: 'weg', person: 'niels', others: ['irene'], time: '19:00', endTime: '23:00' });
check('één item voor beide ouders is allebei weg', signalsOn([samen], '2026-12-12').length, 1);
check('met een oppas erbij is het gedekt', signalsOn([samen, ev({ id: 'o', category: 'oppas', person: 'gezin', time: '18:30', endTime: '23:30' })], '2026-12-12')[0].coverage, 'full');
check('alleen Niels weg: geen signaal', signalsOn([ev({ category: 'weg', time: '19:00', endTime: '23:00' })], '2026-12-12').length, 0);
check('Niels en Lotte: Irene is thuis, geen signaal', signalsOn([ev({ category: 'weg', others: ['lotte'], time: '19:00', endTime: '23:00' })], '2026-12-12').length, 0);

report('personen');
