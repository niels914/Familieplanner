# Nog te doen

## Bonnetjes en garantie

Fase 1 en 2 zijn gebouwd; zie [bonnetjes-plan.md](bonnetjes-plan.md) (de keuzes staan onderaan).

**Wensenlijst voor later** (bewust niet in deze versie):

- *Gegevens uit de foto laten lezen door AI* (winkel, datum, bedrag, product). De foto gaat dan
  naar een externe dienst, dus alleen na een tik per bonnetje en na een keuze welke dienst.
- *Bonnetjes uit e-mail*: een eigen adres waarnaar je Coolblue- of Bol-mails doorstuurt. Vraagt om
  een extra dienst. Voor nu is een schermafbeelding prima.
- *Alles downloaden als back-up* (een zip met foto's en een lijst).
- *Jaaroverzicht* van wat je kocht en wat nog onder garantie valt.
- *Snelknop bij Nieuw*, pas als vastleggen via Gezin te veel moeite blijkt.
- *Offline vastleggen*, zoals de rest van de app dat later krijgt.

## Agenda's van Irene en Niels koppelen

**Gebouwd voor Niels (Gmail).** `netlify/lib/agenda.ts`, elk uur via
`netlify/functions/sync-agenda.ts`, link in `NIELS_ICS_URL`. Alleen lezen, volledige
titels (ook privé), alle afspraken tot 400 dagen vooruit en 14 dagen terug, als gewone
items op naam van Niels (soort *Afspraak*, niet in de avondmelding). Herhalingen,
verplaatste en geannuleerde afspraken en andere tijdzones worden verwerkt.

**Nog open.**

- *Irene:* `IRENE_ICS_URL` werkt al zodra zij een iCal-link geeft. Bij een werkagenda
  staat delen vaak uit, of kan alleen "bezet/vrij" worden gedeeld. Zij beslist wat ze deelt.
- Afspraken in Google verwijderen of verplaatsen na het koppelen: de app volgt dat bij
  de volgende ronde. Wijzigen in de app kan niet, want de bron wint.
- Een afspraak als *Niet thuis* markeren (soort wijzigen in het item) voedt de
  signalering van "allebei weg". Automatisch afleiden uit een agenda kan niet: niet elke
  afspraak betekent dat je weg bent. Dit komt terug bij de werkagenda hieronder.

## Werkagenda van Niels: signaleren bij vroeg weg of laat thuis

**Wens.** De app leest de werkagenda van Niels en meldt zelf wanneer hij vroeg van
huis moet of laat thuis is, ook door reistijd. Voorbeeld: een afspraak in Den Haag
die tot 17:00 duurt. Met de reistijd erbij is hij pas veel later thuis, en dat
moet de gezinsplanning weten voordat het een verrassing wordt.

**Hoe het zou werken.**

- De werkagenda wordt alleen gelezen, op dezelfde manier als de andere
  agenda-koppeling hierboven (iCal-link, geheim in een omgevingsvariabele).
- Uit de begin- en eindtijd, de locatie en een reistijd leidt de app af wanneer
  Niels van huis gaat en wanneer hij weer thuis is. Dat voedt dezelfde logica als
  de signalering van "allebei weg" (zie `docs/ontwerp-v2.md`, sectie 8): is Irene
  dan ook weg, dan komt er een taak bij Regelen.
- Het blijft een voorstel dat jullie bevestigen. Niet elke afspraak betekent dat
  je weg bent, en een agenda zegt niets over thuiswerken.

**Wat er moet gebeuren.**

- Reistijd bepalen. Eenvoudig: een vaste marge per plaats (Den Haag = 1 uur heen
  en 1 uur terug) of per afspraak zelf instellen. Slimmer: reistijd opvragen bij
  een routedienst. Dan verlaten adressen de app richting een externe dienst, dus
  eerst kiezen welke en of die in de EU zit.
- Een thuisadres of vaste plaats als vertrekpunt, en een vervoerswijze (auto of OV).
- De signalering moet eerst bestaan: agenda-items krijgen een eindtijd en de
  soort *Niet thuis*. Dit bouwt daarop voort.

**Nog te kiezen.**

- Kan de werkagenda een iCal-link geven? Bij een werkagenda staat delen vaak uit.
  Is er een Outlook-agenda, dan kan dat via een andere route.
- Privacy: werkafspraken kunnen vertrouwelijk zijn. Voorstel: alleen opslaan en
  tonen *dat* en *wanneer* Niels weg is, plus de plaats, zonder titels van afspraken.
- Vanaf wanneer telt het als "vroeg weg" of "laat thuis"? Bijvoorbeeld voor 07:30
  weg of na 18:30 thuis, in te stellen.
- Afspraken zonder locatie of met een videolink negeren.
