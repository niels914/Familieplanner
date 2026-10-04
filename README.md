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
| **Vandaag** | Volgt de tijd: 's ochtends wat er vandaag mee moet, 's middags wat er nog komt, 's avonds morgen met wat er klaar moet staan. Daaronder één regel als er iets te regelen valt. |
| **Agenda** | Maandoverzicht met de items van de gekozen dag eronder, filterbaar per persoon, met weeknummers (ISO, zoals in Nederland). Op de telefoon rustig, zoals de iOS-agenda: dagcijfers met stipjes; vegen bladert een maand. Elk item kan een meeneem-lijstje en een eindtijd hebben. |
| **Nieuw** (middenknop) | Eén blad met de keuze *Agenda-item* of *Taak*. Typ *"Matthijs vrijdag gymtas mee"* of *"Niels niet thuis 18:00-22:00"* en de app maakt er het juiste item van. |
| **Regelen** | Openstaande taken om te regelen of af te stemmen, gegroepeerd op urgentie. Daarnaast Boodschappen (invoer onderaan, met een snelkeuze van wat jullie vaak kopen) en Weekmenu. Zie ook *Signaleren* hieronder. |
| **Signaleren** | Zetten Niels en Irene in de agenda wanneer ze *niet thuis* of *later thuis* zijn, dan ziet de app zelf wanneer jullie allebei weg zijn zonder oppas. Dat komt bij Regelen, met keuzes: iemand blijft thuis, een oppas regelen (wordt een taak) of geen probleem. |
| **Vegen** | Op taken en boodschappen: naar rechts afronden, naar links weghalen, beide met ongedaan maken. |
| **Ongedaan maken** | Verwijderen gaat meteen; in de melding staat 8 seconden *Ongedaan maken*. Dat zet het precies terug, ook een hele reeks. |
| **Reeksen** | Zwemles elke dinsdag, of om de week, tot een einddatum. Elke keer is een eigen item: vink in het reeksoverzicht de lessen aan waarin met kleren gezwommen wordt en zet er in één keer "kleren om in te zwemmen" bij. Wijzigen of verwijderen kan voor één keer of voor deze en alle volgende. |
| **Mensen** | Contacten (klasgenootjes met adres en de telefoonnummers van de ouders, tikbaar om te bellen of te appen via WhatsApp) en Oppas (alle momenten met uren, tarief en wat er nog openstaat). |
| **Klaarzetten** | Wat er mee moet staat per persoon bij elkaar, met een dier en naam erboven. Zodra er iets is afgevinkt zie je "1 van 4 klaar"; is alles klaar, dan volgt een rustig vinkje. |
| **Avatars** | Elk gezinslid heeft een dier: Matthijs een olifant, Amélie een aap, Lotte een lieveheersbeestje, Irene een schildpad en Niels een uil. Ze staan bij items, taken, in het filter en bij het kiezen van een persoon (`src/components/Avatar.tsx`). |
| **Gezin** (knop rechtsboven) | Breng & haal (vast weekschema met afwijkingen) en Instellingen. |
| **Gmail-agenda** | De agenda van Niels komt elk uur binnen, alleen lezen, met volledige titels (ook privé) en op zijn naam. Het zijn gewone items: meeneem-lijstje, notitie en soort (bijvoorbeeld *Niet thuis*) blijven van jullie en blijven bij een synchronisatie staan. |
| **Parro** | De schoolagenda wordt elke drie uur opgehaald. Jouw notities en meeneem-lijstjes bij een Parro-item blijven bij een synchronisatie staan. |
| **Snel en offline** | De laatste stand staat op het toestel en verschijnt meteen bij openen. Wijzigingen staan er direct, nog voor de server antwoordt; mislukt het, dan draait de app het terug en zegt waarom. Zonder verbinding kun je lezen. Schrijven niet. |
| **Herinnering** | Elke avond om 19:00 (instelbaar) één pushmelding met alles van morgen, inclusief wat er mee moet en je eigen notities. Aanzetten met één tik vanaf Vandaag; daarna komt er meteen een testbericht op alleen dat toestel. |

---

## Installeren

### 1. Repository koppelen aan Netlify

