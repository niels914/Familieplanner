# Ontwerpplan Familieplanner

Richting: **rustig en warm**. Het moet aanvoelen als een mooie papieren
gezinskalender aan de muur — warm, maar volwassen. Geen speelgoed, geen
beheerpaneel.

---

## 1. Uitgangspunten

Vier regels die elke afweging beslechten.

**De avond bepaalt het ontwerp.** Dit ding wordt vooral gebruikt om 21:30 op
de bank, met één hand, moe, om te kijken wat er morgen mee moet. Dat moment
wint van elk ander scherm. Als iets die vraag niet sneller beantwoordt, hoort
het niet op het eerste scherm.

**Kleur betekent iets.** Kleur is gereserveerd voor twee dingen: van wie iets
is, en of er iets moet gebeuren. Nooit versiering. Wie de kleuren niet kent,
moet de app nog steeds kunnen lezen — daarom staat er altijd tekst naast.

**Rust boven volledigheid.** Liever vijf dingen die je meteen ziet dan vijftien
die je moet uitkammen. Details komen bij aanraken, niet vooraf.

**Alles wat er staat, is waar.** Twee mensen gebruiken dezelfde data. De app
haalt bij terugkomst opnieuw op, en laat zien wanneer iets voor het laatst is
bijgewerkt. Geen stille verouderde schermen.

---

## 2. Ontwerptaal

### Kleur

Één ondergrond, één primaire kleur, één accent. De rest is betekenis.

| Rol | Licht | Donker | Waarvoor |
|---|---|---|---|
| Ondergrond | `#F7F5F0` | `#16171A` | papiercrème |
| Vlak | `#FFFFFF` | `#1F2126` | kaarten |
| Tekst | `#23211D` | `#ECEAE5` | |
| Gedempt | `#6F6A61` | `#A09A91` | bijzin, nooit hoofdzaak |
| Lijn | `#E4DFD5` | `#34373E` | fijne scheiding, 1px |
| Primair | `#1A5F4E` | `#4FB096` | acties, actieve staat |
| Accent | `#9A4A12` | `#E09A5C` | meenemen, urgentie |

Het accent is donkerder dan het huidige terracotta: het oude `#B45F1C` op zacht
oranje haalt 3,98:1 en zakt onder de norm. `#9A4A12` haalt ruim 4,5:1. Dat is
precies het blok dat je 's avonds moet kunnen lezen.

Kinderkleuren blijven, maar veranderen van vorm: **een gekleurde rand links,
geen gekleurd vlak.** Zo blijft de tekst op wit staan en telt de kleur mee als
markering in plaats van als achtergrond.

| Matthijs | Amélie | Lotte | Gezin | Niels/Irene |
|---|---|---|---|---|
| blauw `#2C6BA8` | roze `#A8437A` | paars `#6A4FA6` | groen | olijf |

### Typografie

Twee lettertypes, zelf gehost — geen verzoeken naar Google, want er staan
telefoonnummers van andere gezinnen in deze app, en zelf hosten houdt het ook
offline werkend.

- **Fraunces** voor koppen en datums. Een serif met karakter; hij geeft de app
  de toon van iets persoonlijks in plaats van iets zakelijks. Alleen op grote
  formaten, waar je hem ziet.
- **Inter** voor alles wat je leest en aantikt.

Schaal (mobiel / desktop): 30/34 dagtitel · 20/22 sectiekop · 16 lopende tekst ·
14 bijzin · 12 label. Eén stap groter dan nu voor lopende tekst in lijsten:
's avonds lezen op een telefoon vraagt geen 14px.

### Vorm en diepte

Hoeken 12px (kaarten) en 8px (invoervelden). Eén schaduw, alleen voor dingen
die echt zweven: de zweefknop, een venster, een melding. Kaarten in een lijst
krijgen een fijne lijn, geen schaduw — dat is wat de huidige app te wollig
maakt.

### Iconen

De emoji gaan eruit. In de tabbalk staat nu een emoji-kalender met "17 juli"
erop: verkeerde informatie in beeld, en op iOS en Android zien ze er anders uit.

Eigen set van ongeveer twintig iconen als inline SVG, 24px raster, lijndikte
1,75px, ronde uiteinden. Ze erven `currentColor`, dus ze kleuren mee met de
actieve staat en met het donkere thema. Eén bestand, geen externe library.

Nodig: vandaag · kalender · oppas · contacten · meer · rugzak · fles · blokken ·
taart · palmboom · speld · klok · telefoon · zoeken · plus · vinkje · kruis ·
chevrons · potlood · prullenbak · terugdraaien.

