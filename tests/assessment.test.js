const {test}=require('node:test');
const assert=require('node:assert/strict');
const A=require('../assessment'),{Chess}=require('../vendor/chess');
function puzzle(fen,solution,meta=null){const c=new Chess(fen);return {id:fen,turn:c.turn(),pieces:c.board().flat().filter(Boolean).map(p=>({sq:p.square,piece:p.color+p.type.toUpperCase()})),castling:fen.split(' ')[2],ep:null,solution,themes:[],curriculum:meta};}
const mate=puzzle('7k/5Q2/6K1/8/8/8/8/8 w - - 0 1',['f7g7']);
test('mat-in-one accepts every legal mating alternative, not just stored UCI',async()=>{
  const d=A.describe(mate);assert.equal(d.eligible,true);
  for(const uci of ['f7g7','f7h7'])assert.equal((await A.grade(d,[uci])).outcome,'correct');
  assert.equal((await A.grade(d,['f7e7'])).outcome,'wrong');
});
test('unknown curriculum classification remains training-only despite rating/depth',async()=>{
  const p=puzzle('7k/5Q2/6K1/8/8/8/8/8 w - - 0 1',['f7e7']);p.rating=2200;p.level=4;p.themes=['pin'];
  const d=A.describe(p);assert.equal(d.eligible,false);assert.equal((await A.grade(d,p.solution)).outcome,'unknown');
});
test('illegal full-line moves and wrong line length are not successful evidence',async()=>{
  const d=A.describe(mate);assert.equal((await A.grade(d,['a1a8'])).outcome,'wrong');assert.equal((await A.grade(d,[])).outcome,'wrong');
});
test('reviewed answer trees accept approved alternatives but leave unknown lines unscored',async()=>{
  const p={...mate,curriculum:{reviewed:true,reviewSource:'test-reviewed branches',skillIds:['s1.mate'],verification:{kind:'tree',defenceReviewed:true,lines:[['f7g7'],['f7h7']]}}};
  assert.equal((await A.grade(A.describe(p),['f7h7'])).outcome,'correct');assert.equal((await A.grade(A.describe(p),['f7e7'])).outcome,'unknown');
});
test('material capture is unsafe when opponent can immediately win more elsewhere',()=>{
  const p=puzzle('7k/8/8/3np3/8/8/r7/Q2RK3 w - - 0 1',['d1d5']);
  assert.equal(A.safeCapture(A.fen(p),'d1d5'),false);
  const safe=puzzle('6k1/8/8/3n4/8/8/8/3RK3 w - - 0 1',['d1d5']);
  assert.equal(A.safeCapture(A.fen(safe),'d1d5'),true);
});
test('identity includes side, castling and en-passant rights, not move counters',()=>{
  const p={...mate};const f=A.identity(p);assert.equal(f.split(' ').length,4);assert.equal(A.identity({...p,id:'renamed'}),f);
});
test('engine grading rejects a cooperative defence and excludes low-confidence results',async()=>{
  const p=puzzle('6k1/8/8/3n4/8/8/8/3RK3 w - - 0 1',['d1d5','g8f8','d5d6'],{reviewed:true,reviewSource:'test fixture: defence comparison',skillIds:['s2.defender'],verification:{kind:'engine',objective:{kind:'material',gain:2}}});
  let calls=0;const engine={compare:async()=>++calls===1?[{depth:16,type:'cp',value:500},{depth:16,type:'cp',value:500}]:[{depth:16,type:'cp',value:-500},{depth:16,type:'cp',value:-1000}]};
  assert.equal((await A.grade(A.describe(p),p.solution,engine)).outcome,'wrong');assert.equal(calls,2);
  const uncertain={compare:async()=>[{depth:11,type:'cp',value:500},{depth:11,type:'cp',value:500}]};
  assert.equal((await A.grade(A.describe(p),p.solution,uncertain)).outcome,'unknown');
});
test('positions with the opponent already in check are not eligible imported puzzles',()=>{
  const p=puzzle('7k/8/8/8/8/8/8/Q3K3 w - - 0 1',['a1a2']);assert.equal(A.describe(p),null);
});
test('a position with conflicting reviewed learning goals cannot supply independent evidence twice',()=>{
  const a={...mate,id:'one'},b={...mate,id:'two',curriculum:{reviewed:true,reviewSource:'conflicting teacher label',skillIds:['s1.defend'],verification:{kind:'mate'}}};
  const bank=A.bank([a,b]);assert.equal(bank.length,2);assert.ok(bank.every(item=>!item.eligible&&item.conflictingClassification));
});
test('safe escape accepts a check-resolving move that does not give away undefended material',async()=>{
  // King on e1 checked by rook on e8; Kd2 escapes safely. Black king on a8.
  const safe=puzzle('k3r3/8/8/8/8/8/8/4K3 w - - 0 1',['e1d2']);
  const d=A.describe(safe);
  assert.equal(d.eligible,true);
  assert.deepEqual(d.skills,['s1.escape']);
  assert.equal(d.verification.kind,'safeEscape');
  assert.equal(A.safeEscape(A.fen(safe),'e1d2'),true);
  assert.equal((await A.grade(d,['e1d2'])).outcome,'correct');
  assert.equal((await A.grade(d,['e1e2'])).outcome,'wrong');
});
test('safe escape rejects resolving check by hanging a queen',()=>{
  // King on e1 checked by rook on e8; Qd2-e2 blocks but hangs the queen.
  const hang=puzzle('k3r3/8/8/8/8/8/3Q4/4K3 w - - 0 1',['d2e2']);
  assert.equal(A.safeEscape(A.fen(hang),'d2e2'),false);
  assert.equal(A.describe(hang).eligible,false);
});
test('bank scopes a one-ply safe escape from a longer line that starts in check',()=>{
  const multi=puzzle('k3r3/8/8/8/8/8/8/4K3 w - - 0 1',['e1d2','e8e2']);
  multi.id='escape_multi';
  const bank=A.bank([multi]);
  const scoped=bank.find(b=>b.puzzle.id==='escape_multi_escape');
  assert.ok(scoped);
  assert.equal(scoped.eligible,true);
  assert.deepEqual(scoped.skills,['s1.escape']);
});