Nieuwe site → *Import an existing project* → deze repository. Netlify leest
`netlify.toml` en hoeft verder niets ingesteld te krijgen:

- build: `npm run build`
- publish: `dist`
- functions: `netlify/functions`

### 2. Opslag in Supabase (EU)

De gegevens staan in een Supabase-database. Een EU-regio kies je bij het aanmaken
van het project en kun je daarna niet meer wijzigen, dus let daar nu op.

1. Maak een account op [supabase.com](https://supabase.com) en kies *New project*.
2. Kies bij **Region** een regio in de EU. *Central EU (Frankfurt)* is het dichtstbij.
   Londen en Zürich liggen buiten de EU.
3. Bewaar het databasewachtwoord in je wachtwoordmanager. De app zelf heeft het niet nodig.
4. Open in het project de **SQL Editor**, plak de inhoud van
   [`supabase/schema.sql`](supabase/schema.sql) en klik *Run*. Dat maakt de tabel en de
   beveiliging aan. Opnieuw uitvoeren kan geen kwaad.
5. Haal twee waarden op bij *Project Settings → API* en zet ze bij stap 3 in Netlify:
   - **Project URL** wordt `SUPABASE_URL`
   - de **geheime sleutel** wordt `SUPABASE_SERVICE_ROLE_KEY`. Dat is de `service_role`
     (of in het nieuwe scherm de *secret key*), **niet** de publieke `anon`/*publishable* sleutel.

> **De geheime sleutel geeft volledige toegang tot de database.** Hij staat alleen in de
> omgevingsvariabelen van Netlify, nooit in de code. De tabel heeft Row Level Security
> zonder policies, dus de publieke sleutel kan er niets uit lezen.

### 3. Omgevingsvariabelen instellen

Netlify → *Site configuration* → *Environment variables*. Zie ook `.env.example`.

| Variabele | Waarvoor |
|---|---|
| `SUPABASE_URL` | De project-URL uit stap 2. |
| `SUPABASE_SERVICE_ROLE_KEY` | De geheime sleutel uit stap 2. |
| `FAMILY_PASSWORD` | Het gedeelde wachtwoord waarmee jullie inloggen. |
| `SESSION_SECRET` | Lange willekeurige tekst waarmee de sessiecookie ondertekend wordt. |
| `PARRO_ICS_URL` | De iCal-link uit Parro. |
| `NIELS_ICS_URL` | Het geheime iCal-adres van Google Agenda (Niels). Leeg = niet gekoppeld. |
| `IRENE_ICS_URL` | Idem voor Irene, als zij haar agenda wil koppelen. |
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

> **Dat geldt ook voor het geheime adres van Google Agenda.** Je vindt het onder
> *Instellingen voor mijn agenda* → *Agenda integreren* → *Geheim adres in iCal-indeling*.
> Is het uitgelekt, kies dan op dezelfde plek *Geheime link opnieuw instellen*; de oude
> vervalt, en je zet de nieuwe in Netlify.

### 4. Op je telefoon zetten

- **iPhone**: open de site in Safari → deelknop → *Zet op beginscherm*. Meldingen
  werken op iOS **alleen** vanaf het beginscherm, niet in de browser zelf.
- **Android**: Chrome biedt *App installeren* aan in het menu.

Daarna in de app: *huisje rechtsboven → Instellingen → Meldingen aanzetten*. Doe dat op elk toestel
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
npm test           # parsers, reeksen, herinnering, opslag, het databaseschema en kleurcontrast
npm run build      # typecheck + productiebuild
npm run test:e2e   # browsertest op telefoonformaat (eerst bouwen; zie hieronder)
npm run icons      # genereert de PWA-iconen opnieuw
npm run vapid      # maakt nieuwe push-sleutels
```

Wil je de app bekijken zonder Netlify:

```bash
npm run build && node tests/mock-server.mjs   # http://localhost:4173, wachtwoord: test
```

Die server draait de échte API-code uit `netlify/functions/api.ts`, met alleen de
opslag vervangen door geheugen (`tests/memory-store.ts`) en voorbeelddata uit
`tests/fixtures.mjs`. Wat daar werkt, werkt dus ook op Netlify — op de opslag na.

**De browsertest** (`tests/e2e.mjs`) opent de app op een telefoonformaat en controleert wat de
gewone tests niet kunnen: dat geen scherm breder wordt dan de telefoon (320, 360 en 390 px,
ook met een lange uitnodiging als beschrijving), verwijderen met ongedaan maken, vegen, de
snelkeuze bij boodschappen, de tijdkeuze per vijf minuten en *Meer opties*. Hij start zelf een
testserver op poort 4180. Je hebt Playwright nodig (`npm i -g playwright`); een mislukte
controle zegt in gewone taal wat er niet klopt. Draai hem na elke wijziging aan het uiterlijk.

---

## Hoe het in elkaar zit

```
index.html            de PWA-schil
src/                  React-app (Vite, TypeScript)
  views/              de schermen
  components/         formulieren en herbruikbare onderdelen
  lib/                api-client, state, snelinvoer-parser
shared/               types, datumhulp, signalering en de opslagregels (rules.ts), gedeeld met de backend
netlify/functions/    api.ts (alle endpoints), sync-parro.ts, send-reminders.ts
netlify/lib/          opslag, sessie, iCalendar-parser, pushmeldingen
public/               service worker, manifest, iconen
supabase/             schema.sql: de tabel en de beveiliging
tests/                tests, plus een testserver om de app te bekijken
```

**Opslag.** De data staat in Supabase (Postgres). Elke soort gegevens is één rij in de
tabel `kv` met een jsonb-document; voor de gegevens van één gezin is dat ruim genoeg
en het houdt de app eenvoudig. Een versienummer voorkomt dat jij en Irene elkaars
wijziging overschrijven: slaan jullie tegelijk iets op, dan krijgt de tweede een
conflict en wordt zijn wijziging opnieuw toegepast op de verse gegevens. Dat
controleren en schrijven gebeurt in één databaseopdracht (`kv_write` in
`supabase/schema.sql`), dus er kan niets tussendoor komen.

De code is in drie lagen verdeeld: `netlify/lib/kv.ts` (logica, kent Supabase niet),
`netlify/lib/supabase-backend.ts` (de aanroepen) en `netlify/lib/store.ts` (koppelt
ze). De rest van de app kent alleen `read`, `update`, `overwrite` en `readAll`.

**Eén set regels voor opslaan.** Hoe een agenda-item of taak wordt bewaard (wat blijft staan,
wanneer een taak als afgerond telt) staat in `shared/rules.ts`. De server gebruikt het om
op te slaan en de app om het resultaat alvast te tonen terwijl het verzoek onderweg is, dus
wat je ziet kan niet afwijken van wat daarna bewaard wordt. Wijzig je zo'n regel, dan doe je
het op één plek, en `tests/rules.test.ts` laat zien of het nog klopt.

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

- **Waar de data staat.** In Supabase, in de EU-regio die je bij het aanmaken van het
  project hebt gekozen. Dat geldt voor de opslag.
- **Waar de data langskomt.** De Netlify-functies die de data lezen en schrijven
  draaien standaard in de VS (Ohio). De gegevens staan dus in de EU, maar gaan bij
  gebruik wel even door een server in de VS. De regio van de functies aanpassen kan
  alleen op een betaald Netlify-plan (*Cloud compute → Functions → Region*). Voor een
  gezinsagenda is dit meestal acceptabel, maar je moet het weten.
- **Back-ups.** Het gratis Supabase-plan maakt geen back-ups. Een betaald plan (Pro)
  maakt dagelijks een back-up en bewaart die 7 dagen.
- **Pauzeren.** Supabase pauzeert gratis projecten die een week nauwelijks worden
  gebruikt. Door de geplande synchronisatie en herinnering is er elk uur activiteit,
  maar dat is niet gegarandeerd. Je kunt een gepauzeerd project binnen een jaar
  herstellen in het Supabase-dashboard.
- De app is alleen bereikbaar met het gezinswachtwoord. Kies een goed wachtwoord en
  deel het niet buiten het gezin.
- Verwijder contacten van klasgenootjes als de klas verandert en je ze niet meer nodig
  hebt. Bewaren wat je niet gebruikt is de makkelijkste manier om iets te laten
  uitlekken.
