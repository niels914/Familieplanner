# Kleurrichtingen

Vijf richtingen voor het kleurgebruik, de letters en de vorm van de app. De borden staan
in `docs/moodboards/`; dit bestand bevat de exacte waarden, zodat een gekozen richting
1-op-1 in `src/styles.css` kan.

De namen hieronder zijn precies de CSS-variabelen uit de app (`--bg`, `--primary`, enzovoort),
dus een richting overnemen is die waarden en de twee lettertypes invullen.

**Wat de borden laten zien, en wat niet.** De schermen op de borden zijn de echte app met
alleen de kleuren, letters en hoeken van een richting erover. De indeling is dezelfde als nu.
Wat uit het ontwerpplan nog komt (kinderen met avatar, gekleurde vlakken per kind, de
nieuwe opbouw) zie je hier dus niet.

**Leesbaarheid.** Elke kleur is afgeleid en zo nodig in helderheid bijgesteld tot elk paar
dat de app gebruikt voldoet aan WCAG AA: minstens 4,5:1 voor tekst en 3:1 voor de gekleurde
stippen. Dat geldt voor alle tien thema's (vijf richtingen, licht en donker).

## A · Dennengroen & klei

De huidige richting, verdiept: warmer papier, een diepgroene hoofdkleur en één terracotta accent voor alles wat mee moet. Rustig en volwassen, als een goede papieren kalender aan de muur.

- **Past bij:** Je houdt wat er nu staat en het voelt vertrouwd. Laagste risico.
- **Let op:** Het veiligste, en daarmee ook het minst opvallende van de vijf.
- **Letters:** Fraunces (koppen) + Inter (tekst)
- **Hoeken:** 12px (kaarten), 8px (velden)
- **Standaardthema:** licht

| Variabele | Licht | Donker |
|---|---|---|
| `--bg` | `#F6F2EA` | `#151713` |
| `--surface` | `#FFFDF9` | `#1F211C` |
| `--surface-2` | `#EEE8DB` | `#292C25` |
| `--text` | `#25221C` | `#ECE9E1` |
| `--muted` | `#6A6760` | `#94938D` |
| `--line` | `#E2D9C8` | `#343830` |
| `--line-strong` | `#CCC8C1` | `#4D4E49` |
| `--primary` | `#1B5E4B` | `#55B79B` |
| `--primary-ink` | `#FFFFFF` | `#14100A` |
| `--primary-soft` | `#E1E8E2` | `#2A3F35` |
| `--warn` | `#A3511C` | `#E8A068` |
| `--warn-soft` | `#F4E8DE` | `#43382A` |
| `--danger` | `#A93A34` | `#E6857B` |
| `--danger-soft` | `#F5E6E1` | `#43322D` |
| `--matthijs` | `#2E6C9E` | `#78B0E4` |
| `--matthijs-soft` | `#E4EAED` | `#2F3B40` |
| `--amelie` | `#A74672` | `#EE8FBB` |
| `--amelie-soft` | `#F4E5E7` | `#443539` |
| `--lotte` | `#7258AA` | `#B3A0EE` |
| `--lotte-soft` | `#EDE8EF` | `#3A3842` |
| `--ouder` | `#766638` | `#CDBA82` |
| `--ouder-soft` | `#EDE9E0` | `#3E3D2E` |
| `--gezin` | `#1B5E4B` | `#55B79B` |
| `--gezin-soft` | `#E1E8E2` | `#2A3F35` |

## B · Kust

Zand als ondergrond, zeegroen als hoofdkleur en koraal voor het accent. Lotte krijgt de kleur van zonlicht. Een serif met een vriendelijk, bijna handgemaakt gezicht.

- **Past bij:** Frisser en lichter dan nu, en toch warm. Past goed bij een gezin met jonge kinderen.
- **Let op:** De cijfers in de koppen zakken onder de regel (de 3 in de datum): veel karakter, maar eigenzinnig bij datums. In het donkere thema liggen koraal en Amélie’s roze dichter bij elkaar.
- **Letters:** Young Serif (koppen) + DM Sans (tekst)
- **Hoeken:** 14px (kaarten), 10px (velden)
- **Standaardthema:** licht

