/** Controleert het omzetten van telefoonnummers voor WhatsApp. */
import { whatsappLink, whatsappNumber } from '../shared/phone';
import { check, report } from './helpers';

check('Nederlands mobiel zonder spatie', whatsappNumber('0612065600'), '31612065600');
check('met spatie', whatsappNumber('06 12065600'), '31612065600');
check('met streepje', whatsappNumber('06-12065600'), '31612065600');
check('met punten en spaties', whatsappNumber('06 12 06 56 00'), '31612065600');
check('met +31', whatsappNumber('+31 6 12065600'), '31612065600');
check('met +31 (0)6', whatsappNumber('+31 (0)6 12065600'), '31612065600');
check('met 0031', whatsappNumber('0031612065600'), '31612065600');
check('Belgisch nummer met landcode', whatsappNumber('+32 470 12 34 56'), '32470123456');
check('Duits nummer met 0049', whatsappNumber('0049 151 23456789'), '4915123456789');
check('vast nummer (0481) heeft geen WhatsApp', whatsappNumber('0481 371234'), null);
check('vast nummer met +31 ook niet', whatsappNumber('+31 10 1234567'), null);
check('zonder 0 of landcode: niet raden', whatsappNumber('612065600'), null);
check('te kort', whatsappNumber('06 123'), null);
check('leeg', whatsappNumber(''), null);
check('niets', whatsappNumber(undefined), null);
check('geen cijfers', whatsappNumber('onbekend'), null);
check('de link', whatsappLink('06 12065600'), 'https://wa.me/31612065600');
check('geen link bij een vast nummer', whatsappLink('0481 371234'), null);

report('whatsapp');
