# ChessExercises — tactische beheersing

Een browsertrainer met een leerdoelenkaart gebaseerd op de Stappenmethode. **Leerstof, voorkennis en oplossingsdiepte sturen het aanbod.** Een puzzelrating bepaalt geen stap en geeft geen vrijstelling. De app volgt alleen gedekte tactische vaardigheden; zij bewijst geen volledige beheersing van de officiële Stappenmethode of toepassing in partijen.

## Starten

### Angular-app (in opbouw)

Nieuwe UI-shell (NL-only) volgens ADR 0002. Placeholders voor dashboard, oefenen en toets:

```bash
cd web
npm start
```

Open `http://localhost:4200/` (`/`, `/oefenen`, `/toets`). Root-scripts: `npm run web:start`, `npm run web:build`.

### Vanilla UI (huidige speelbare app)

Open `chess_exercises.html` voor eenvoudige, exact beoordeelbare opgaven. Voor de lokale engine en langere varianten serveer je het project via localhost:

```bash
cd /Users/glenn/repositories/ChessExercises
python3 -m http.server 8080
```

Open vervolgens `http://localhost:8080/chess_exercises.html`. Stockfish en de regelsbibliotheek zijn lokaal gebundeld; antwoorden worden niet naar een externe dienst gestuurd. De trainer ondersteunt Nederlands en Engels, bord draaien, promotiekeuze en eigen puzzelsets.

- **Volgende oefening** biedt alleen passende leerstof, gerichte basisherhaling of eerder beheerste stof. Hints en feedback per zet blijven tijdens oefenen mogelijk.
- **Start instaptoets** geeft een korte screening van beschikbare gecontroleerde onderdelen, vanaf de basis. Dit levert oefenadvies, geen beheersingsvrijstelling. De beheersingstoetsvoorraad blijft gereserveerd.
- **Start beheersingstoets** start bewust een gemengde reeks van beschikbare leerdoelen. Een geselecteerd oefenthema bepaalt niet het toetsantwoord. De doelen, hints en feedback zijn tijdens de reeks verborgen.
- Voer tijdens toetsing **beide kleuren** op het bord in, of typ de volledige variant in UCI-notatie, bijvoorbeeld `e2e4 e7e5 g1f3`. Je mag niet-ingediende invoer verbeteren; er volgt geen bevestiging van een goede zet tussendoor. Klik daarna op **Variant indienen**. Uitleg volgt na de reeks.
- Een optionele moeilijkheidsvoorkeur, bijvoorbeeld **2200**, rangschikt alleen oefenopgaven binnen toegestane leerstof.

## Beheersingsregels

Per verplicht onderdeel zijn twintig verschillende, ongeziene, beoordeelbare toetsopgaven nodig: twee reeksen van tien, met **minimaal 24 uur** ertussen. Minstens achttien moeten zelfstandig correct zijn. Beschikbare onderdelen worden gemengd; een sessie kan daardoor meer dan tien opgaven bevatten. Elk onderdeel houdt zijn eigen bewijs en wachttijd.

Een sterk ander onderdeel compenseert geen zwak onderdeel. De volgende stap blijft gesloten zolang vereiste eerdere onderdelen onbewezen zijn. De gebruikelijke tactische diepte is 1, 3, 3, 5, 5 ply voor stap 1–5; 7 ply bij stap 6 is een bronafleiding, geen universele regel. Vaardigheid en verdieping blijven bepalend. Inhoudelijke diepte-uitzonderingen moeten worden vastgelegd.

Ongeveer twintig procent van het oefenaanbod betreft eerdere stof. Waar geschikt materiaal bestaat, bevat een gemengde toets ook onderhoud van eerder beheerste vaardigheden. Minder dan acht zelfstandig juiste antwoorden in de laatste tien beoordeelbare toetsen van een onderdeel leidt tot gerichte herhaling. De relevante basisvaardigheden worden opnieuw onderzocht; andere bewezen onderdelen blijven behouden. Herstel vereist een nieuwe beheersingstoets met andere opgaven.