### Beweging

150–200 ms, `ease-out`, en niets dat je moet uitzitten. Afvinken geeft een
korte schaalpuls en een vinkje dat zich tekent — bevestiging dat het gelukt is.
Vensters schuiven omhoog. Alles achter `prefers-reduced-motion`.

---

## 3. De schermen

### Vandaag — van kaartenstapel naar dagkaart

Nu zijn het vijf witte kaarten die even zwaar wegen. Straks één opbouw met een
duidelijke kop:

1. **Datum groot** in Fraunces, met één regel eronder: "3 dingen · 2 klaarzetten".
2. **Klaarzetten voor morgen** direct daarna, in het accent, met grote
   aanraakvlakken. Dit is de reden dat de app bestaat.
3. **Dagstrook**: brengen, halen en het eten als drie korte feiten op één regel,
   niet als kaart.
4. **Tijdlijn van vandaag**: tijd op een rail links, items ernaast. Leest sneller
   dan losse kaarten en laat gaten in de dag zien.
5. **Morgen** compact eronder, inklapbaar.

### Agenda — op de telefoon een weekstrip, niet een maandraster

Het maandraster met stipjes zegt je dát er iets is, niet wát. Op een telefoon is
dat de verkeerde ruilhandel.

- Boven: **weekstrip** van zeven dagen, veegbaar naar vorige en volgende week.
  Per dag het nummer, maximaal drie personenstipjes en een rugzakje als er iets
  mee moet.
- Daaronder: **de volledige daglijst**, in dezelfde tijdlijnvorm als bij Vandaag.
- Een knop **Maand** voor als je overzicht wilt; dat raster blijft bestaan en
  krijgt dezelfde opknapbeurt.
- Op desktop: maandraster links, dag rechts, in twee kolommen. Daar is de ruimte
  er wel.

### Oppas

Blijft in opzet staan. De totalen worden één strook bovenaan met uren, bedrag en
openstaand; bij "alle oppassen" een uitsplitsing per persoon, zodat je in één
blik ziet wie je nog moet betalen.

### Contacten

Groeperen per klas met plakkende koppen. Initialen in de kleur van het kind.
Telefoonnummers worden volwaardige knoppen van minstens 44px — nu zijn het
kleine pillen die je met een duim naast moet tikken.

### Formulieren

De native dropdowns voor "voor wie" en "soort" gaan eruit; daar komen chips voor
die je in één tik kiest. Tijd krijgt snelkeuzes naast het tijdveld. Het
oppasblok wordt één compacte rij in plaats van zes losse velden.

### Lege en ladende schermen

Skeletten in plaats van een draaiend rondje. Lege schermen krijgen een klein
lijntekeningetje, één zin en een knop die het voor de hand liggende doet
("Zet het eerste klasgenootje erin").

---

## 4. Toegankelijkheid

Wordt niet achteraf gecontroleerd maar per fase:

- Alle tekst haalt 4,5:1, ook het meenemen-blok en beide thema's.
- Elk icoon heeft tekst ernaast of een `aria-label`.
- Aanraakvlakken minstens 44px.
- Zichtbare focusrand op alles wat je met een toetsenbord kunt bereiken.
- `prefers-reduced-motion` schakelt beweging uit.

---

## 5. Fasering

Elke fase is een eigen commit, dus je kunt na elke stap kijken en stoppen.

| Fase | Wat | Waarom deze volgorde |
|---|---|---|
| **1. Fundament** | tokens, lettertypes, iconenset, beweging, contrastherstel | alles daarna bouwt hierop; de iconen alleen al veranderen het beeld het meest |
| **2. Vandaag** | dagkaart, klaarzetten-blok, tijdlijn, dagstrook | het scherm dat je het vaakst opent |
| **3. Agenda** | weekstrip met daglijst, maandraster opgeknapt, desktop in twee kolommen | grootste inhoudelijke verbetering |
| **4. Lijsten en formulieren** | chips in plaats van dropdowns, contacten, oppastotalen | maakt invoeren merkbaar minder werk |
| **5. Afwerking** | lege staten, skeletten, nieuw app-icoon in de nieuwe stijl, toegankelijkheidscontrole | de laatste tien procent die het af maakt |

## 6. Wat het niet wordt

Geen animatiefestival, geen illustraties bij elk blok, geen thema-instellingen,
geen tweede kleurenschema om uit te kiezen. Eén goed uitgevoerde richting is
beter dan drie halve. En de lettertypes blijven bij twee: elke extra is
laadtijd op een telefoon met een matige verbinding voor de school.
