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

## 8. Bevindingen uit het prototype van fase B

Het aantikbare prototype staat in `docs/mockups/fase-b.html` (open het in een browser) met
beelden in dezelfde map. Het bouwt op de echte stijl en de echte invoerparser. Het maakte
vier dingen zichtbaar die in het plan hierboven ontbraken:

1. **Het weekmenu had geen plek.** Voorstel: een segment naast de lijst in *Boodschappen*
   (Lijst | Weekmenu), met "zet ingrediënten op de lijst" één tik verderop.
2. **Oppas wordt één tik dieper**, achter *Mensen* (Contacten | Oppas). Dat is bewust: het
   gebruik is maandelijks, het alternatief is vijf tabs.
3. **De tijdstanden van Vandaag zijn een voorstel**: tot 12:00 ochtend ("Vandaag mee" bovenaan),
   tot 18:00 middag (alleen wat nog moet, morgen als één regel), daarna avond (morgen voorop).
   Het afkappunt voor de avond kan ook het uur van de avondmelding zijn.
4. **Zonder zwevende plusknop is vastleggen alleen in de Agenda één tik** (invoerbalk onderin).
   In Boodschappen en Mensen staat de eigen invoer; vanuit Vandaag kost een nieuw item twee tikken.

Aantal tikken, nu → straks: boodschap toevoegen 2 → 1, instellingen 2 → 1, iets vastleggen
2 → 1 en Enter, Oppas 1 → 2, contact zoeken en breng & haal gelijk.
