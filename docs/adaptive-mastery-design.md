# ChessExercises — ontwerp voor tactische beheersing

Datum: 5 oktober 2026. Bijgewerkt 6 oktober 2026 (UI-focus, toetsaanbod, Angular, NL-only; zie ADR 0002). Status: bevestigd door de gebruiker. Dit document beschrijft gewenste werking; de Angular-herschrijf is gepland, niet per se al geleverd.

## Doel en afbakening

De trainer helpt tactische vaardigheden beheersen volgens de inhoudelijke opbouw van de Stappenmethode. Hij bewijst geen volledige beheersing van de officiële stap: partijspel, strategie en niet-gedekte leerstof vallen buiten deze trainer.

Een stap is een verzameling verplichte tactische leerdoelen, met expliciete voorkennis en verdieping. Een gemiddelde score over alle onderdelen is onvoldoende: ieder verplicht onderdeel moet zelfstandig beheerst zijn. Eerdere vaardigheden blijven nodig in hogere stappen.

Rating bepaalt geen stap en verleent geen beheersing. Rating kan hoogstens geschikte moeilijkheid helpen kiezen binnen het leerdoel en de diepte die aan de beurt zijn. Een ingevoerde Lichess-rating, zoals 2200, geeft geen automatische vrijstelling.

## Leerdoelen en puzzelindeling

Maak een brononderbouwde curriculumkaart met per onderdeel: introductiestap, toepassingsniveau, benodigde basisvaardigheden, typische diepte en inhoudelijk gemotiveerde uitzonderingen. Bronfeiten en eigen productkeuzes blijven onderscheiden.

Gebruikelijke tactische dieptes uit het onderzoek: stap 1: 1 ply; stap 2 en 3: 3 ply; stap 4 en 5: 5 ply. Voor stap 6 is 7 ply een afleiding uit de bronbeschrijving en geen universeel voorschrift. Leerstof en verdieping onderscheiden stappen met dezelfde lengte.

Lichess-tags en oplossingslengte helpen kandidaatopgaven vinden, maar certificeren niet het leerdoel. De huidige ratingbakken mogen niet rechtstreeks naar nieuwe beheersingsonderdelen worden omgezet. Onzekere indeling blijft ongeschikt voor toetsbewijs. Een korte herhalingsopgave uit een lagere stap bewijst geen beheersing van een hoger onderdeel.

Per puzzel zijn expliciete leerdoelen, diepte, tactisch einddoel, beginstelling, geverifieerde antwoordmogelijkheden en toetsgeschiktheid nodig. Bij onvoldoende gecontroleerde voorraad verschijnt 'nog onvoldoende toetsmateriaal'. Er volgt geen fallback naar een andere stap om een tekort te verbergen.

## Dashboard, oefenen en toetsaanbod

Er is geen instaptoets of placement die vrijstelling of oefenadvies als aparte feature geeft. Eerste bezoek start op het dashboard bij stap 1; Doorgaan opent de eerste oefening op het eerste open leerdoel.

Het dashboard toont beheersingsvoortgang (stap · N/M beheerst, status per open leerdoel) en een primaire Doorgaan-knop om te hervatten. Toetsen is geen vrije keuze: de software doet een toetsaanbod wanneer een leerdoel gereed is. Gereedheid omvat onder meer tien correcte oefeningen op dat leerdoel, vrijgave/voorkennis, genoeg vers toetsmateriaal, en geen actieve 24-uurswacht. Doorgaan hervat alleen wat al bezig was (pending → actieve reeks → anders oefenen); een nieuw toetsaanbod is een aparte CTA. Bij uitstel blijft Doorgaan oefenen; het aanbod blijft secundair zichtbaar en wordt na 24 uur weer prominent.

De speler beheerst de vereiste onderdelen voordat de volgende stap wordt vrijgegeven. Aangetoonde basiskennis hoeft niet onnodig opnieuw te worden geleerd, maar blijft in onderhoud terugkomen.

Tijdens oefenen mag feedback per zet, hints en reset beschikbaar blijven. Oefenen ondersteunt leren; het levert geen zelfstandig toetsbewijs. Rond twintig procent van het adaptieve oefenaanbod betreft eerdere vaardigheden. Alleen blinde toetsopgaven via toetsaanbod (beheersingstoets of onderhoud in toetsmodus) tellen als toetsbewijs; begeleide herhaling telt niet als toets.

Er is geen onverwachte omschakeling midden in een oefening naar toetsing: het aanbod verschijnt op het dashboard (of als aparte CTA), met omvang en voorwaarden zichtbaar voordat de speler accepteert.

## Beheersingstoets

Per onderdeel: twee reeksen van tien verschillende toetsopgaven, met minimaal 24 uur tussen de toetsmomenten. Minstens achttien van de twintig moeten zelfstandig correct zijn.

De opgaven zijn ongezien als beoordeelde oefening/toets: geen eerder met feedback geoefende opgaven als onafhankelijk nieuw bewijs. Identiteit wordt bijgehouden op puzzel-ID en beginstelling, zodat een andere naam of label geen nieuw bewijs creëert. Voor hernieuwde toetsing zijn andere opgaven nodig.

Het thema, de uitleg en tussentijdse antwoordbeoordeling zijn verborgen. De leerling voert de volledige variant in, inclusief tegenzetten, voordat feedback verschijnt. Een zelfstandig juiste opgave bevat geen gebruikte hint, reset of foutieve ingediende poging. Een bewust overgeslagen opgave telt als niet zelfstandig opgelost.

Na de toets volgt uitleg met gerichte oefenadviezen. Onderbreken of de app sluiten is geen fout: een nog niet ingediende opgave wordt opgeslagen en later hervat. Opgeslagen toetsmomenten en tijdsgrenzen mogen niet door paginavernieuwing worden gereset.

