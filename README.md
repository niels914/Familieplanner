# Familieplanner

Een gezinsagenda voor het gezin Ahsmann: één kalender met alles wat er mee moet naar
school en de peuterspeelzaal, de contactgegevens van klasgenootjes en hun ouders,
een oppasoverzicht met uren en vergoeding, een breng- en haalschema, boodschappen en
het weekmenu. De schoolagenda van Matthijs komt automatisch uit Parro binnen, en elke
avond krijg je één melding met alles van morgen.

De app draait als PWA: open hem op je telefoon, zet hem op je beginscherm en hij
gedraagt zich als een gewone app.

---

## Wat zit erin

| Onderdeel | Wat het doet |
|---|---|
| **Vandaag** | Wat er vandaag speelt, plus een aanvinklijst met wat je vanavond voor morgen moet klaarzetten. |
| **Agenda** | Maandoverzicht, filterbaar per persoon. Elk item kan een meeneem-lijstje hebben. |
| **Snel toevoegen** | Typ *"Matthijs volgende week donderdag lege schoenendoos mee"* en de app maakt er het juiste item op de juiste dag van. |
| **Oppas** | Alle oppasmomenten filterbaar op periode en oppas, met uren, uurtarief, maandtotaal en wat er nog openstaat. |
| **Contacten** | Klasgenootjes met de naam en het telefoonnummer van vader en moeder, tikbaar om direct te bellen. Ook oppassen en overige contacten. |
| **Breng & haal** | Vast weekschema per kind, met afwijkingen per dag voor de komende twee weken. |
| **Eten** | Gedeelde boodschappenlijst en weekmenu; ingrediënten gaan met één knop naar de boodschappenlijst. |
| **Paklijst** | Een masterlijst met alles wat mee kan op vakantie. Per reis (kamperen, huisje of logeren) maakt de app daaruit een paklijst, met aantallen die meeschalen met het aantal nachten. Afvinken kan per persoon (*Verzamelen*) of per krat en plek in de auto (*Inladen*), met z'n tweeën tegelijk. |
| **Parro** | De schoolagenda wordt elke drie uur opgehaald. Jouw notities en meeneem-lijstjes bij een Parro-item blijven bij een synchronisatie staan. |
| **Herinnering** | Elke avond om 19:00 (instelbaar) één pushmelding met alles van morgen. Vertrekt er morgen een reis die nog niet helemaal is ingepakt, dan staat daar ook bij wat er nog mist; tikken op de melding opent die paklijst. |

---

## Installeren

### 1. Repository koppelen aan Netlify

Nieuwe site → *Import an existing project* → deze repository. Netlify leest
`netlify.toml` en hoeft verder niets ingesteld te krijgen:

- build: `npm run build`
- publish: `dist`
- functions: `netlify/functions`

### 2. Omgevingsvariabelen instellen

Netlify → *Site configuration* → *Environment variables*. Zie ook `.env.example`.

| Variabele | Waarvoor |
|---|---|
| `FAMILY_PASSWORD` | Het gedeelde wachtwoord waarmee jullie inloggen. |
| `SESSION_SECRET` | Lange willekeurige tekst waarmee de sessiecookie ondertekend wordt. |
| `PARRO_ICS_URL` | De iCal-link uit Parro. |
| `VAPID_PUBLIC_KEY` | Voor pushmeldingen. |
| `VAPID_PRIVATE_KEY` | Voor pushmeldingen. |
| `VAPID_SUBJECT` | `mailto:` plus je e-mailadres. |

`SESSION_SECRET` maak je zo:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

De push-sleutels maak je zo:

```bash
npm run vapid
```

> **De Parro-link is een wachtwoord.** Wie hem heeft, kan de volledige schoolagenda
> lezen. Zet hem daarom alleen in de omgevingsvariabelen — nooit in de code, nooit in
> een commit. Kun je hem niet meer terugvinden of is hij uitgelekt? Vraag in Parro een
> nieuwe link aan; de oude vervalt dan.

### 3. Op je telefoon zetten

- **iPhone**: open de site in Safari → deelknop → *Zet op beginscherm*. Meldingen
  werken op iOS **alleen** vanaf het beginscherm, niet in de browser zelf.
