// Tactical subset; these are app learning goals, not an official Steps certificate.
(function(root) {
  const sources = {
    1: 'https://www.stappenmethode.nl/nl/stap1.php',
    2: 'https://www.stappenmethode.nl/nl/stap2.php',
    3: 'https://www.stappenmethode.nl/lesmateriaal/stap3/handleiding-stap-3',
    4: 'https://www.stappenmethode.nl/nl/stap4.php',
    5: 'https://www.stappenmethode.nl/lesmateriaal/stap5/handleiding-stap-5',
    6: 'https://www.stappenmethode.nl/lesmateriaal/stap6'
  };
  const rows = [
    [1,'capture','Ongedekt materiaal winnen','Win undefended material',1,[],['hangingPiece']],
    [1,'mate','Mat in één','Mate in one',1,[],['mateIn1']],
    [1,'defend','Een stuk verdedigen','Defend a piece',1,[],['defensiveMove']],
    [1,'escape','Schaak opheffen','Escape check',1,[],['escape']],
    [1,'exchange','Voordelig ruilen','Favourable exchange',1,['s1.capture'],['equality']],
    [1,'double','Tweevoudige aanval: basis','Double attack: basics',1,['s1.capture'],['fork']],
    [2,'double','Dubbele aanval','Double attack',3,['s1.double','s1.capture'],['fork']],
    [2,'pin','Penning','Pin',3,['s1.capture','s1.defend'],['pin']],
    [2,'defender','Uitschakelen verdediging','Remove the defender',3,['s1.defend','s1.exchange'],['capturingDefender','deflection']],
    [2,'mate','Mat in twee','Mate in two',3,['s1.mate','s1.escape'],['mateIn2']],
    [2,'discovered','Aftrekaanval','Discovered attack',3,['s1.double'],['discoveredAttack']],
    [2,'defendmate','Verdedigen tegen mat','Defend against mate',3,['s1.mate','s1.defend'],[]],
    [2,'intermezzo','Tussenzet','Intermezzo',3,['s1.exchange','s1.escape'],['intermezzo']],
    [3,'discoveredcheck','Aftrekschaak','Discovered check',3,['s2.discovered','s1.escape'],['discoveredCheck']],
    [3,'doublecheck','Dubbelschaak','Double check',3,['s2.discovered','s1.escape'],['doubleCheck']],
    [3,'pinned','Aanval op gepend stuk','Attack a pinned piece',3,['s2.pin','s1.defend'],['pin']],
    [3,'mateaccess','Toegang bij mat','Create access for mate',3,['s2.mate','s2.defender'],['mateIn2']],
    [3,'defender','Uitschakelen verdediging: verdieping','Remove the defender: advanced',3,['s2.defender'],['capturingDefender','deflection']],
    [3,'defenddouble','Verdedigen tegen dubbele aanval','Defend against a double attack',3,['s2.double','s1.defend'],[]],
    [3,'defendpin','Verdedigen tegen penning','Defend against a pin',3,['s2.pin','s1.defend'],[]],
    [3,'xray','Röntgenaanval','X-ray attack',3,['s2.pin'],['xRayAttack','skewer']],
    [3,'pinneddefender','Gepende verdediger','Pinned defender',3,['s2.pin','s2.defender'],['pin']],
    [4,'interference','Onderbreken','Interference',5,['s3.xray','s2.defender'],['interference']],
    [4,'attraction','Lokken','Attraction',5,['s2.defender'],['attraction']],
    [4,'blocking','Blokkeren','Blocking',5,['s2.mate','s2.defender'],[]],
    [4,'pinattraction','Penning met lokken','Attraction into a pin',5,['s2.pin','s4.attraction'],['pin','attraction']],
    [4,'defender','Uitschakelen verdediging: voorbereiding','Prepare to remove a defender',5,['s3.defender'],['capturingDefender','deflection']],
    [4,'magnet','Magneet','King magnet',5,['s2.mate','s4.attraction'],['attraction','kingsideAttack']],
    [4,'chase','Jagen en richten','Chase and target',5,['s2.double','s3.xray'],[]],
    [4,'kingattack','Koningsaanval','King attack',5,['s2.mate','s3.discoveredcheck'],['kingsideAttack','queensideAttack']],
    [4,'clearance','Ruimen','Clearance',5,['s2.discovered','s3.xray'],['clearance']],
    [5,'mate','Mat: verdieping','Advanced mate',5,['s4.kingattack','s2.mate'],['mateIn3']],
    [5,'breakthrough','Doorbraak','Breakthrough',5,['s1.exchange','s4.defender'],['advancedPawn','promotion']],
    [5,'discovered','Aftrekaanval: verdieping','Advanced discovered attack',5,['s2.discovered','s4.clearance'],['discoveredAttack']],
    [5,'pin','Penning: verdieping','Advanced pin',5,['s3.pinned','s4.pinattraction'],['pin']],
    [5,'defend','Verdedigen: verdieping','Advanced defence',5,['s3.defenddouble','s3.defendpin'],['defensiveMove']],
    [5,'kingattack','Koningsaanval: verdieping','Advanced king attack',5,['s4.kingattack'],['kingsideAttack','queensideAttack']],
    [6,'combination','Diepere tactische combinaties','Deeper tactical combinations',7,['s5.mate','s5.discovered','s5.pin'],[]]
  ];
  const skills = rows.map(([step,key,nl,en,ply,prerequisites,tags]) => ({
    id:`s${step}.${key}`, step, label:{nl,en}, ply, prerequisites, tags,
    required:true, source:sources[step], outline:step >= 5,
    // Prerequisite edges are an explicit app design, not official exam criteria.
    prerequisiteSource:'app-design'
  }));
  const byId = Object.fromEntries(skills.map(s => [s.id,s]));
  const stepSkills = step => skills.filter(s => s.step === step);
  function candidates(puzzle) {
    if(Array.isArray(puzzle.candidateIds)) return puzzle.candidateIds.filter(id => byId[id] && (byId[id].ply === puzzle.solution?.length || puzzle.curriculum?.depthException));
    const tags = new Set(puzzle.themes || []);
    const legacy = {mat_in_1:'mateIn1',mat_in_2:'mateIn2',winst_materiaal:'hangingPiece',tweevoudige_aanval:'fork',penning:'pin',aftrekschaak:'discoveredCheck',dubbel_schaak:'doubleCheck',rontgen_aanval:'xRayAttack',afleiding:'attraction',overbelasting:'deflection',tussenspel:'intermezzo',zuivering:'clearance'};
    if(legacy[puzzle.type]) tags.add(legacy[puzzle.type]);
    return skills.filter(s => s.ply === puzzle.solution?.length && s.tags.length && (['s4.pinattraction','s4.magnet'].includes(s.id) ? s.tags.every(t => tags.has(t)) : s.tags.some(t => tags.has(t)))).map(s => s.id);
  }
  const api = {skills,byId,stepSkills,candidates,sources};
  if(typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.ChessCurriculum = api;
})(globalThis);
