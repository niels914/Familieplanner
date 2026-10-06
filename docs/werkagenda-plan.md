# Werkagenda van Niels: vroeg weg, laat thuis

Status: plan, nog niets gebouwd. Eerst de keuzes in sectie 7.

## 1. Waar het om gaat

Niemand in het gezin hoeft je werkagenda te zien. Het gezin moet alleen weten **wanneer jij er
niet bent aan de randen van de dag**: wie doet het ochtendritme als jij voor 08:00 weg moet, en
wie eet, baadt en slaapt met de kinderen als jij pas na 18:00 thuis bent. De reistijd telt mee,
want een afspraak om 09:00 in een andere stad betekent dat je om 07:30 de deur uit gaat.

De werkagenda werkt daarom anders dan Gmail en Outlook van Irene: **bijna alles wordt weggegooid**
en alleen wat de randen raakt komt binnen.

## 2. De regels

**Een afspraak komt binnen als je er vroeg voor weg bent of er laat van thuiskomt:**

- *Vroeg:* je vertrekt vóór 08:00. Dat is de begintijd min de reistijd.
- *Laat:* je bent pas na 18:00 thuis. Dat is de eindtijd plus de reistijd.

Beide grenzen zijn in te stellen. Een afspraak van 17:00 tot 18:30 komt dus binnen, ook zonder
reistijd, en een afspraak van 08:30 in Den Haag met een uur reistijd ook.

**Wat niet binnenkomt:** alles daartussenin, hele-dagafspraken (thuiswerken, vrij, verlof) en
afspraken die zijn afgezegd. Die verlaten je werk nooit; ze worden bij het ophalen al weggegooid
en niet opgeslagen. Dat is ook de privacywinst: van een vertrouwelijk overleg om 11:00 weet de
app niets.

**Wat er van een afspraak binnenkomt:** titel, begin- en eindtijd, locatie. De beschrijving niet:
bij een Teams-uitnodiging is dat vooral rommel, en bij een werkafspraak kan er vertrouwelijke
tekst in staan. (Wil je de beschrijving toch, dan is dat één regel in de code. Zie keuze 3.)

## 3. Reistijd: hoe de app dat beredeneert

De app bepaalt per afspraak of die reistijd vraagt, en hoeveel:

1. **Is het een "rt"-afspraak?** Een blok met als titel *rt* (of *reistijd*, hoofdletters maken niet
   uit) is reistijd. Zo'n blok hoort bij de afspraak die er direct achter (heen) of direct voor
   (terug) staat, met een marge van 10 minuten. De duur van het blok is dan de reistijd, dus exact
   wat jij zelf hebt ingepland.
2. **Heeft de afspraak een fysieke locatie, en is er geen rt-blok?** Dan schat de app de reistijd:
   standaard **45 minuten per kant** (in te stellen). Zo'n schatting krijgt een label *geschat*.
3. **Is de locatie online of ontbreekt hij?** Teams, Zoom, Meet, Webex, "online", een link, of
   thuis: dan is er geen reistijd. Alleen het uur zelf telt.

Een rt-blok zelf wordt geen losse afspraak in de agenda; dat zou dubbel staan. De reistijd staat
bij de afspraak ("1 u reistijd heen, 1 u terug"). Een rt-blok zonder afspraak ernaast, aan de rand
van de dag, komt wel binnen als *Reistijd*, want dan weet je niet waar je naartoe gaat.

Per dag telt de **vroegste vertrektijd** en de **laatste thuiskomsttijd**. Twee afspraken achter
elkaar in dezelfde stad geven dus één vertrek en één thuiskomst, niet twee.

## 4. Wat het gezin ziet

Per werkdag die de randen raakt, maakt de sync één of twee **weg-items** voor Niels, van het soort
*Niet thuis*. Daardoor werkt de signalering van "allebei weg zonder oppas" (zie `docs/ontwerp-v2.md`,
sectie 8) zonder dat daarvoor iets nieuws gebouwd hoeft te worden.

- **Ochtend:** *Niels weg om 07:15* van het vertrek tot 08:30 (wanneer de kinderen vertrekken, in te
  stellen). In de notitie staat waarom: "Overleg Den Haag 09:00, 1 u reistijd (uit je agenda)".
- **Avond:** *Niels thuis om 19:30* van het normale thuisuur (nu 17:30 in Instellingen) tot de
  thuiskomst. Idem de reden in de notitie.
- De afspraken zelf staan er ook, met titel, tijd en locatie, zodat je ze in de agenda herkent.
- Dit komt in de **avondmelding** voor de volgende dag: "Morgen: Niels weg om 07:15". Werkafspraken
  zelf staan niet in die melding; alleen de weg-items.
- Wijzig of verwijder je een weg-item in de app, dan zet de volgende sync het terug: de bron wint,
  net als bij de andere agenda's. Wil je dat een bepaalde afspraak nooit meetelt, haal hem dan uit de
  werkagenda of zet er "thuiswerken" in de locatie.

