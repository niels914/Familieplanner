# Ontwerpplan 2: van netjes naar goed

## 0. Waarom een tweede plan

Het eerste plan (`ontwerp.md`) ging over de laag eroverheen: iconen, lettertypes,
kleur, lege schermen, toegankelijkheid. Dat is af en staat. Dit plan gaat over wat
eronder zit: hoe snel het aanvoelt, hoe de app is opgebouwd, en of hij als *jullie*
gezinsapp aanvoelt in plaats van als een nette agenda.

**Beperking van deze diagnose.** Ik heb de app bekeken met testgegevens en gemeten met
gesimuleerde vertraging. Ik heb jullie niet zien gebruiken. Wat jullie dagelijks
irriteert, weegt zwaarder dan wat ik hieronder vind; zie sectie 7.

---

## 1. Diagnose

### Snelheid

Gemeten met een gesimuleerde vertraging per verzoek. De echte route is telefoon →
Netlify (Ohio) → Supabase (EU) en terug, dus een paar honderd milliseconden is realistisch.

- **Afvinken wacht op de server.** Bij 300 ms vertraging verandert het scherm pas na
  341 ms. De app past niets aan voordat de server heeft geantwoord. Elke tik voelt zo
  traag als de verbinding.
- **Elke start begint leeg.** Er wordt niets bewaard op het toestel. Zonder vertraging
  staat de inhoud er na 0,2 s, bij 600 ms vertraging na 1,3 s, ook als je vijf minuten
  geleden nog keek.
- **Twee verzoeken na elkaar bij het opstarten:** eerst "ben ik ingelogd", dan pas de data.
- **Terugkomen in de app haalt alles opnieuw op.** Drie keer wisselen is drie volledige
  verzoeken, elk met zeven databasevragen.
- **Geen verbinding, geen gegevens.** Bij de schoolpoort met slecht bereik is de app leeg.

### Structuur

- **De tabbalk klopt niet met het gebruik.** *Oppas* en *Contacten* hebben een vaste
  plek, maar de boodschappenlijst, die je dagelijks en met handen vol tassen gebruikt,
  zit achter *Meer → Eten*. Het *Meer*-scherm is drie tegels op een leeg scherm.
- **De ronde plusknop betekent overal hetzelfde, en dat is niet wat hij lijkt.** Hij
  maakt altijd een agenda-item, ook op *Contacten* (waar de knop *+ Nieuw* in de kop een
  contact toevoegt) en bij de boodschappen. Twee plussen op één scherm, twee betekenissen.
- **Vandaag heeft één volgorde voor twee verschillende momenten.** 's Avonds wil je weten
  wat morgen klaar moet; om 07:45 wat vandaag mee moet. Nu staat *Klaarzetten voor
  morgen* altijd bovenaan, ook 's ochtends, wanneer het precies verkeerd om is.

### Eigenheid

- **De kinderen komen nauwelijks voor.** Een stipje, een initiaal, en in *Klaarzetten*
  de naam als oranje tekst. Een gezinsapp waarin je het gezin amper ziet.
- **Alles is tekst op beige.** Netjes en rustig, maar weinig dat zegt: dit is van ons.
- **Dubbele tekst.** "Lege schoenendoos" met daaronder "Matthijs · Lege schoenendoos mee".

### Interactie

- **Verwijderen gaat via de ingebouwde browserdialoog** (drie plekken) en er is nergens
  ongedaan maken.
- **Het formulier voor een nieuw item is ruim twee schermen hoog** op een iPhone.
- **Telefoonnummers breken af over twee regels** ("06 / 12345678") op de knop waarvoor
  *Contacten* bestaat.
- **Filters nemen de ruimte in.** *Oppas* heeft vier regels chips voordat de inhoud begint.
  In mijn testgegevens staat dezelfde oppas twee keer (voornaam en volledige naam). Dat
  komt door mijn testdata, maar het filter werkt op een getypte naam in plaats van op het
  contact, dus handmatig getypte namen geven in het echt hetzelfde.
- **Elk scherm begint met een uitlegzin** die na de eerste keer alleen ruimte kost.

### Desktop

- **Vandaag is één lange kolom.** Korte regels in een brede kolom met lege ruimte ernaast.

### Wat goed is en blijft

De hiërarchie van Vandaag, de weekstrip, het contrast en de aanraakvlakken, de lege staten
en alle tests. Hier wordt niets van teruggedraaid.