| Variabele | Licht | Donker |
|---|---|---|
| `--bg` | `#F6F3EC` | `#0E1A1D` |
| `--surface` | `#FFFEFB` | `#152428` |
| `--surface-2` | `#ECE8DE` | `#1D3237` |
| `--text` | `#16282C` | `#E7EEEC` |
| `--muted` | `#5E6969` | `#909999` |
| `--line` | `#DDD8CB` | `#26393E` |
| `--line-strong` | `#C9CAC6` | `#465153` |
| `--primary` | `#0F6C74` | `#5CC4C9` |
| `--primary-ink` | `#FFFFFF` | `#14100A` |
| `--primary-soft` | `#E0EBE9` | `#234448` |
| `--warn` | `#B6422B` | `#FF9A80` |
| `--warn-soft` | `#F6E8E2` | `#3F3938` |
| `--danger` | `#B03A2E` | `#F08A7E` |
| `--danger-soft` | `#F6E6E2` | `#3C3637` |
| `--matthijs` | `#2A68AE` | `#7FB2EA` |
| `--matthijs-soft` | `#E3EBF1` | `#283E4B` |
| `--amelie` | `#AA4179` | `#F28DBB` |
| `--amelie-soft` | `#F4E5EA` | `#3D3742` |
| `--lotte` | `#896000` | `#E8C26A` |
| `--lotte-soft` | `#F0E9DA` | `#3B4034` |
| `--ouder` | `#5C6B73` | `#A9B9C0` |
| `--ouder-soft` | `#EAEBE9` | `#303F43` |
| `--gezin` | `#0F6C74` | `#5CC4C9` |
| `--gezin-soft` | `#E0EBE9` | `#234448` |

## C · Kleurrijk gezin

Een warme witte ondergrond waarin de kinderen de kleur brengen: elk een eigen duidelijke tint. Indigo als hoofdkleur, een ronde en stevige letter, grote afgeronde hoeken. Op deze schermen zie je de kinderkleuren nog in stippen en labels; in de nieuwe opbouw uit het plan krijgen ze er gekleurde vlakken bij.

- **Past bij:** De kinderen zijn meteen herkenbaar, ook op een snelle blik. Het meest "van ons".
- **Let op:** Het risico is dat het na een tijd kinderachtig aanvoelt. De kleur zit daarom alleen in de kinderen en het accent, niet in de achtergrond.
- **Letters:** Bricolage Grotesque (koppen) + Figtree (tekst)
- **Hoeken:** 20px (kaarten), 14px (velden)
- **Standaardthema:** licht

| Variabele | Licht | Donker |
|---|---|---|
| `--bg` | `#FFF9F0` | `#181426` |
| `--surface` | `#FFFFFF` | `#221D35` |
| `--surface-2` | `#FFEED8` | `#2D2745` |
| `--text` | `#261F33` | `#F3EEFA` |
| `--muted` | `#706973` | `#9792A1` |
| `--line` | `#F1E3CF` | `#3A3358` |
| `--line-strong` | `#D4CDCA` | `#514D5D` |
| `--primary` | `#4338CA` | `#A5A0FF` |
| `--primary-ink` | `#FFFFFF` | `#14100A` |
| `--primary-soft` | `#E7E5F8` | `#3C375D` |
| `--warn` | `#BA3E0C` | `#FFA06B` |
| `--warn-soft` | `#F8E8E2` | `#4A353F` |
| `--danger` | `#C0262D` | `#FF8A8A` |
| `--danger-soft` | `#F7E5E6` | `#4A3144` |
| `--matthijs` | `#1B67C8` | `#7DB6FF` |
| `--matthijs-soft` | `#E1EBF8` | `#323959` |
| `--amelie` | `#C02B61` | `#FF8DB5` |
| `--amelie-soft` | `#F7E3EA` | `#4A314C` |
| `--lotte` | `#A25500` | `#FFC166` |
| `--lotte-soft` | `#F3E9DE` | `#4A3B3E` |
| `--ouder` | `#6B5B95` | `#C9B8F0` |
| `--ouder-soft` | `#ECEAF1` | `#403957` |
| `--gezin` | `#4338CA` | `#A5A0FF` |
| `--gezin-soft` | `#E7E5F8` | `#3C375D` |

## D · Noords licht

Een koele, bijna witte ondergrond, inktblauw als hoofdkleur en één felle tomatenrode streek voor wat aandacht vraagt. Een strakke letter, kleine hoeken, dunne lijnen.

