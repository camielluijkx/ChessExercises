# Angular-app, Nederlands, toetsaanbod, IndexedDB

Status: accepted

De vanilla UI is te druk: oefenen, beheersingstoets, voortgang en hervatten concurreren zonder heldere focus. We herschrijven UI én domein naar Angular+TypeScript, met gedragspoort eerst (bestaande tests als specificatie) en daarna het nieuwe schermmodel. UI is alleen Nederlands; leerdoelnamen volgen Stappenmethode-motieven waar mogelijk, zonder officieel Stappendiploma te claimen. De speler kiest geen beheersingstoets meer: de software doet een toetsaanbod na oefengereedheid (o.a. tien correcte oefeningen op dat leerdoel). Instaptoets verdwijnt. Routes: dashboard `/`, oefenen `/oefenen`, toetsmodus `/toets`. Persistentie in IndexedDB met migratie vanaf localStorage (diagnostic-restant strippen). Python-puzzelpipeline en vendor (chess.js/Stockfish) blijven buiten de app-migratie.

Afgewezen: alleen een Angular-UI-shell om bestaande JS; dual-run van oude en nieuwe app; Engelse UI/i18n; vrije “Start beheersingstoets”-keuze; diplomataal voor productregels; localStorage als enige store.