---

## 2. Ontwerpen rond vijf momenten

Een scherm per functie levert een nette app op. Een scherm per *moment* levert er een op
die je gebruikt.

| Moment | De vraag | Wat moet kunnen | Nu |
|---|---|---|---|
| **Avond** (21:30, op de bank) | Staat alles klaar voor morgen? | Alles in één blik, afvinken, klaar. | Goed, maar elk vinkje wacht op de server. |
| **Ochtend** (07:45, in de gang) | Wat moet vandaag mee, wie brengt en haalt? | Vandaag voorop, geen scrollen. | Staat onder het blok van morgen. |
| **Onderweg** | Dit moet ik niet vergeten. | Vastleggen met één hand, in een paar seconden. | Plusknop, venster, typen, opslaan. |
| **In de winkel** | Wat moest er ook alweer mee? | Eén tik naar de lijst, grote vakjes, toevoegen onderin. | Twee tikken en een tussenscherm. |
| **Zondag** | Hoe ziet de week eruit? | Per kind en per dag de bijzonderheden. | Kan alleen dag voor dag. |

Tussendoor: *bel de moeder van Fenna.* Daar moet het nummer in één tik bij te vinden zijn.

---

## 3. Het plan

### Fase 0: kiezen voordat we bouwen

Visuele concepten voor Vandaag in twee of drie richtingen, als schermafbeeldingen om uit
te kiezen. Dat is goedkoper dan bouwen en bijsturen. Daarnaast: Irene en Niels doen de vijf
momenten uit sectie 2 op hun eigen telefoon en noteren waar het schuurt. Geen
onderzoeksopzet, vijf minuten per persoon.

### Fase A: laat het direct voelen

De grootste winst voor de kleinste ingreep, en er is geen ontwerpbeslissing voor nodig.

- **Direct bijwerken.** Elke wijziging is meteen zichtbaar; de server volgt. Mislukt het,
  dan wordt het teruggedraaid met een duidelijke melding.
- **Laatste stand bewaren op het toestel** en die direct tonen bij openen, daarna op de
  achtergrond verversen. "Bijgewerkt 2 minuten geleden" waar het ertoe doet.
- **Eén verzoek bij het opstarten** in plaats van twee: geen aparte inlogcontrole.
- **Niet bij elke terugkeer alles ophalen.** Pas na een minuut, en alleen wat veranderd is.
- **Lezen zonder verbinding.** Schrijven zonder verbinding geeft een heldere melding. Een
  wachtrij die later verzendt is mogelijk, maar complex; apart besluit.
- **Meetscript in de repo**, zodat deze cijfers na elke wijziging opnieuw te meten zijn.

### Fase B: de structuur

Beslissingen nodig, zie sectie 7.

- **Vier tabs:** *Vandaag · Agenda · Boodschappen · Mensen*. *Mensen* bevat *Contacten* en
  *Oppas* als twee delen. *Meer* verdwijnt.
- **Een Gezin-pagina** via een knop rechtsboven: instellingen, meldingen, het
  breng-en-haalschema, Parro en de oppasinstructie. Dingen die je een paar keer per jaar doet.
- **Eén duidelijke primaire actie per scherm**, met de betekenis die je verwacht. De
  gedeelde plusknop gaat weg.
- **Snel vastleggen als invoerveld onderaan Vandaag en Agenda** in plaats van een venster:
  typ "Matthijs donderdag gymtas mee" en druk op enter. Eén handeling in plaats van drie.
- **Vandaag volgt het tijdstip.** 's Ochtends: vandaag voorop, met wat er mee moet en wie
  brengt en haalt. 's Avonds: morgen voorop. Overdag allebei, compact.

### Fase C: het gezin als hoofdpersoon

Hangt af van de keuze in fase 0.

- **Elk kind een eigen kleur en avatar** die overal terugkomt: weekstrip, tijdlijn,
  klaarzetten, contacten. Initialen als standaard; foto's alleen als jullie dat willen
  (zie sectie 7).
- **Klaarzetten per kind gegroepeerd**, met een kop en avatar per kind en daaronder wat er
  mee moet. Dat leest sneller dan een lijst met namen in oranje tekst.
- **Voortgang en een afgerond moment:** "3 van 4 klaar" en een kleine, rustige beloning
  als alles klaar staat.
