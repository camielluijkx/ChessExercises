(function(root) {
  const C = typeof module !== 'undefined' && module.exports ? require('./curriculum.js') : root.ChessCurriculum;
  const Rules = typeof module !== 'undefined' && module.exports ? require('./vendor/chess.js') : root.ChessRules;
  const value = {p:1,n:3,b:3,r:5,q:9,k:0};
  function fen(p) {
    const board = Array(64).fill(null);
    if(!Array.isArray(p.pieces) || !['w','b'].includes(p.turn)) throw Error('Invalid puzzle');
    for(const piece of p.pieces) {
      if(!/^[a-h][1-8]$/.test(piece.sq) || !/^[wb][KQRBNP]$/.test(piece.piece)) throw Error('Invalid piece');
      const index = (Number(piece.sq[1])-1)*8 + piece.sq.charCodeAt(0)-97;
      if(board[index]) throw Error('Duplicate square');
      board[index] = piece.piece;
    }
    const rows = [];
    for(let rank=7;rank>=0;rank--) {
      let row='',gap=0;
      for(let file=0;file<8;file++) {
        const pc=board[rank*8+file];
        if(!pc) gap++;
        else {if(gap) row+=gap;gap=0;row+=pc[0]==='w'?pc[1]:pc[1].toLowerCase();}
      }
      if(gap) row+=gap; rows.push(row);
    }
    return new Rules.Chess(`${rows.join('/')} ${p.turn} ${p.castling || '-'} ${p.ep || '-'} 0 1`).fen();
  }
  function identity(p) { return fen(p).split(' ').slice(0,4).join(' '); }
  function play(chess,uci) {
    if(!/^[a-h][1-8][a-h][1-8][qrbn]?$/i.test(uci)) throw Error('Invalid move');
    return chess.move({from:uci.slice(0,2),to:uci.slice(2,4),promotion:uci.slice(4).toLowerCase() || undefined});
  }
  function material(chess,color) { return chess.board().flat().filter(Boolean).reduce((n,p) => n+(p.color===color?1:-1)*value[p.type],0); }
  // A deliberately narrow, exact elementary objective: capture an undefended
  // piece, don't expose the capturing piece, and don't permit immediate mate.
  function safeCapture(start,uci) {
    const chess = new Rules.Chess(start), color=chess.turn(), baseline=material(chess,chess.turn());
    const move=play(chess,uci);
    if(!move.captured || move.promotion || chess.isAttacked(move.to,chess.turn())) return false;
    for(const reply of chess.moves({verbose:true})) {
      chess.move(reply);
      const unsafe=chess.isCheckmate() || material(chess,color)<=baseline; chess.undo();
      if(unsafe) return false;
    }
    return material(chess,color) > material(new Rules.Chess(start),color);
  }
  // Escape check in one ply without giving away material or walking into mate.
  // See docs/adr/0001-auto-escape-safe-escape.md.
  function safeEscape(start,uci) {
    const chess = new Rules.Chess(start), color=chess.turn(), baseline=material(chess,color);
    if(!chess.isCheck()) return false;
    try { play(chess,uci); } catch(e) { return false; }
    if(chess.isCheck()) return false;
    for(const reply of chess.moves({verbose:true})) {
      chess.move(reply);
      const unsafe=chess.isCheckmate() || material(chess,color)<baseline; chess.undo();
      if(unsafe) return false;
    }
    return true;
  }
  function describe(p) {
    try {
      if(typeof p.id !== 'string' || !p.id || !Array.isArray(p.solution) || !p.solution.length || p.solution.length > 15) return null;
      const initial=fen(p), chess=new Rules.Chess(initial);
      const enemy=chess.turn()==='w'?'b':'w';
      const enemyKing=chess.board().flat().find(pc=>pc?.color===enemy&&pc.type==='k');
      if(!enemyKing || chess.isAttacked(enemyKing.square,chess.turn()))return null;
      for(const uci of p.solution) play(chess,uci);
      const candidates=C.candidates(p);
      let skills=[],eligible=false,verification=null;
      if(p.solution.length===1 && chess.isCheckmate() && !new Rules.Chess(initial).isCheck()) {
        skills=['s1.mate']; eligible=true; verification={kind:'mate',ply:1};
      } else if(p.solution.length===1 && (p.themes||[]).includes('hangingPiece') && !new Rules.Chess(initial).isCheck() && safeCapture(initial,p.solution[0])) {
        skills=['s1.capture']; eligible=true; verification={kind:'safeCapture',ply:1};
      } else if(p.solution.length===1 && new Rules.Chess(initial).isCheck() && safeEscape(initial,p.solution[0])) {
        skills=['s1.escape']; eligible=true; verification={kind:'safeEscape',ply:1};
      }
      const meta=p.curriculum;
      if(meta?.reviewed === true && typeof meta.reviewSource==='string' && meta.reviewSource && Array.isArray(meta.skillIds) && meta.skillIds.length && meta.skillIds.every(id => C.byId[id])) {
        const compatible=meta.skillIds.every(id => C.byId[id].ply===p.solution.length || (typeof meta.depthException==='string' && meta.depthException.trim().length>10));
        const v=meta.verification;
        const supported=v && (v.kind==='mate' || v.kind==='safeCapture' || v.kind==='safeEscape' || (v.kind==='engine' && ['mate','material'].includes(v.objective?.kind)) || (v.kind==='tree' && v.defenceReviewed===true && Array.isArray(v.lines) && v.lines.length));
        if(compatible && supported && (v.kind!=='safeCapture' && v.kind!=='safeEscape' || p.solution.length===1) && (v.kind!=='mate' || (chess.isCheckmate() && chess.turn()!==p.turn))) { skills=meta.skillIds; verification=v; eligible=true; }
      }
      return {puzzle:p,position:identity(p),fen:initial,candidates,skills,eligible,verification};
    } catch(e) { return null; }
  }
  function bank(puzzles) {
    const result=[];
    for(const puzzle of puzzles) {
      const original=describe(puzzle);
      if(!original)continue;
      result.push(original);
      // Lichess often appends replies after an elementary undefended capture.
      // Scope a separate one-ply learning goal, not a shorter solution to the
      // original tactical problem. Position identity prevents double evidence.
      if(puzzle.solution.length>1 && (puzzle.themes||[]).includes('hangingPiece')) {
        const initial=new Rules.Chess(original.fen);
        try {
          const leaf=new Rules.Chess(original.fen);play(leaf,puzzle.solution[0]);
          if(!initial.isCheck() && !leaf.isCheckmate() && safeCapture(original.fen,puzzle.solution[0])) {
            const scoped={...puzzle,id:puzzle.id+'_capture',sourceId:puzzle.id,solution:[puzzle.solution[0]],candidateIds:['s1.capture'],level:1,type:'winst_materiaal'};
            delete scoped.curriculum;
            const item=describe(scoped);if(item?.eligible)result.push(item);
          }
        } catch(e) { /* uncertain positions remain original training candidates */ }
      }
      if(puzzle.solution.length>1) {
        try {
          const initial=new Rules.Chess(original.fen);
          if(initial.isCheck() && safeEscape(original.fen,puzzle.solution[0])) {
            const scoped={...puzzle,id:puzzle.id+'_escape',sourceId:puzzle.id,solution:[puzzle.solution[0]],candidateIds:['s1.escape'],level:1,type:'schaak_opheffen'};
            delete scoped.curriculum;
            const item=describe(scoped);if(item?.eligible)result.push(item);
          }
        } catch(e) { /* uncertain positions remain original training candidates */ }
      }
    }
    const owners=new Map();
    for(const item of result.filter(b=>b.eligible)){if(!owners.has(item.position))owners.set(item.position,new Set());item.skills.forEach(id=>owners.get(item.position).add(id));}
    for(const item of result){if((owners.get(item.position)?.size||0)>1){item.eligible=false;item.conflictingClassification=true;}}
    return result.sort((a,b)=>a.puzzle.id.localeCompare(b.puzzle.id));
  }
  function exactMate(chess,ply,learner,budget) {
    if(--budget.left < 0) return null;
    if(chess.isCheckmate()) return chess.turn() !== learner ? 0 : null;
    if(ply===0 || chess.isStalemate()) return Infinity;
    const defending=chess.turn()!==learner;
    let distance=defending?0:Infinity;
    for(const move of chess.moves({verbose:true})) {
      chess.move(move);const d=exactMate(chess,ply-1,learner,budget);chess.undo();
      if(d===null) return null;
      if(defending && d===Infinity) return Infinity;
      if(!defending && d===Infinity) continue;
      distance=defending?Math.max(distance,1+d):Math.min(distance,1+d);
      if(!defending && distance===1) return 1;
    }
    return distance;
  }
  async function grade(item,line,engine=null) {
    const unknown=reason=>({outcome:'unknown',reason});
    if(!item?.eligible || !item.verification) return unknown('unverified');
    if(!Array.isArray(line) || line.length!==item.puzzle.solution.length) return {outcome:'wrong',reason:'length'};
    const chess=new Rules.Chess(item.fen), learner=chess.turn(), v=item.verification;
    if(v.kind==='safeCapture') {
      try {return {outcome:safeCapture(item.fen,line[0])?'correct':'wrong',reason:'safeCapture'};} catch(e) {return {outcome:'wrong',reason:'illegal'};}
    }
    if(v.kind==='safeEscape') {
      try {return {outcome:safeEscape(item.fen,line[0])?'correct':'wrong',reason:'safeEscape'};} catch(e) {return {outcome:'wrong',reason:'illegal'};}
    }
    if(v.kind==='tree') {
      try {line.forEach(m=>play(chess,m));}catch(e){return {outcome:'wrong',reason:'illegal'};}
      return v.lines.some(l=>Array.isArray(l)&&l.map(m=>m.toLowerCase()).join(' ')===line.join(' ')) ? {outcome:'correct',reason:'reviewed-tree'} : unknown('alternative');
    }
    if(v.kind==='mate') {
      // Exact minimax on short forced-mate problems. A branch has to retain
      // optimal resistance; a cooperative defender must not shorten the mate.
      if(line.length > 5) return unknown('search-limit');
      const budget={left:100000};
      for(let i=0;i<line.length;i++) {
        const before=exactMate(chess,line.length-i,learner,budget);
        if(before===null) return unknown('search-limit');
        if(before===Infinity) return unknown('unproven-mate');
        try{play(chess,line[i]);}catch(e){return {outcome:'wrong',reason:'illegal'};}
        const after=exactMate(chess,line.length-i-1,learner,budget);
        if(after===null) return unknown('search-limit');
        if(after===Infinity || before!==after+1) return {outcome:'wrong',reason:'defence-or-move'};
      }
      return {outcome:chess.isCheckmate() && chess.turn()!==learner?'correct':'wrong',reason:'mate'};
    }
    if(v.kind==='engine') {
      if(!engine) return unknown('engine-unavailable');
      const initialMaterial=material(chess,learner);
      try {
        for(const uci of line) {
          const initial=chess.fen();
          // Check legality before giving input to UCI.
          play(chess,uci);
          const [best,chosen]=await engine.compare(initial,uci);
          if(!best || !chosen || best.depth<12 || chosen.depth<12 || best.bound || chosen.bound) return unknown('engine-confidence');
          if(best.type!==chosen.type) return unknown('engine-disagreement');
          if(best.type==='mate') {
            if(best.value!==chosen.value) return best.value>0 && chosen.value<=0 ? {outcome:'wrong',reason:'lost-mate'} : unknown('mate-distance');
          } else {
            const loss=best.value-chosen.value;
            if(loss>80) return {outcome:'wrong',reason:'defence-or-move'};
            if(loss>20 || loss < -20) return unknown('engine-confidence');
          }
        }
        if(v.objective.kind==='mate') return {outcome:chess.isCheckmate() && chess.turn()!==learner?'correct':'wrong',reason:'mate'};
        if(v.objective.kind==='material') {
          if(!Number.isFinite(v.objective.gain) || v.objective.gain<=0) return unknown('objective');
          return {outcome:material(chess,learner)-initialMaterial>=v.objective.gain?'correct':'wrong',reason:'material'};
        }
      } catch(e) {return unknown('engine-unavailable');}
    }
    return unknown('unsupported');
  }
  const api={fen,identity,play,material,safeCapture,safeEscape,describe,bank,grade,exactMate};
  if(typeof module !== 'undefined' && module.exports) module.exports=api;
  else root.TacticalAssessment=api;
})(globalThis);
