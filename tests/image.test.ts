/** Controleert het verkleinen van foto's: de afmetingen, zonder een echte afbeelding nodig te hebben. */
import { PHOTO_MAX, THUMB_MAX, fitWithin, receiptFileUrl } from '../src/lib/image';
import { check, report } from './helpers';

check('een kleine foto blijft zoals hij is', fitWithin(800, 600, PHOTO_MAX), { width: 800, height: 600 });
check('een foto van een telefoon wordt verkleind, liggend', fitWithin(4032, 3024, PHOTO_MAX), { width: 1800, height: 1350 });
check('en staand', fitWithin(3024, 4032, PHOTO_MAX), { width: 1350, height: 1800 });
check('precies op de grens blijft zoals hij is', fitWithin(1800, 1000, PHOTO_MAX), { width: 1800, height: 1000 });
check('een heel lange bon houdt zijn verhouding', fitWithin(1000, 6000, PHOTO_MAX), { width: 300, height: 1800 });
check('een smalle strook wordt nooit nul pixels', fitWithin(2, 9000, PHOTO_MAX).width, 1);
check('de miniatuur is kleiner', fitWithin(4032, 3024, THUMB_MAX), { width: 320, height: 240 });

check('adres van een foto', receiptFileUrl('r1', 'f1', 'image'), '/api/receipts/r1/files/f1.jpg');
check('adres van een miniatuur', receiptFileUrl('r1', 'f1', 'image', true), '/api/receipts/r1/files/f1.t.jpg');
check('adres van een pdf', receiptFileUrl('r1', 'f2', 'pdf'), '/api/receipts/r1/files/f2.pdf');

report('foto’s');