- **Dubbele tekst weg**, uitlegzinnen weg, minder hoofdletter-labels, iets sterker
  contrast tussen de niveaus van de typografie.
- **Een begroeting naar tijdstip** en kortere, warmere teksten.

### Fase D: hoe het bedient

- **Ongedaan maken** in plaats van de browserdialoog. Een verwijderde reeks komt terug met
  één tik.
- **Vegen op lijsten** om af te vinken of te verwijderen.
- **Kortere formulieren:** titel, datum en wie zijn zichtbaar, de rest onder *meer opties*.
- **Contacten zoeken eerst.** Telefoonknop over de volle breedte, naam en nummer gescheiden,
  nummer nooit afgebroken. Eventueel een WhatsApp-knop naast bellen.
- **Boodschappen:** invoer onderaan, binnen bereik van je duim, met vaak gekochte dingen
  als snelkeuze.
- **Oppas:** filters naar één regel, en filteren op het contact in plaats van op een naam.
- **Rustige overgangen** tussen schermen en bij het in- en uitklappen van lijsten.

### Fase E: breder scherm

- Vandaag in twee kolommen op tablet en computer: de dag links, klaarzetten, feiten en
  boodschappen rechts.
- Sneltoetsen: `n` nieuw, `/` zoeken, pijltjes voor dagen, `t` voor vandaag.

### Fase F: de app laten meedenken

Het grootste inhoudelijke verschil, en daarom apart.

- **Parro-teksten omzetten in meeneem-suggesties.** Staat er in een Parro-bericht "neem
  gymschoenen mee", dan stelt de app dat voor als meeneem-item, met één tik om het over te
  nemen. Nooit automatisch: jullie beslissen.

---

## 4. Volgorde en omvang

| Fase | Omvang | Effect op het gevoel | Risico |
|---|---|---|---|
| 0 Kiezen | klein | bepaalt C | laag |
| A Snelheid | klein tot middel | **groot** | laag |
| B Structuur | middel | **groot**, ook voor je gewoontes | middel: je moet opnieuw leren waar dingen zitten |
| C Het gezin | middel | groot | middel: smaak, daarom fase 0 |
| D Bediening | middel tot groot | middel tot groot | laag |
| E Breed scherm | klein | klein voor jullie, als jullie vooral de telefoon gebruiken | laag |
| F Meedenken | middel | **groot** voor het kerndoel | middel: Parro-teksten zijn vrije tekst |

**Aanbevolen volgorde:** 0 en A tegelijk, dan B, dan C en D, dan F, dan E. A heeft geen
beslissing nodig en kan meteen. B verandert gewoontes, dus daar wil je eerst weten wat
Irene ervan vindt. C wacht op de keuze uit fase 0.

---

## 5. Hoe we weten dat het beter is

| Maat | Nu | Doel |
|---|---|---|
| Tik tot zichtbare reactie | gelijk aan de vertraging (341 ms bij 300 ms) | onder 100 ms, ook bij 600 ms vertraging |
| App openen, inhoud zichtbaar | 0,2 s zonder tot 1,3 s met vertraging, altijd vanaf leeg | onder 0,3 s uit bewaarde gegevens |
| Tikken naar de boodschappenlijst | 2, plus een tussenscherm | 1 |
| Handelingen om iets vast te leggen | 3 (plus, typen, opslaan) | 1 (typen en enter) |
| Telefoonnummer op één regel | nee | ja |
| Browserdialogen | 3 | 0 |
| Ongedaan maken bij verwijderen | nee | ja |

Plus de echte toets: Irene en Niels doen de vijf momenten opnieuw na elke grote fase.
Het kleurcontrast en de toegankelijkheidsmeting blijven meedraaien.

---

## 6. Wat we niet doen

- Geen andere technologie of framework. Het probleem zit niet in de bouwstenen.
- Geen aparte app voor de App Store.
- Geen instellingen voor thema's of indelingen. Eén goed ontwerp.
- Geen nieuwe functies die niet bij een van de vijf momenten horen.
- Geen foto's van de kinderen zonder dat jullie dat bewust kiezen.

---

## 7. Beslissingen

1. **Wat irriteert jullie nu het meest in het dagelijks gebruik?** Dat bepaalt of ik met
   snelheid (A) of met structuur (B) begin, en weegt zwaarder dan deze diagnose.
