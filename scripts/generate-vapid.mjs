/** Genereert de VAPID-sleutels voor pushmeldingen. Draai `npm run vapid` en
 *  zet de twee waarden als omgevingsvariabelen in Netlify. */
import webpush from 'web-push';

const keys = webpush.generateVAPIDKeys();
console.log('\nZet deze in Netlify → Site configuration → Environment variables:\n');
console.log('VAPID_PUBLIC_KEY  =', keys.publicKey);
console.log('VAPID_PRIVATE_KEY =', keys.privateKey);
console.log('VAPID_SUBJECT     = mailto:jouw@email.nl\n');
console.log('Bewaar de private key als een wachtwoord: deel hem met niemand.\n');