**Breng en haal.** In een tweede stap: staat er in *Breng en haal* dat Niels op die weekdag brengt,
en is hij die ochtend al weg, dan komt er een punt bij Regelen: "Niels brengt Matthijs, maar is
vanaf 07:15 weg". Dat is precies het moment waar een signaal waarde heeft.

## 5. Techniek

- **Nieuw: een derde agenda-bron** `werk`, link in `WERK_ICS_URL` (een geheim, alleen in Netlify).
  Alleen lezen, net als de andere twee.
- **Nieuw bestand `shared/werkagenda.ts`:** gewone functies zonder scherm, gedeeld en goed te
  testen. Herkennen van rt-blokken, online of fysieke locatie, reistijd koppelen, de randen bepalen,
  de weg-items maken.
- **Aanpassing `netlify/lib/agenda.ts`:** voor de werkbron wordt het resultaat van het inlezen eerst
  door dat filter gehaald, daarna pas opgeslagen. Twee valkuilen die ik meeneem: de bestaande
  veiligheid "een lege agenda ruimt niets op" moet kijken naar wat er *binnenkwam*, niet naar wat er na
  het filter overblijft (anders blijft een verplaatste afspraak staan), en weg-items krijgen een
  vaste uid per dag (`dag:2026-10-12:ochtend`), zodat ze bij de volgende ronde bijgewerkt of
  opgeruimd worden en niet dubbel komen.
- **Instellingen:** een blok *Werkagenda* met "vroeg = voor", "laat = na" (08:00 en 18:00), "ochtend
  loopt tot" (08:30) en "standaard reistijd" (45 min).
- **Tijdzones:** werkagenda's van Microsoft gebruiken Windowsnamen voor de tijdzone. Het inlezen
  neemt die over als Nederlandse tijd. Dat klopt zolang je agenda op Nederlandse tijd staat; is dat
  niet zo, dan zie ik dat bij de eerste echte sync en pas ik het aan.

## 6. Hoe we weten dat het werkt

- Tests op de rekenregels, met jouw voorbeelden:
  - 07:30 tot 09:00 online: binnen, vertrek 07:30.
  - 09:00 tot 10:00 in Den Haag met *rt* 07:30 tot 09:00: binnen, vertrek 07:30, het rt-blok zelf niet.
  - 17:00 tot 18:30 in Utrecht met *rt* 18:30 tot 19:30: thuis 19:30.
  - 08:15 tot 09:00 fysiek zonder rt: vertrek 07:30 (geschat), dus binnen.
  - 10:00 tot 16:00 online, of hele dag thuiswerken: niet binnen.
  - Een afspraak die naar 11:00 verschuift verdwijnt bij de volgende sync.
- De browsertest krijgt een werkdag met zo'n afspraak, het weg-item in de agenda en op Vandaag.
- Een echte controle met jouw agenda: na de eerste sync kijk jij of de dagen kloppen met wat jij
  zelf zou zeggen. Daar is dit plan op bedoeld: de regels zijn eenvoudig te bijstellen.

## 7. Keuzes

1. **Hoe komt je werkagenda binnen?** Het plan gaat uit van een eigen iCal-link (`WERK_ICS_URL`).
   Veel organisaties staan publiceren niet toe. Is je werkagenda doorgezet naar Gmail, dan zit hij
   al in de Gmail-koppeling en kan de app hem niet van privé onderscheiden. In dat geval kan ik de
   werkafspraken herkennen aan een kenmerk dat je me noemt (bijvoorbeeld een Teams-link in de
   beschrijving), maar dat is minder netjes dan een eigen bron.
2. **Hele-dagafspraken** (bijvoorbeeld "dienstreis Brussel"): voorstel is overslaan. Wil je dat een
   hele dag met een fysieke locatie wél als *Niels weg* telt?
3. **De beschrijving van werkafspraken:** voorstel is niet overnemen (zie sectie 2).
4. **Reistijd schatten:** voorstel 45 minuten per kant. Wijkt dat bij jou vaak af, dan leert de app
   later per plaats van je eigen rt-blokken ("Den Haag = 60 minuten"). Dat is een tweede stap.
5. **Ook Irene?** Zij zet haar afspraken zelf op *Niet thuis* wanneer dat telt. Dit plan is voor jou;
   hetzelfde filter kan er later voor haar bij.

## 8. Fasen

| Fase | Wat jullie krijgen |
|---|---|
| **1. Randen** | Werkbron, filter op vroeg en laat, titel, tijd en locatie van de afspraken, instellingen |
| **2. Reistijd en signaal** | rt-blokken koppelen, schatting bij een fysieke locatie, weg-items (dus de signalering werkt), avondmelding |
| **3. Slimmer** | Conflict met breng en haal bij Regelen, reistijd per plaats leren |

Mijn advies: fase 1 en 2 samen. Zonder reistijd mist het precies de afspraken waar het om gaat.