2. **De vier tabs** uit fase B. Boodschappen krijgt een eigen plek, *Meer* verdwijnt.
   Het alternatief is vijf tabs met *Meer* vervangen door *Boodschappen*, maar dan blijven
   Oppas en Contacten los staan.
3. **Foto's van de kinderen in de app, of alleen kleur en initialen?** Foto's van
   minderjarigen in een cloud-database is een bewuste afweging, ook in een EU-regio.
   Standaard is kleur en initiaal.
4. **Vandaag dat het tijdstip volgt.** Prettig, maar de volgorde verandert door de dag.
5. **De visuele richting**, te kiezen uit de concepten van fase 0.

---

## 8. Fase B uitgewerkt: prototype en bevindingen

Het aantikbare prototype staat in `docs/mockups/fase-b.html` (open het in een browser) met
beelden in dezelfde map. Het bouwt op de echte stijl en de echte invoerparser.

**Gekozen structuur:** vijf knoppen in de balk. Vier schermen (Vandaag, Agenda, Regelen,
Mensen) en in het midden een grotere Nieuw-knop. Oppas zit in Mensen (Contacten | Oppas).

**De Nieuw-knop splitst in twee.** Eén blad met bovenaan de keuze *Agenda-item* of *Taak*.
Vanuit Regelen staat Taak voorgekozen, overal anders Agenda-item. Wat je al typte blijft
staan als je wisselt.

**Regelen vervangt Boodschappen als scherm** en heeft drie segmenten: Taken, Boodschappen,
Weekmenu. Een taak is iets dat nog moet gebeuren of afgestemd moet worden: een titel, wie het
doet (Niels, Irene of afstemmen), een kind, een deadline en eventueel een koppeling aan een
agenda-item.

1. Gegroepeerd op urgentie (te laat, deze week, later, geen datum), met een filter op wie.
2. Afstemmen houdt het besluit vast.
3. Wat dringend is staat als één regel op Vandaag en de tab krijgt een teller.
4. Taken kunnen aan een agenda-item hangen.
5. Geen eigen account per persoon: het filter op Niels of Irene kies je zelf.

**Automatisch signaleren wanneer niemand thuis is.** Niels en Irene zetten in de agenda wanneer
ze *niet thuis* of *later thuis* zijn. De app legt dat naast elkaar:

- *Weg* is een agenda-item van Niels of Irene van soort Niet thuis (met eindtijd), of Later
  thuis: dan geldt de normale thuiskomst (instelling, nu 17:30) tot het opgegeven tijdstip.
- Een **signaal** ontstaat als ze minstens een half uur tegelijk weg zijn en geen oppas-item in
  de agenda dat tijdvak dekt. Dekt de oppas een deel, dan staat erbij welk stuk open is.
- Al bij het invoeren staat er een waarschuwing, en na opslaan staat het signaal bij Regelen,
  als banner op de dag in de Agenda en op Vandaag.
- Uitwegen: Niels blijft thuis, Irene blijft thuis, Niels of Irene regelt een oppas (maakt een
  taak met deadline), of geen probleem. Komt er later een oppas in de agenda die het dekt, dan
  sluiten de taak en het signaal vanzelf.
- Het is een waarschuwing en geen verbod, en het is zo goed als wat ze invullen. Het koppelen van
  de Gmail-agenda's (docs/todo.md) kan dit later aanvullen, alleen als voorstel.

**Wat dit vraagt van het model en de invoer (nog niet gebouwd):**

- Agenda-items krijgen een **eindtijd**, en een nieuwe soort *Niet thuis*.
- De parser leert "later thuis", "niet thuis" en een tijdvak als "18:00-22:00" of "tot 22:00".
  Zonder eindtijd schat de app 3 uur (weg) of 4 uur (oppas) en zegt dat erbij.
- Taken zijn een nieuwe verzameling (titel, wie, kind, deadline, notitie, besluit, koppeling).
- Signalen worden berekend en niet opgeslagen; alleen de keuze erbij (blijft thuis, geen
  probleem, taak) wordt bewaard.

Overige bevindingen: Boodschappen en Weekmenu zijn segmenten van Regelen (2 tikken, net als nu);
Oppas wordt één tik dieper; de tijdstanden van Vandaag (tot 12:00 ochtend, tot 18:00 middag,
daarna avond) zijn een voorstel; de middenknop dekt geen inhoud meer af maar is niet sneller in
tikken (2, net als nu).

