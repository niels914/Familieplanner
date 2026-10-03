# Nog te doen

## Agenda's van Irene en Niels koppelen

**Doel.** Afspraken uit de eigen agenda's als rustige achtergrond in de
gezinsagenda, zodat je ziet of de ander kan brengen of halen. Alleen lezen:
de app schrijft niets terug naar die agenda's.

**Wat er al ligt.** De Parro-koppeling (`netlify/lib/ics.ts`, `parro.ts`) leest al
iCal-links. Dezelfde route werkt voor Google-agenda's. Het werk zit vooral in
het uitbreiden van één feed naar meerdere, elk met een naam, een eigenaar
(`niels` of `irene`, die bestaan al) en een eigen weergave.

**Wat jij moet regelen.**

- *Gmail van Niels:* Google Agenda → instellingen voor je agenda → agenda
  integreren → **Geheim adres in iCal-indeling**. (De exacte namen kunnen
  verschillen.) Die link is een wachtwoord: wie hem heeft, leest de hele agenda.
  Hij hoort alleen in een omgevingsvariabele in Netlify, net als de
  Parro-link, nooit in de code.
- *Agenda van Irene:* die moet een iCal-link kunnen geven. Bij een werkagenda
  staat delen vaak uit, of kan alleen "bezet/vrij" worden gedeeld. Zij beslist
  wat ze deelt; het is haar agenda.

**Nog te kiezen.**

- Volledige titels tonen, of alleen "bezet"?
- Privé-afspraken verbergen?
- Hoe ver vooruit meenemen?
- Als achtergrond naast de gezinsitems, of in een eigen laag die je aan en uit zet?

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
