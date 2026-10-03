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