Aantal tikken, nu → straks: weten of jullie allebei weg zijn: zelf bedenken → 0, taak vastleggen
kan nu niet → 2, boodschap toevoegen 2 → 2, instellingen 2 → 1, iets in de agenda zetten 2 → 2,
Oppas 1 → 2, contact zoeken en breng & haal gelijk.

## 9. Gebouwd: fase A en B

Fase A en B zitten nu in de echte app.

**Fase A, snelheid.** Gemeten met `scripts/measure.mjs`, bij 300 ms vertraging per verzoek (een
matige 4G-verbinding), mediaan van 5 metingen, in Chromium op telefoonbreedte:

| | voor | na |
|---|---|---|
| eerste keer openen (niets op het toestel) | 938 ms | 515 ms |
| opnieuw openen (laatste stand op het toestel) | 893 ms | 190 ms |
| afvinken: tikken tot het vinkje er staat | 350 ms | 77 ms |

Wat er veranderd is:

- Eén verzoek bij het opstarten (de gegevens), in plaats van eerst "ben ik ingelogd?" en dan de
  gegevens. Een verlopen sessie geeft een 401 en dus het inlogscherm.
- De laatste stand staat op het toestel (`localStorage`) en verschijnt meteen. Bij uitloggen en bij
  een verlopen sessie wordt die weggegooid.
- Wijzigingen staan er direct (agenda-items, taken, boodschappen, contacten, menu, instellingen,
  breng en haal). Mislukt het opslaan, dan zet de app de oude stand terug en meldt het. Reeksen
  aanmaken en reeksen wijzigen wachten nog op de server, want die rekenen de data daar uit.
- Terugkomen in de app ververst pas na een minuut, en dan met een ETag: is er niets veranderd dan
  antwoordt de server met een lege 304. De server leest de gegevens wel nog steeds uit de
  database om dat te kunnen vaststellen; de winst zit in het verkeer naar de telefoon.
- Zonder verbinding kun je lezen, met een balk die zegt van wanneer de stand is. Schrijven kan niet
  (geen wachtrij); je krijgt een duidelijke melding en niets raakt half opgeslagen.

De winst bij openen is gemeten met een kunstmatige vertraging op een lokale testserver. Op de
echte Netlify-verbinding en Supabase zal het absolute getal anders zijn.

**Fase B, structuur.** Gebouwd zoals in paragraaf 8: vijf knoppen met de Nieuw-knop in het midden,
Regelen, Mensen (Contacten | Oppas), een Gezin-knop rechtsboven met Breng & haal en Instellingen, en
Vandaag die de tijd volgt (tot 12:00, tot 18:00, daarna). Daarbij erbij gekomen:

- Agenda-items hebben een **eindtijd** en er is een soort **Niet thuis**.
- De invoer begrijpt *niet thuis*, *later thuis*, `18:00-22:00`, `van 18 tot 22 uur` en `tot 22:00`.
  "Later thuis" rekent vanaf de normale thuiskomst (Instellingen, standaard 17:30).
- **Taken** en **besluiten** zijn nieuwe verzamelingen in de opslag (`tasks`, `decisions`); het
  databaseschema hoefde niet te veranderen.
- Signalen worden berekend (`shared/signals.ts`, met tests) en niet opgeslagen. Een oppas-taak
  sluit vanzelf zodra de oppas in de agenda staat.

**Nog niet gedaan of anders dan het prototype:**

- Nog niet op een echte iPhone geprobeerd; gecontroleerd in Chromium op telefoon- en computerbreedte,
  licht en donker.
- De tijdgrenzen van Vandaag (12:00 en 18:00) zijn nog een voorstel.
- Geen eigen account per persoon, dus het filter op Niels of Irene bij Regelen kies je zelf.
- Een melding vooraf over een naderend signaal of een deadline bestaat nog niet.
- Het gezin als hoofdpersoon (fase C) en de bediening (fase D, zoals ongedaan maken in plaats van de
  browserdialoog bij verwijderen) zijn niet gebouwd.

---

## 10. Gebouwd: fase C

Het gezin als hoofdpersoon, in de echte app.

