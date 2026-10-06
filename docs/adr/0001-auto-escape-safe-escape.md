# Auto-toetsgeschiktheid voor s1.escape met veilige ontsnapping

Status: accepted

Stap-1 leerdoel `s1.escape` (schaak opheffen) had geen toetsmateriaal en lege kandidaattags, waardoor vrijgave naar stap 2 structureel onmogelijk bleef. We maken 1-ply ontsnappingen automatisch toetsgeschikt, analoog aan `s1.mate` / `s1.capture`, maar alleen als de zet het schaak opheft zonder ongedekt materiaal weg te geven (`safeEscape`). Zo blijft het leerdoel mechanisch bewijsbaar zonder pedagogische review, terwijl “elke legale ontsnapping” (inclusief dame weggeven) en “alleen via handmatige review” zijn verworpen: te slap respectievelijk te traag voor dit elementaire doel. Bestaande `proof`s op dit leerdoel worden lastig terug te draaien als de regel later soepeler of strenger wordt.
