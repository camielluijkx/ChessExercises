# ChessExercises — tactische beheersing

Adaptieve schaaktrainer die tactische leerdoelen uit de Stappenmethode-opbouw bewijst via beheersingstoetsen, zonder een officieel Stappendiploma te claimen.

## Language

**Stap**:
Een curriculum-niveau (1–6) als verzameling verplichte tactische leerdoelen.
_Avoid_: Level als synoniem zonder leerdoelen; ratingbak; diploma-stap

**Leerdoel**:
Eén concreet tactisch onderdeel binnen een stap; UI-naam volgt waar mogelijk de Stappenmethode-motiefnaam (bijv. mat in één, penning).
_Avoid_: Thema; skill als synoniem in UI-tekst; onderdeel zonder context; Engelse UI-labels

**Beheersingstoets**:
Bewijsronde per leerdoel: twintig ongeziene, beoordeelbare opgaven in twee reeksen van tien met minimaal 24 uur ertussen, waarvan minstens achttien zelfstandig correct.
_Avoid_: Toets als synoniem voor oefenen; quiz; exam zonder die drempels

**Beheersing**:
De status dat een leerdoel via een geldige beheersingstoets is aangetoond.
_Avoid_: Rating; gemiddelde over leerdoelen

**Vrijgave**:
Het openen van een hogere stap doordat alle verplichte leerdoelen van lagere stappen beheerst zijn.
_Avoid_: Unlock via rating; gedeeltelijke compensatie tussen leerdoelen

**Toetsmateriaal**:
Gecontroleerde, toetsgeschikte stellingen voor een leerdoel.
_Avoid_: Lichess-tag-match als bewijs; oefenpuzzel zonder toetsgeschiktheid

**Kandidaat**:
Geïmporteerde stelling die via tags/ply of een expliciete heuristiek bij een leerdoel past, maar nog geen toetsbewijs mag leveren.
_Avoid_: Toetsmateriaal; beoordeelde opgave

**Pedagogische review**:
Menselijke onderbouwing dat een kandidaat het gekozen leerdoel traint, vastgelegd als reviewmetadata vóór toetsgeschiktheid.
_Avoid_: Automatische tagclassificatie; engine-score als enige pedagogisch bewijs

**Toetsaanbod**:
Het moment waarop de software een beheersingstoets (of onderhoud binnen toetsmodus) aanbiedt omdat het leerdoel gereed is; de speler start die toets niet zelf als vrije keuze.
_Avoid_: Start-toets-knop per leerdoel; instaptoets; placement

**Onderhoud**:
Periodieke blinde toetsing van reeds beheerste leerdoelen.
_Avoid_: Begeleide herhaling als bewijs