- **Past bij:** Het meest geordend en modern. Veel witruimte, dus je ziet meteen waar het op aankomt.
- **Let op:** Kouder en zakelijker dan de andere vier. Het risico is dat het op een werk-app lijkt.
- **Letters:** Manrope (koppen en tekst)
- **Hoeken:** 8px (kaarten), 6px (velden)
- **Standaardthema:** licht

| Variabele | Licht | Donker |
|---|---|---|
| `--bg` | `#F4F6F8` | `#0F141B` |
| `--surface` | `#FFFFFF` | `#171E27` |
| `--surface-2` | `#E9EDF2` | `#202A36` |
| `--text` | `#121821` | `#EAEFF5` |
| `--muted` | `#666A71` | `#8E9399` |
| `--line` | `#DCE1E8` | `#2A3441` |
| `--line-strong` | `#C7CACD` | `#484D54` |
| `--primary` | `#1E3A5F` | `#8FB4EA` |
| `--primary-ink` | `#FFFFFF` | `#14100A` |
| `--primary-soft` | `#E2E5EA` | `#2F3C4E` |
| `--warn` | `#BC3C1C` | `#FF8A65` |
| `--warn-soft` | `#F9E8E4` | `#413132` |
| `--danger` | `#C2301F` | `#F28B7E` |
| `--danger-soft` | `#F8E6E4` | `#3E3237` |
| `--matthijs` | `#2A5BC4` | `#7FA6F2` |
| `--matthijs-soft` | `#E3EAF7` | `#2A364C` |
| `--amelie` | `#B92D77` | `#F28DC0` |
| `--amelie-soft` | `#F6E4ED` | `#3E3243` |
| `--lotte` | `#0A737E` | `#5CCFD8` |
| `--lotte-soft` | `#DFEDEE` | `#233E47` |
| `--ouder` | `#596579` | `#A9B6C8` |
| `--ouder-soft` | `#E9EBEE` | `#313944` |
| `--gezin` | `#1E3A5F` | `#8FB4EA` |
| `--gezin-soft` | `#E2E5EA` | `#2F3C4E` |

## E · Avondlicht

Ontworpen vanuit het moment dat de app het vaakst gebruikt wordt: de avond. Een diepe, warme nacht als ondergrond met barnsteen als hoofdkleur, als een lamp in de kamer. Het lichte thema is de dagversie.

- **Past bij:** Prettig voor de ogen om 21:30, en op een OLED-scherm zuinig. Heeft het meeste karakter.
- **Let op:** Donker als standaard is een duidelijke keuze. Overdag buiten leest het slechter dan een licht thema.
- **Letters:** Newsreader (koppen) + Albert Sans (tekst)
- **Hoeken:** 16px (kaarten), 10px (velden)
- **Standaardthema:** donker

| Variabele | Licht | Donker |
|---|---|---|
| `--bg` | `#FAF6EF` | `#14121B` |
| `--surface` | `#FFFDFA` | `#1D1A27` |
| `--surface-2` | `#F0E9DD` | `#272334` |
| `--text` | `#231B2E` | `#F0EBE3` |
| `--muted` | `#6C6570` | `#94908F` |
| `--line` | `#E6DCCB` | `#332F42` |
| `--line-strong` | `#CFCAC8` | `#4D4A4F` |
| `--primary` | `#8C5600` | `#F2B45A` |
| `--primary-ink` | `#FFFFFF` | `#14100A` |
| `--primary-soft` | `#F0E7DA` | `#483931` |
| `--warn` | `#B5412A` | `#FF8F70` |
| `--warn-soft` | `#F6E6E1` | `#462F34` |
| `--danger` | `#A93A34` | `#FF8F85` |
| `--danger-soft` | `#F5E6E2` | `#462F38` |
| `--matthijs` | `#2D63B0` | `#86B8F2` |
| `--matthijs-soft` | `#E4E9F0` | `#30364C` |
| `--amelie` | `#AD3E76` | `#F29BC0` |
| `--amelie-soft` | `#F4E4E9` | `#433143` |
| `--lotte` | `#6A50B0` | `#B9A6F6` |
| `--lotte-soft` | `#ECE7F0` | `#39334C` |
| `--ouder` | `#766636` | `#D8C890` |
| `--ouder-soft` | `#EDE9E1` | `#3F393A` |
| `--gezin` | `#8C5600` | `#F2B45A` |
| `--gezin-soft` | `#F0E7DA` | `#483931` |