## Antwoordcontrole

Correcte alternatieven moeten worden beoordeeld op het tactische doel én passende verdediging. Een legale variant met een meewerkende tegenstander is onvoldoende. Letterlijke vergelijking met één opgeslagen Lichess-lijn is onvoldoende als algemene volledige-variantbeoordeling.

Gebruik gecontroleerde antwoordbomen en/of engineanalyse met vastgelegde verificatiecriteria. De precieze technische aanpak volgt uit implementatieonderzoek; een onzekere uitkomst wordt niet als fout aan de leerling toegeschreven.

Een antwoord dat niet betrouwbaar beoordeeld kan worden telt niet mee in de goed/fout-noemer en wordt vervangen. De opgave wordt gemarkeerd voor controle. De beoordeling mag geen automatische ongegronde beheersingsclaim opleveren.

## Onderhoud en terugval

Voor elk beheerst onderdeel wordt zelfstandige toetsing gevolgd. Minder dan acht zelfstandig juiste opgaven over de laatste tien beoordeelbare toetsopgaven van dat onderdeel leidt tot gerichte herhaling.

Zoek de ontbrekende basisvaardigheid in de expliciete voorkennisstructuur. Trek niet automatisch alle lagere stappen of andere beheerste onderdelen in. De relevante verdere leerlijn wacht op herstel van die basis; onafhankelijke bewezen onderdelen blijven behouden.

Na gerichte oefening wordt het onderdeel opnieuw getoetst volgens dezelfde eisen: twintig andere opgaven in twee reeksen met minimaal 24 uur ertussen. Oude resultaten blijven geschiedenis en vervangen het nieuwe herstelbewijs niet.

## Voorraad, bronnen en bestaande voortgang

De huidige 819 puzzels zijn onvoldoende verdeeld voor dit ontwerp. Vrijwel iedere oude stap/thema-bak bevat twintig puzzels, zonder aparte oefen- en hertoetsreserve. Er ontbreken ook voldoende langere opgaven voor hogere stappen. Uitbreiding en inhoudelijke controle van de puzzelbank zijn onderdeel van het werk.

Gebruik de officiële Stappenmethode als inhoudelijke bron met eigen leerdoelbeschrijvingen en verwijzingen. Opgaven komen uit geschikt vrij bruikbaar materiaal of eigen materiaal. Officiële werkboekopgaven worden niet zonder passende toestemming herpubliceerd.

De bestaande trainingsrating en oefenhistorie mogen niet automatisch als curriculumbeheersing worden geïmporteerd. Voortgang leeft in de browser (IndexedDB; migratie vanaf localStorage, zonder instaptoets-restant). Bewijsgegevens onderscheiden oefenen, toetsing, onderhoud, blootstelling en onzekere beoordeling.

## Acceptatiecriteria

- Selectie buiten het toegestane leerdoel/de bijbehorende diepte gebeurt uitsluitend als expliciet bedoelde herhaling of gerichte basisremediatie, niet vanwege een rating of leeg vak.
- Een onderdeel wordt alleen beheerst met twintig onafhankelijke, beoordeelbare toetsopgaven, minstens achttien zelfstandig correct en twee reeksen op minimaal 24 uur afstand.
- Een zwak verplicht onderdeel kan niet worden gecompenseerd door een ander sterk onderdeel.
- Hint, reset, foutieve indiening en bewust overslaan leveren geen zelfstandig correcte toetsopgave op.
- Uitstappen en herladen behouden de lopende opgave en toetsvoortgang.
- Geldige alternatieven kunnen worden erkend; zwakke verdediging of onzekerheid levert geen ongegrond goed/fout-resultaat op.
- Een tekort aan betrouwbare opgaven blijft zichtbaar en leidt niet tot een beheersingsmarkering.
- Onderhoud en gerichte terugval behouden onafhankelijk aangetoonde andere vaardigheden.
- Bestaande ratingvoortgang verleent geen automatische stapvrijstelling.

De bewijsdrempels, aantallen, selectiepercentages en tijdsgrenzen zijn onze voorlopige productkeuzes. De officiële bronnen onderbouwen de leerstofopbouw, niet deze specifieke getallen.

## UI en techniek (bevestigd 6 oktober 2026)

- Schermen: dashboard `/`, oefenen `/oefenen`, toetsmodus `/toets` (beheersingstoets; onderhoud als subtitel). UI alleen Nederlands; code-IDs mogen Engels blijven.
- Oefenen: bord + smalle oriëntatie (stap/leerdoel); geen competing startknoppen. Toetsmodus: focus op bord + reeks/opgave; afbreken/terug bewaart pending voor Doorgaan.
- Stack: Angular+TypeScript-herschrijf van UI en domein (gedragspoort eerst). Python-pipeline en vendor (chess.js/Stockfish) blijven. Zie ADR 0002.

## Implementatieaanpak

1. Curriculumkaart en voorkennisstructuur onderbouwen; dekking per onderdeel zichtbaar maken.
2. Generator geschikt maken voor inhoudelijke classificatie, diepte, grotere voorraad en gescheiden bewijsopgaven.
3. Betrouwbare volledige-variantcontrole en metadata uitwerken.
4. Domein poorten naar TypeScript; daarna dashboard, toetsaanbod, oefenen/toetsroutes, onderhoud, terugval, IndexedDB-migratie.
5. Betekenisvolle tests voor selectie, bewijs, tijdsgrenzen, toetsaanbod-drempel, alternatieven, voorraadtekorten en voortgangsmigratie.

Brononderbouwing: zie Stappenmethode-onderzoek.md. Bij onvoldoende bron- of antwoordzekerheid blijft een onderdeel onbewezen; er wordt geen volledige officiële curriculumdekking gesuggereerd.
