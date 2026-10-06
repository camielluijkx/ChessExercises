# Stappenmethode: onderzoek voor ChessExercises

Onderzocht op 5 oktober 2026. Officiële bronfeiten, lokale codebevindingen en productkeuzes zijn hieronder gescheiden. Er zijn geen werkboekopgaven overgenomen. Publieke pagina's en handleidingfragmenten vormen geen volledige curriculumdekking.

## Officiële opbouw en typische diepte

De methode combineert instructie, oefenen, spelen en partijbespreking. Volgens de officiële FAQ bewijst het oplossen van oefeningen of behalen van een diploma nog geen speelvaardigheid: toepassing in partijen telt mee bij doorgaan. Automatische computertegenzetten verminderen de noodzaak om alternatieven en veranderde stellingen zelf vooruit te berekenen. Een tactiektrainer ondersteunt dus een afgebakend deel van de methode en bewijst geen volledige stapbeheersing. [Officiële FAQ](https://www.stappenmethode.nl/faq)

Stap 3 vereist kennis van stap 2; stap 4 vereist beheersing en toepassing van stap 3 en lager; stap 6 vereist beheersing van de eerste vijf stappen plus passend eigen partijspel. [Stap 3](https://www.stappenmethode.nl/lesmateriaal/stap3), [Stap 4](https://www.stappenmethode.nl/nl/stap4.php), [Stap 6](https://www.stappenmethode.nl/lesmateriaal/stap6)

| Stap | Typische tactische diepte | Bron/beperking |
|---|---|---|
| 1 | 1 ply | Handleiding 4 beschrijft een halve zet voor mat/materiaalwinst. |
| 2 | 3 ply | Handleiding 4 beschrijft een volle zet erbij. |
| 3 | 3 ply | Handleiding 3 beschrijft 2 en 3 beide als 1½ zet diep; hun splitsing berust ook op nut, frequentie, moeilijkheid en variatie. |
| 4 | 5 ply | Handleiding 4 noemt 2½ zet voor het overgrote deel van de opgaven. |
| 5 | 5 ply | Handleiding 5 noemt dezelfde diepte voor de meeste onderwerpen. |
| 6 | 7 ply als afleiding | Stap-6-pagina zegt een volle zet dieper; zeven is onze afleiding, geen expliciete universele grens. |

Bronnen: [Handleiding 3, fragment](https://www.stappenmethode.nl/nl/lp/nl_lp_h3.pdf), [Handleiding 4, fragment](https://www.stappenmethode.nl/nl/lp/nl_lp_h4.pdf), [Handleiding 5, fragment](https://www.stappenmethode.nl/nl/lp/nl_lp_h5.pdf), [Stap 6](https://www.stappenmethode.nl/lesmateriaal/stap6).

Eén ply is één zet van één speler. Vijf ply vanaf de leerling betekent drie leerlingzetten en twee tegenzetten. Geen geraadpleegde bron maakt bovenstaande diepte een vaste eis voor elke oefening. Lengte alleen bepaalt geen lesniveau.

## Voorlopige tactische leerdoelen uit officiële bronnen

Dit is een selectie voor de gekozen tactiektrainer, geen volledige lessenlijst of formeel prerequisite-schema. Basis, plus en herhaling moeten apart traceerbaar blijven.

| Stap | Brononderbouwde tactische inhoud | Belangrijk onderscheid |
|---|---|---|
| 1 | Aanval/slaan, verdedigen, schaak opheffen, mat, voordelige ruil, tweevoudige aanval; plus verdiept bordvisie en verdedigen tegen mat. | Meer dan ongedekte stukken slaan en mat-in-één. Tweevoudige aanval niet automatisch gelijkstellen aan elke vorkcombinatie. |
| 2 | Dubbele aanval met dame/andere stukken, penning, uitschakelen verdediging, mat-in-twee, aftrekaanval, verdedigen tegen mat, tussenzet. | Penning en tussenzet beginnen niet pas bij oude appstappen 3 en 4. |
| 3 | Aftrek-/dubbelschaak, aanval op gepend stuk, toegang bij mat-in-twee, uitschakelen verdediging, verdedigen tegen dubbele aanval/penning, röntgen, gepende stukken, dreigingen. | Generiek `pin` onderscheidt eenvoudige penning, aanval op gedekt gepend stuk en gepende verdediger niet. |
| 4 | Voorbereidende acties: onderbreken, lokken, blokkeren, penning met lokken, uitschakelen verdediging, magneet, jagen/richten, koningsaanval, ruimen. | Voorbereiding en samengestelde toepassing zijn relevant, niet uitsluitend hogere rating. |
| 5 | Onder meer mat, doorbraak, aftrekaanval, penning, verdedigen, koningsaanval; meer strategie/eindspel. | Precieze subvaardigheden vergen verdere inhoudelijke uitwerking. |
| 6 | Veel strategie/eindspel; tactiek komt volgens de pagina in één hoofdstuk aan bod. | Een volledige tactische stap-6-kaart is hier niet onderbouwd. |

Bronnen: [Stap 1](https://www.stappenmethode.nl/nl/stap1.php), [Stap 2](https://www.stappenmethode.nl/nl/stap2.php), [Handleiding 3](https://www.stappenmethode.nl/lesmateriaal/stap3/handleiding-stap-3), [Stap 4](https://www.stappenmethode.nl/nl/stap4.php), [Handleiding 5](https://www.stappenmethode.nl/lesmateriaal/stap5/handleiding-stap-5), [Stap 6](https://www.stappenmethode.nl/lesmateriaal/stap6).

Lagere thema's mogen op hoger niveau terugkomen: officieel stap-4-extra/mix doet dit. Introductiestap en toepassingsniveau zijn dus verschillende gegevens. [Stap 4](https://www.stappenmethode.nl/nl/stap4.php)

## Gecontroleerde huidige code en voorraad

`build_puzzles.py:53–59` deelt stappen uitsluitend in op Lichess-rating. `passes(t, level, sol_count)` op regels 62–78 gebruikt `level` niet: materiaalwinst/mat-in-één eisen 1 ply, mat-in-twee 3, meeste overige typen maximaal 3 en vier typen maximaal 5. `adaptive.js:24–47` selecteert op thema/rating over alle stappen. Geen beheersings- of prerequisite-model.

| Oude appstap | 1 ply | 3 ply | 5 ply | Totaal |
|---|---:|---:|---:|---:|
| 1 | 40 | 0 | 0 | 40 |
| 2 | 40 | 60 | 0 | 100 |
| 3 | 20 | 120 | 0 | 140 |
| 4 | 20 | 139 | 21 | 180 |
| 5 | 4 | 133 | 43 | 180 |
| 6 | 0 | 122 | 57 | 179 |

Geteld uit `puzzles.js`: 819 unieke IDs, zonder overlap tussen oude niveau×typebakken. Veertig bakken hebben 20 items; stap-6-promotie heeft 19. Een afzonderlijke haalbaarheidsaudit bevestigt ook 819 unieke beginstellingen. Stap-4-afleiding heeft 17 vijf-ply-items, tussenspel 4, overige stap-4-typen nul; geen item is langer dan vijf ply.

Twintig ongeziene toetsitems per onderdeel laten bij bakgrootte twintig geen ruimte voor oefening/diagnose of hertoetsing. Na één blootstelling is de voorraad onvoldoende; promotie is dat al vooraf. Na inhoudelijke herclassificatie kunnen aantallen verder dalen. Nieuwe officiële leerdoelbakken zijn nog niet beoordeeld.

De haalbaarheidsaudit vond geen ruwe Lichess-database, Stockfish op PATH of geïnstalleerde Pythonmodules `chess`/`zstandard`. Dit zijn huidige omgevingsbevindingen, geen methoderegels. Bestaande `validate()` controleert zetlegaliteit en mat-eindpunten voor mattypen; geen evaluatiebewijs van materiaalwinst of kwaliteit van de verdediging.

## Lichess-tags, alternatieven en brongebruik

Het Lichess-CSV start met de opzetzet van de tegenstander; de leerlingoplossing begint daarna. Lichess beschrijft leerlingzetten als noodzakelijk, met meerdere matzetten als uitzondering voor mat-in-één. Het garandeert daarmee niet dat iedere verdediging uniek is. De tags worden automatisch gegenereerd. [Lichess databaseformaat](https://database.lichess.org/#puzzles)

Gevolgtrekking: `fork`, `pin`, `deflection` en lijnlengte zijn kandidaatfilters, geen bewijs van een specifiek officieel lesdoel. De ene hoofdvariant vormt geen volledige verdediging-/alternatievenboom. Volledige-lijntoetsing moet gelijkwaardige goede verdedigingen en alternatieve mat-in-één-zetten kunnen valideren. Een legale maar meewerkende tegenzet kan een ongeldige toetsoplossing opleveren; alleen eindpunt of stringgelijkheid controleren is onvoldoende.

Lichess-export is expliciet CC0. Voor officiële Stappenwerkboekopgaven is in de geraadpleegde bronnen geen open herpublicatielicentie gevonden; de pagina's/fragmenten dragen auteursrechtvermeldingen. Gebruik bronstructuur en begrippen met eigen uitleg en vrij bruikbare/eigen opgaven. Kopieer geen betaalde oefeningen, diagrammen of uitgebreide teksten zonder afzonderlijk vastgestelde toestemming. Dit is een conservatief brongebruikadvies, geen volledige juridische beoordeling. [Lichess licentie](https://database.lichess.org/), [officiële handleidingpagina](https://www.stappenmethode.nl/lesmateriaal/stap3/handleiding-stap-3)

## Afgesproken productregels, niet officiële methoderegels

Uit grillgesprekken: tactiek eerst; ieder onderdeel afzonderlijk beheersen; geen instaptoets/placement-vrijstelling; toetsaanbod door de software (o.a. na tien correcte oefeningen), geen vrije toetsstart; selecteren op vaardigheid/diepte; minstens 90% over 20 verschillende ongeziene ongeholpen toetsitems verdeeld over twee toetsmomenten met minstens 24 uur ertussen; gerichte prerequisite-remediatie met behoud van andere beheersing; circa 20% onderhoud, onder 80% op laatste tien toetsopgaven van een onderdeel leidt tot remediatie; toetsoverslaan is niet opgelost en sluiten bewaart voortgang; volledige lijn inclusief tegenzetten vóór feedback in toetsmodus; begeleiding mag tijdens oefenen; inhoudelijk verklaarde diepte-uitzonderingen. UI: dashboard-first, NL-only, Angular-herschrijf — zie ADR 0002.

Deze getallen en flows komen van ons ontwerp, niet uit officiële Stappenbronnen. Nog uit te werken: verdeling over toetsmomenten, exacte prerequisite-graaf, alternatieve-lijnscore, onafhankelijke items/hertoetsvoorraad en 24-uursdefinitie.

## Aanbevolen vervolgpipeline (ontwerpvoorstel)

Maak een bronverwijzende curriculumkaart per concreet tactisch subdoel: introductiestap, toepassingscontext, prerequisites, typische diepte en verklaarde uitzonderingen. Verzamel Lichess-kandidaten via tags; beoordeel vervolgens daadwerkelijk motief, voorkennis, diepte en alternatieve lijnen. Houd onzekere items onbeoordeeld; migreer ratinglabels niet blind.

Scheid oefen-, diagnose- en toetsvoorraad; registreer blootstelling en genormaliseerde stellingen duurzaam. Toon de beschikbare onafhankelijke toetsvoorraad per onderdeel. Bij onvoldoende voorraad blijft beheersing onbewezen; bekende items herhalen mag oefenen ondersteunen maar geen nieuw ongezien bewijs voorstellen. De huidige publieke bronnen volstaan voor een voorlopig tactisch raamwerk, niet voor volledige gecertificeerde Stappenmethode-dekking.