**Ik weet het niet** telt als niet zelfstandig opgelost. De app sluiten is geen fout: de openstaande opgave en ingevoerde variant worden hervat. Onzekere beoordeling telt niet mee in de goed/fout-noemer; de opgave wordt gemarkeerd voor controle en vervangen.

Dit zijn productregels uit het ontwerpgesprek, geen officiële slagingsnormen van de Stappenmethode.

## Huidige dekking — belangrijk

De import van 5 oktober 2026 levert **4.203 legale, verschillende bronstellingen** uit de officiële Lichess-database. De meeste zijn **kandidaten**: tags en lengte geven geen bewijs van een specifiek leerdoel.

Momenteel zijn 185 mat-in-één-stellingen en 111 stellingen voor eenvoudig ongedekt materiaal winnen exact toetsbaar. Voor materiaalwinst kan uit een langere bronpuzzel een eigen, een-ply leerdoel worden afgeleid: een ongedekt stuk slaan zonder onmiddellijke tegenwinst of mat toe te laten. Dat is een afgebakende basisoefening, niet een ingekorte claim dat de volledige Lichess-opgave is opgelost. De bron-ID blijft traceerbaar. Dezelfde beginstelling telt nooit opnieuw als ongezien bewijs.

**Andere leerdoelen missen nog gecontroleerde toetsvoorraad. Daardoor kun je momenteel niet alle onderdelen van stap 1 afvinken en automatisch doorgaan naar stap 2.** Dit verschijnt als *nog onvoldoende toetsmateriaal*. Een tekort wordt niet opgelost met willekeurige opgaven uit een hogere stap of met herhaalde bekende opgaven. Hogere stappen krijgen pas betrouwbare toetsdekking na inhoudelijke beoordeling en antwoordvalidatie. Het raamwerk voor stap 5–6 is daarnaast nog voorlopig.

Controleer de werkelijke dekking:

```bash
node scripts/coverage.js
node scripts/coverage.js --json
```

`docs/assessment-coverage.json` toont toetsgeschikte unieke stellingen; `puzzles.coverage.json` toont alleen de aantallen importkandidaten. Die aantallen hebben verschillende betekenissen.

## Voortgang

Voortgang, blootstelling en openstaande toetsen worden in deze browser/site-origin opgeslagen onder `chessExercises.mastery.v2`. Mensen die hetzelfde browserprofiel gebruiken delen deze voortgang. Een andere browser of het wisselen van `file://` naar localhost gebruikt een andere opslagomgeving.

Een oudere trainingsrating wordt alleen als historische moeilijkheidsinformatie gelezen. Oude willekeurige oefeningen verlenen geen nieuwe beheersing. Beschadigde opgeslagen voortgang wordt waar mogelijk onder een backup-sleutel bewaard. Als opslag niet beschikbaar is, toont de app dit en werkt zij voor de huidige sessie.

## Puzzelvoorraad uitbreiden