- **Android**: Chrome biedt *App installeren* aan in het menu.

Daarna in de app: *Meer → Instellingen → Meldingen aanzetten*. Doe dat op elk toestel
apart; de melding gaat naar alle toestellen die je hebt aangemeld.

---

## Lokaal ontwikkelen

```bash
npm install
npm run dev        # via netlify dev, inclusief de functions
```

Zonder Netlify CLI werkt alleen de voorkant:

```bash
npm run dev:vite
```

Andere handige commando's:

```bash
npm test           # tests voor de iCalendar-parser, de snelinvoer en de paklijst
npm run build      # typecheck + productiebuild
npm run icons      # genereert de PWA-iconen opnieuw
npm run vapid      # maakt nieuwe push-sleutels
```

Wil je de app bekijken zonder Netlify (met voorbeelddata in het geheugen):

```bash
npm run build && node tests/mock-server.mjs   # http://localhost:4173
```

---

## Hoe het in elkaar zit

```
index.html            de PWA-schil
src/                  React-app (Vite, TypeScript)
  views/              de schermen
  components/         formulieren en herbruikbare onderdelen
  lib/                api-client, state, snelinvoer-parser
shared/               types en datumhulp, gedeeld met de backend
netlify/functions/    api.ts (alle endpoints), sync-parro.ts, send-reminders.ts
netlify/lib/          opslag, sessie, iCalendar-parser, pushmeldingen
public/               service worker, manifest, iconen
tests/                tests voor de parsers, plus een nepserver om de app te bekijken
```

**Opslag.** De data staat in [Netlify Blobs](https://docs.netlify.com/blobs/overview/):
geen extra dienst, geen extra account. Elke collectie is één JSON-document. Netlify
Blobs kent geen voorwaardelijk schrijven, dus wijzigingen worden als *operatie*
toegepast: na het schrijven leest de server terug, en als iemand anders er tussendoor
kwam, wordt de bewerking opnieuw op hun versie toegepast. Zo verdwijnt er niets als
jij en Irene tegelijk iets aanpassen.

Wil je later naar een echte database (bijvoorbeeld Supabase in de EU, wat voor de
telefoonnummers van andere gezinnen netter is): dan hoeft alleen `netlify/lib/store.ts`
vervangen te worden. De rest van de code kent alleen `read`, `update` en `overwrite`.

**Inloggen.** Eén gedeeld wachtwoord, vergeleken via een HMAC zodat de vergelijking
niets over de lengte verraadt. De sessie is een cookie die met `SESSION_SECRET`
ondertekend is en 90 dagen meegaat: HttpOnly, Secure, SameSite=Lax.

**Parro.** `netlify/lib/ics.ts` is een eigen, tolerante iCalendar-parser: regelvouwing,
`VALUE=DATE`, `TZID`, UTC-tijden, `RRULE` (FREQ, INTERVAL, COUNT, UNTIL, BYDAY) en
`EXDATE`. Datums worden vastgelegd als `YYYY-MM-DD` in Nederlandse tijd, zodat een
schooldag nooit door een tijdzone een dag opschuift. Items die uit de feed verdwijnen
worden opgeruimd — tenzij je er zelf een meeneem-lijstje aan hebt gehangen.

**Herinneringen.** `send-reminders.ts` draait elk uur en verstuurt alleen op het
ingestelde uur in `Europe/Amsterdam`. Daardoor hoeft er bij de overgang naar zomer- of
wintertijd niets aangepast te worden. Een dag wordt hoogstens één keer verstuurd.

---

## Privacy

In deze app staan gegevens van andere mensen: namen en telefoonnummers van ouders van
klasgenootjes, en van oppassen. Een paar dingen om in gedachten te houden:

- De data staat bij Netlify. Netlify Blobs geeft geen keuze in de regio waar het
  fysiek staat; wil je dat wel, stap dan over op een database in de EU (zie hierboven).
- De app is alleen bereikbaar met het gezinswachtwoord. Kies een goed wachtwoord en
  deel het niet buiten het gezin.
- Verwijder contacten van klasgenootjes als de klas verandert en je ze niet meer nodig
  hebt. Bewaren wat je niet gebruikt is de makkelijkste manier om iets te laten
  uitlekken.