- **Een dier per gezinslid** (`src/components/Avatar.tsx`): Matthijs een olifant, Amélie
  een aap, Lotte een lieveheersbeestje, Irene een schildpad en Niels een uil. Het is de
  uitkomst van de keuze foto's of initialen (sectie 7, punt 3): tekeningen, geen foto's
  van de kinderen in de database. Ze staan in het filter van de agenda, bij items en taken,
  in het Nieuw-blad, bij breng en haal, in Contacten en in het klaarzetten-blok.
- **Klaarzetten per persoon** (`src/lib/prep.ts`, `PrepList`): onder elk dier met naam wat
  er mee moet, de kinderen eerst, dan de ouders, dan *voor iedereen*.
- **Voortgang en een afgerond moment:** "1 van 4 klaar" met een balkje zodra er iets is
  afgevinkt; staat alles klaar, dan komt er een vinkje dat even opveert met
  *Alles zit in de tas* of *Alles staat klaar voor morgen*. Bij verminderde beweging staat
  het stil.
- **Begroeting naar tijdstip** (*Goedemorgen*, *Goedemiddag*, *Goedenavond · morgen*) boven
  de datum.
- **Dubbele tekst weg:** het aantal klaarzetten staat niet meer ook in de kop, het
  voorbeeld van morgen en de ondertitel. Uitleg bij instellingen, lege schermen en de
  signalering is ingekort.
- **Minder hoofdletterlabels:** groepskoppen (*Te laat*, *Deze week*), *Morgen* en de
  korte feiten zijn gewone zinnen. Alleen de weekdagen boven het maandraster blijven
  hoofdletters, zoals in elke agenda. De datum is zwaarder (700) en de begroeting zachter,
  zodat het niveauverschil groter is.

Niet gedaan, bewust: foto's, en een eigen kleur per kind buiten wat er al was. De kleuren
per persoon bestaan al en horen bij de achtergrond van het dier.

---

## 11. Gebouwd: fase D, eerste deel

- **Ongedaan maken in plaats van de bevestigingsvraag.** Verwijderen gaat meteen; de
  melding heeft een knop *Ongedaan maken* die 8 seconden blijft staan. Het geldt voor een
  los item, een hele reeks of een reeks vanaf een datum, een taak, een contact, boodschappen
  (los en *Opruimen*) en een afwijking bij breng en haal. Herstel zet het ongewijzigd terug
  (`POST /api/restore`, `restoreItems` in `shared/rules.ts`): met bron, reeks en tijdstempels,
  en wat er al weer staat blijft ongemoeid. De vier browserdialogen zijn weg.
- **Kortere formulieren.** Agenda-item: wat, wanneer, voor wie en meenemen staan open; soort,
  oppasgegevens, herhalen, notitie en herinnering zitten achter *Meer opties*. Taak: wat,
  wie en deadline; kind, besluit en notitie erachter. Contact: soort, naam, ouders en
  telefoon; groep, adres, verjaardag en notitie erachter. Dichtgeklapt staat er kort wat er al
  is ingevuld, en staat er al iets in, dan begint het formulier open (`MoreOptions`).

### Fase D, tweede deel

- **Vegen op lijsten** (`SwipeRow`): naar rechts afronden of afvinken, naar links weghalen, beide
  met ongedaan maken. Voor taken en boodschappen; bewust niet voor agenda-items. Alleen
  voor aanraking, verticaal scrollen blijft gewoon werken, en de knoppen blijven bestaan.
- **Boodschappen:** invoer onderaan boven de tabbalk, binnen bereik van je duim (op een groot
  scherm blijft hij bovenaan). De snelkeuze *Vaak gekocht* leert zelf: wat minstens twee keer
  is toegevoegd en nu niet op de lijst staat (`shared/shopping.ts`, bewaard in de instellingen).
- **Oppas:** de filters staan op één regel, als twee keuzelijsten. Het filter werkt op het
  contact in plaats van op de naam, ook bij oudere momenten waar alleen een naam stond (de
  hele naam, of een voornaam als er maar één oppas zo heet; `src/lib/oppas.ts`).
- **Rustige overgangen:** een scherm komt zacht binnen, en *Meer opties*, het uitklappen van
  morgen en de melding schuiven een paar pixels in. Bij *verminderde beweging* staat alles
  uit.

**Niet gedaan in fase D:** contacten *zoeken eerst* en een breder telefoonknop zijn al eerder
gebouwd (naam en nummer gescheiden, nummer nooit afgebroken, een WhatsApp-knop ernaast).
