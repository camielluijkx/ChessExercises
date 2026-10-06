# Implementatiestatus — 5 oktober 2026

Het bevestigde beheersingsmodel is geïmplementeerd: afzonderlijke leerdoelen, stapbeperkingen, gerichte voorkennis, twintig zelfstandige opgaven in twee reeksen op minimaal 24 uur afstand, gemengde blinde toetsing, onderhoud, overslaan, onzekere beoordeling en opgeslagen hervatting. Een oude rating geeft geen vrijstelling. De difficulty-voorkeur geldt alleen binnen toegestane leerstof.

De eerdere ratinggestuurde adaptive.js en bijbehorende tests zijn vervangen. De bestaande schaakregels zijn vervangen door de lokaal gebundelde chess.js-regels. Stockfish.js lite single-thread is gebundeld en met een echte lokale UCI-procesintegratie getest.

De ruwe voorraad is uitgebreid van 819 naar 4.203 onafhankelijke CC0-bronstellingen. Het importbestand bevat kandidaten, geen automatische pedagogische certificering. Op basis van exacte elementaire doelen en reviews zijn momenteel alle zes verplichte stap-1-leerdoelen toetsbaar (≥20 toetsstellingen elk), inclusief automatisch `s1.escape` (`safeEscape`) en reviewed/handmatige aanvullingen voor `defend`/`exchange`/`double`. Daarmee is vrijgave van stap 1 naar stap 2 mogelijk. Stap 2+ wacht grotendeels nog op inhoudelijke review; het systeem toont dekkingsgrenzen expliciet.

Werkelijke dekking: assessment-coverage.json en `node scripts/coverage.js`. Importeer gecontroleerde doelen met reviewmetadata zoals in README.md. De leerdoelenkaart en de voorkennisrelaties in curriculum.js zijn een appontwerp uit openbare officiële broninformatie; zij vormen geen volledige officiële curriculumcertificering.

Gecontroleerd: model en profielmigratie, individuele drempels, wachttijd, gemengde onafhankelijkheid, verborgen thema's en uitgestelde feedback, hervatten, conflicterende stellinglabels, alternatieve matzetten, zwakke verdediging, beoordelingsonzekerheid en daadwerkelijke Stockfish-initialisatie. Visuele browsercontrole is niet uitgevoerd: Chrome was niet beschikbaar en de ingebouwde browser blokkeerde file://.