De bron is de [officiële Lichess-puzzeldatabase](https://database.lichess.org/#puzzles), CC0. Gebruik voor bulkimport de database, niet het enumereren van live puzzle-API's.

```bash
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/python build_puzzles.py \
  --input /pad/naar/lichess_db_puzzle.csv.zst \
  --output puzzles.js \
  --per-skill 150
```

Node is nodig om de canonieke leerdoelenkaart te lezen. De generator werkt streamend, met een vaste seed en reservoir sampling per kandidaatleerdoel. Zij controleert legale stellingen en varianten, behoudt promoties en schrijft ook een dekkingsrapport. Er zijn geen vaste Windows-paden of ratinggrenzen voor de stappen meer.

Tags en ply leveren alleen **voorstellen**. Verifieer de benodigde kennis, voorbereiding, het tactische doel en de verdediging vóór een opgave toetsgeschikt wordt. Bronverwijzingen voor de leerdoelen staan in `curriculum.js` en `docs/stappenmethode-research.md`. De voorkennisrelaties zijn een expliciet appontwerp.

## Gecontroleerde opgaven toevoegen

Voor niet-elementaire toetsopgaven kun je een reviewmanifest aan de generator meegeven met `--reviews reviews.json`, of `curriculum`-metadata opnemen in een eigen JSON-puzzelset. Eén primair leerdoel per onafhankelijke toetsstelling voorkomt dubbel bewijs. Bijvoorbeeld:

```json
{
  "lichess_XXXXX": {
    "reviewed": true,
    "reviewSource": "Eigen inhoudelijke beoordeling: voorbereiding door lokken; bron stap 4",
    "skillIds": ["s4.attraction"],
    "verification": {
      "kind": "engine",
      "objective": { "kind": "material", "gain": 1 }
    }
  }
}
```

Dit voorbeeld is een schema, geen reeds beoordeelde opgave. Een verklaarde afwijking in lengte krijgt een `depthException`. Een review moet daadwerkelijk onderbouwen dat de positie het gekozen leerdoel traint; de software kan die pedagogische beoordeling niet uit een tag afleiden.

Ondersteunde antwoordcontrole:

- `mate`: exacte minimax voor korte matopgaven, inclusief zo lang mogelijk weerstand bieden; een begrensde zoekruimte kan onzekerheid opleveren.
- `safeCapture`: een precies afgebakende één-ply basisoefening met controle van onmiddellijke tegenwinst en mat.
- `tree`: inhoudelijk gecontroleerde legale antwoordvarianten, `defenceReviewed: true` en een lijst `lines`. Een niet-opgenomen alternatief blijft onbeoordeeld.
- `engine`: lokale Stockfish-controle van iedere eigen zet én tegenzet, gevolgd door het mat- of materiaaldoel. Beperkte zoekdiepte is geen wiskundig bewijs. Ondiepe, begrensde of tegenstrijdige evaluaties blijven onbeoordeeld. De conservatieve CP-grenzen zijn implementatiekeuzes, geen onderwijsnormen.

Een conflicterende leerdoelindeling voor dezelfde stelling maakt die stelling ongeschikt voor toetsing. Daarmee wordt een herlabelde opgave geen nieuw bewijs.

## Projectstructuur

- `chess_exercises.html`: bord en bestaande visuele layout.
- `curriculum.js`: brononderbouwde tactische doelen, diepte en expliciete voorkennis.
- `mastery.js`: bewijs, onafhankelijke voorraad, instapadvies, gemengde toetsen, onderhoud en terugval.
- `assessment.js`: schaakregelsadapter, stellingidentiteit, basisdoelen en volledige-variantbeoordeling.
- `training-ui.js`: oefenen/toetsen, verborgen thema's, feedback en hervatten.
- `assessment-worker.js`, `engine-client.js`: lokale achtergrondcontrole en UCI-adapter.
- `build_puzzles.py`, `puzzles.js`: import en kandidaatvoorraad.
- `vendor/`: chess.js en Stockfish.js met licenties en bronverwijzingen.
- `docs/`: onderzoek, bevestigd ontwerp en daadwerkelijke toetsdekking.
- `tests/`: model-, antwoord-, UI-integratie- en echte enginecontroles.

## Verificatie

```bash
npm test
python3 -m py_compile build_puzzles.py
```

De Node-tests gebruiken geen extra npm-installatie. De UI-integratietests draaien met een DOM-adapter; ze zijn geen visuele browsertest.

Puzzeldata: CC0. chess.js: BSD-2-Clause. Stockfish.js: GPLv3; zie `vendor/`. Officiële Stappenmethode-bronnen worden gebruikt voor de leerdoelenstructuur en bronverwijzingen; werkboekopgaven zijn niet overgenomen.
