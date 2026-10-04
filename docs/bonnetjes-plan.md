# Bonnetjes en garantie: plan

Status: plan, nog niets gebouwd. Eerst jullie keuzes in sectie 9, dan fase 1.

## 1. Waar het om gaat

Jullie hebben geen opslagprobleem, maar een gewoonteprobleem. Een bonnetje gaat niet verloren
omdat er geen plek voor is, maar omdat het bewaren op het moment van kopen één stap te veel is,
en omdat niemand later denkt aan het kijken naar de garantie.

Daaruit volgen drie ontwerpregels:

1. **Vastleggen kost minder dan tien seconden.** Eén foto en klaar. De rest vul je later aan,
   of nooit. Een bonnetje met alleen een foto is beter dan geen bonnetje.
2. **De app denkt eraan, niet jullie.** Een herinnering vóórdat de garantie afloopt, op het
   moment dat je er nog iets mee kunt.
3. **Terugvinden is snel.** Zoeken op een woord ("wasmachine") levert de foto, de datum en wat
   er nog loopt, en je kunt het bewijs meteen doorsturen naar de winkel.

## 2. Wat de wet zegt, en wat dat voor de app betekent

Dit heb ik gecontroleerd in publicaties van ConsuWijzer, de ACM, het Juridisch Loket en de
Consumentenbond ([Rijksoverheid](https://www.rijksoverheid.nl/onderwerpen/bescherming-van-consumenten/vraag-en-antwoord/welke-garanties-heb-ik-op-een-product),
[ConsuWijzer](https://www.consuwijzer.nl/garantie-reparatie-geld-terug/gekocht-maar-kapot/garantie),
[ACM over de bewijslast](https://consument.acm.nl/garantie-reparatie-geld-terug/bewijslast-bij-kapot-product),
[ACM: "Garantie maar 2 jaar? Vaak niet waar!"](https://consument.acm.nl/garantie-reparatie-geld-terug/garantie-maar-2-jaar-vaak-niet-waar),
[Consumentenbond](https://www.consumentenbond.nl/juridisch-advies/garantie-reparatie/garantie-binnen-garantietermijn)).
De pagina's zelf kon ik hier niet openen; ik ga uit van wat de zoekresultaten ervan melden.

- **Wettelijke garantie heeft geen vaste termijn.** Het gaat erom hoe lang je het product
  redelijk mag verwachten mee te gaan. Dat is vaak langer dan twee jaar, zeker bij duurdere
  spullen. Je rechten stoppen dus niet automatisch na twee jaar.
- **Bewijslast:** gaat iets stuk binnen 12 maanden, dan moet de verkoper aantonen dat het
  jullie schuld is. Daarna moeten jullie aantonen dat het aan het product ligt.
- **Melden:** meld een gebrek binnen twee maanden nadat je het ontdekt. Dan ben je meestal op tijd.
- **Fabrieks- of winkelgarantie** komt daar bovenop en heeft wél een eigen termijn, die in het
  garantiebewijs staat.

Niet gecontroleerd: welk bewijs precies volstaat naast het bonnetje (een bankafschrift of een
orderbevestiging werkt in de praktijk vaak ook), en of dit voor aankopen in het buitenland anders
ligt. De app geeft informatie, geen juridisch advies, en zegt dat ook kort.

**Gevolg voor het ontwerp.** Er zijn twee klokken, en de app moet ze niet door elkaar halen:

| Klok | Heeft een einddatum? | Hoe de app ermee omgaat |
|---|---|---|
| Fabrieks- of winkelgarantie | Ja (jaren of maanden vanaf de aankoop) | Invulbaar, met herinnering vóór het einde |
| Wettelijke garantie | Nee | Geen datum, wel een rustige regel: "Daarna blijft de wettelijke garantie gelden. Meld een gebrek binnen 2 maanden." |

Eén extra termijn is nuttig voor kleding, schoenen en online bestellingen: de **retourtermijn**
(bij online kopen standaard 14 dagen, bij winkels wat de winkel zelf geeft). Die is kort, dus de
herinnering daarvoor werkt het beste.

## 3. Hoe het eruitziet

**Waar:** niet als tabblad, maar achter het huisje: *Gezin → Bonnetjes*, naast *Breng & haal* en
*Instellingen*. Zoals gevraagd ver weg, en geen vijfde knop erbij.

**Vastleggen** (het belangrijkste scherm)
- Bovenaan een grote knop *Foto maken*. Dezelfde knop kiest ook een foto uit de bibliotheek of
  een pdf-bestand (op een iPhone biedt één bestandskeuze al "Foto maken", "Fotobibliotheek" en
  "Kies bestand").
- Na de foto: *Opslaan* staat meteen klaar. Eronder, optioneel:
  *Wat is het?* · *Winkel* · *Datum* (vandaag) · *Bedrag* · *Garantie* (Geen · 1 jaar · 2 jaar · 3 jaar ·
  5 jaar · Anders…) · *Van wie* (de dieren, zoals elders).
- *Meer opties*: serienummer of model, retour t/m, notitie, extra foto's (een bon van twee pagina's).
- Een bonnetje zonder titel krijgt "Bonnetje 4 okt" en het label *Nog aanvullen*.

**De lijst**
- Zoekveld bovenaan. Filter in één regel: *Alles · Loopt · Bijna afgelopen · Verlopen · Nog aanvullen*.
- Een rij: miniatuur, titel, winkel en datum, bedrag, en een garantiechip met kleur:
  *t/m 12 mrt 2028 · nog 1 jaar 5 mnd*. Binnen 60 dagen oranje, verlopen gedempt.
- Groepen als bij Regelen: *Loopt bijna af*, *Loopt*, *Verlopen* (dichtgeklapt).

**Het detail**
- De foto groot, met inzoomen. De gegevens eronder. De rustige regel over de wettelijke garantie.
- Knoppen: *Delen* (de foto of pdf via het deelmenu van de telefoon, bijvoorbeeld naar de winkel),
  *Bewerken*, *Verwijderen* (met *Ongedaan maken*, zoals overal).

**Herinneren** (fase 2)
- 30 en 7 dagen vóór het einde van de garantie komt het erbij in de avondmelding, en bij Regelen
  als rij: "Garantie op de wasmachine loopt af op 12 maart". Twee knoppen: *Geen klachten* (klaar)
  of *Klacht melden* (maakt een taak met het telefoonnummer of de site erbij, en een deadline).
- Voor de retourtermijn: 3 dagen vooraf.

## 4. Gegevens en opslag

**Metadata** (klein): één verzameling `receipts` in dezelfde opslag als de rest.
`id`, `title`, `store`, `purchaseDate`, `amountCents`, `category`, `person`, `warrantyMonths`,
`warrantyUntil` (om te overschrijven als de fabrikant een andere datum noemt), `returnUntil`,
`serial`, `notes`, `files[]`, `remind`, `reminded` (welke herinneringen al gingen), `createdAt`,
`updatedAt`.

**Bestanden** (foto's en pdf's): Supabase Storage, in hetzelfde EU-project als de rest, in een
**privé**-bucket. De app heeft geen Supabase-inlog per persoon, dus alles loopt via onze eigen
server met de bestaande sessie. Er komen nooit publieke links.

- **Uploaden:** de app verkleint de foto eerst (langste zijde 1800 px, JPEG, ongeveer 300 tot
  600 KB; ook HEIC van de iPhone gaat zo naar JPEG) en maakt een miniatuur van 320 px. Daarna
  gaat het via een eigen endpoint naar de opslag. Een pdf tot 5 MB gaat ongewijzigd mee.
- **Tonen:** een eigen endpoint geeft het bestand terug achter de sessie. Omdat een bestand nooit
  verandert, mag de telefoon het lang bewaren; de foto laadt de tweede keer direct.
- **Verwijderen:** de gegevens verdwijnen meteen en kunnen met *Ongedaan maken* terug. De bestanden
  blijven nog 30 dagen staan en worden daarna door een wekelijkse opruimactie echt gewist.

**Niet in het gewone `/api/data`.** Bonnetjes worden pas opgehaald als je dat scherm opent. Anders
wordt het openen van de app trager naarmate er meer bonnetjes zijn.

**Grootte:** zo'n 500 KB per bonnetje betekent ongeveer 2.000 bonnetjes in de gratis 1 GB van
Supabase. Voor jullie is dat jaren.

**Privacy:** op een bonnetje kunnen kaartcijfers, een adres of een klantnummer staan. Daarom een
privé-bucket, niets in de logboeken, en geen foto naar derden zonder dat jullie dat kiezen (zie
sectie 9, punt 4).

## 5. Techniek, in het kort

- `shared/warranty.ts`: de berekening. Einddatum uit aankoopdatum en maanden (een einde van de
  maand blijft kloppen: 31 januari plus één maand is 28 februari), de status (*loopt*, *bijna*,
  *verlopen*, *geen garantie*) en het label ("nog 1 jaar en 5 maanden"). Getest, ook rond schrikkeljaren.
- Nieuwe endpoints in `api.ts`: lijst, opslaan, verwijderen, bestand uploaden en bestand ophalen.
  Herstel loopt via het bestaande `POST /api/restore`, dus *Ongedaan maken* komt gratis mee.
- Schema: een privé-bucket `bonnetjes` in `supabase/schema.sql`, zonder policies (de server-sleutel
  gaat erlangs, net als bij de tabel `kv`), plus een stap in de README.
- Herinneringen: de bestaande geplande functie `send-reminders` en de pushinfrastructuur. Er komt
  geen nieuw soort melding bij; het is een regel in de avondmelding wanneer er iets aanstaat.
- Deelmenu: de ingebouwde deelfunctie van de browser, die op een iPhone bestanden kan meegeven.
- Tests: de rekenregels als gewone tests; de browsertest krijgt een bonnetje vastleggen (met een
  testfoto), zoeken, de kleurchips, verwijderen met ongedaan maken en de controle op 320 px.

## 6. Fasen

| Fase | Wat jullie krijgen | Omvang |
|---|---|---|
| **1. Vastleggen en terugvinden** | Foto maken, bewaren, lijst met zoeken, garantiestatus per bonnetje, bewerken, verwijderen met ongedaan maken, delen | Gemiddeld: ongeveer zo groot als de Gmail-koppeling met fase D erbij |
| **2. De app denkt mee** | Herinneringen (30 en 7 dagen), rij bij Regelen met *Geen klachten* / *Klacht melden*, retourtermijn, *Nog aanvullen* als lijst | Klein tot gemiddeld, bouwt op fase 1 |
| **3. Slimmer** (losse onderdelen) | Gegevens laten voorstellen uit de foto (optioneel), bonnetjes uit e-mail, alles downloaden als back-up, meerdere foto's per bon, jaaroverzicht | Per onderdeel gemiddeld; kies pas na gebruik |

Mijn advies: bouw fase 1 en 2 samen. Zonder herinnering is het een mooie la; de herinnering is
de reden dat het bestaat. Fase 3 pas als jullie merken waar het wringt.

## 7. Wat we niet doen

- Geen juridisch advies, en geen berekening van wat jullie recht hebben. Alleen jullie eigen
  gegevens, plus een korte, juiste regel over de wettelijke garantie.
- Geen koppeling met winkelaccounts of bankgegevens.
- Geen offline vastleggen in fase 1. Zonder verbinding krijg je een duidelijke melding, en de foto
  staat dan nog niet in de app. Dat kan later, zoals bij de rest van de app.
- Geen publieke links of delen buiten de telefoon om.

## 8. Hoe we weten dat het werkt

- Een bonnetje vastleggen duurt in de praktijk minder dan 15 seconden.
- Van de aankopen boven de 50 euro staat er binnen een week een bonnetje in.
- Binnen een half jaar is er minstens één keer een herinnering geweest waar jullie iets mee deden.

## 9. Jullie keuzes

1. **Waar:** alleen achter het huisje (mijn voorstel), of ook een snelknop bij *Nieuw*? Begin
   verstopt; voeg de snelknop pas toe als vastleggen te veel moeite blijkt.
2. **Alleen foto toegestaan?** Mijn advies ja, met *Nog aanvullen*. Zo valt er niets af.
3. **Herinneringen:** 30 en 7 dagen vooraf. Voor elk bonnetje, of alleen boven een bedrag
   (bijvoorbeeld 50 euro) of bij een ingevulde garantie? Voorstel: alleen bij een ingevulde
   garantie, en altijd uit te zetten per bonnetje.
4. **Foto uit laten lezen door AI** (winkel, datum, bedrag, product)? Dat bespaart typwerk, maar
   de foto gaat dan naar een externe dienst. Voorstel: niet in fase 1 en 2. Als jullie het later
   willen, per bonnetje en alleen na een tik op *Laat de app het lezen*.
5. **Bonnetjes uit e-mail** (Coolblue, Bol): in fase 1 kies je het bestand of maak je een
   schermafbeelding. Een eigen e-mailadres waarnaar je kunt doorsturen is mogelijk, maar vraagt om
   een extra dienst; liever pas kijken na gebruik.
6. **De naam in het menu:** *Bonnetjes* of *Bonnetjes & garantie*?
