// Silent engine check: keep or permanently replace a stored puzzle solution.
(function(root) {
  const Rules = typeof module !== 'undefined' && module.exports ? require('./vendor/chess.js') : root.ChessRules;
  const Assessment = typeof module !== 'undefined' && module.exports ? require('./assessment.js') : root.TacticalAssessment;
  const FIX_KEY = 'chessExercises.puzzleFixes.v1';

  function load(storage) {
    try {
      const raw = storage?.getItem?.(FIX_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      if(!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
      const fixes = {};
      for(const [id,fix] of Object.entries(parsed)) {
        if(typeof id !== 'string' || !fix || !Array.isArray(fix.solution) || !fix.solution.length || fix.solution.length > 15) continue;
        if(!fix.solution.every(m => typeof m === 'string' && /^[a-h][1-8][a-h][1-8][qrbn]?$/i.test(m))) continue;
        fixes[id] = {solution:fix.solution.map(m => m.toLowerCase()), previous: Array.isArray(fix.previous) ? fix.previous : null, at: Number(fix.at) || 0, sourceId: typeof fix.sourceId === 'string' ? fix.sourceId : null};
      }
      return fixes;
    } catch(e) { return {}; }
  }

  function save(fixes, storage) {
    if(!storage?.setItem) return false;
    try { storage.setItem(FIX_KEY, JSON.stringify(fixes)); return true; }
    catch(e) { return false; }
  }

  function applyToPuzzles(puzzles, fixes) {
    if(!fixes || !Object.keys(fixes).length) return puzzles;
    return puzzles.map(p => fixes[p.id] ? {...p, solution: fixes[p.id].solution} : p);
  }

  function applyToBank(items, fixes) {
    if(!fixes || !Object.keys(fixes).length) return items;
    return items.map(item => {
      const fix = fixes[item.puzzle.id];
      if(!fix) return item;
      return Assessment.describe({...item.puzzle, solution: fix.solution}) || item;
    });
  }

  function record(fixes, puzzle, solution, now = Date.now()) {
    const next = {...fixes};
    next[puzzle.id] = {
      solution: solution.map(m => m.toLowerCase()),
      previous: (puzzle.solution || []).map(m => String(m).toLowerCase()),
      at: now,
      sourceId: puzzle.sourceId || null
    };
    return next;
  }

  async function propose(puzzle, engine) {
    if(!puzzle || !engine?.search) return {ok:false, reason:'invalid'};
    let fen;
    try { fen = Assessment.fen(puzzle); } catch(e) { return {ok:false, reason:'invalid'}; }
    const ply = Math.max(1, Array.isArray(puzzle.solution) ? puzzle.solution.length : 1);
    const chess = new Rules.Chess(fen);
    const line = [];
    for(let i = 0; i < ply; i++) {
      let result;
      try { result = await engine.search(chess.fen()); }
      catch(e) { return {ok:false, reason:'engine-failed'}; }
      const move = result?.bestmove;
      if(!move) return {ok:false, reason:'engine-failed'};
      try {
        chess.move({from:move.slice(0,2), to:move.slice(2,4), promotion:move.slice(4) || undefined});
      } catch(e) { return {ok:false, reason:'engine-failed'}; }
      line.push(move);
      if(chess.isGameOver()) break;
    }
    const previous = (puzzle.solution || []).map(m => String(m).toLowerCase());
    const unchanged = line.length === previous.length && line.every((m,i) => m === previous[i]);
    return {ok:true, unchanged, solution:line, previous};
  }

  const api = {FIX_KEY, load, save, applyToPuzzles, applyToBank, record, propose};
  if(typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.PuzzleRepair = api;
})(globalThis);
