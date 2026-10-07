const {test}=require('node:test');
const assert=require('node:assert/strict');
const M=require('../mastery'),C=require('../curriculum');
const item=(id,skill,position=id,eligible=true)=>({puzzle:{id,solution:['a1a2']},position,skills:[skill],candidates:[skill],eligible});
const pool=(skill,count=70)=>Array.from({length:count},(_,i)=>item(`${skill}-${i}`,skill));
function complete(p,bank,id,start=0,wrong=0){
  assert.equal(M.start(p,bank,id,start).ok,true);
  for(let i=0;i<10;i++){M.answer(p,i<wrong?'wrong':'correct',start+i+1);if(i<9)assert.equal(M.next(p,bank,id,start+i+1).ok,true);}
  assert.equal(M.start(p,bank,id,start+10+M.DAY).ok,true);
  for(let i=0;i<10;i++){M.answer(p,'correct',start+M.DAY+11+i);if(i<9)assert.equal(M.next(p,bank,id,start+M.DAY+11+i).ok,true);}
}
test('rating migration grants no skill and cannot unlock higher steps',()=>{
  const p=M.create({rating:2200,completed:1000,themes:{pin:{total:100,count:100}}});
  assert.equal(M.activeStep(p),1);assert.equal(M.unlocked(p,2),false);assert.equal(M.choosePractice(p,[item('higher','s4.defender')]),null);
});
test('18/20 over two timed sets awards one skill; an average cannot cover missing goals',()=>{
  const p=M.create(),b=pool('s1.mate');complete(p,b,'s1.mate',100,2);
  assert.equal(M.mastered(p,'s1.mate'),true);assert.equal(M.unlocked(p,2),false);assert.equal(M.valid(JSON.parse(JSON.stringify(p))),true);
});
test('a second series cannot start early, including after JSON restore',()=>{
  let p=M.create();const b=pool('s1.mate');M.start(p,b,'s1.mate',0);
  for(let i=0;i<10;i++){M.answer(p,'correct',i);if(i<9)M.next(p,b,'s1.mate',i);}
  p=JSON.parse(JSON.stringify(p));
  assert.equal(M.start(p,b,'s1.mate',M.DAY+8).reason,'waiting');
  assert.equal(M.start(p,b,'s1.mate',M.DAY+9).ok,true);
});
test('17/20 fails and a retry consumes different IDs and positions',()=>{
  const p=M.create(),b=pool('s1.mate');complete(p,b,'s1.mate',0,3);
  assert.equal(M.mastered(p,'s1.mate'),false);const previous=p.skills['s1.mate'].cycle.answers.map(a=>a.position);
  assert.equal(M.start(p,b,'s1.mate',M.DAY*2).ok,true);assert.ok(!previous.includes(p.pending.position));
});
test('skips fail; unknown grading is excluded, flagged, and replaced',()=>{
  const p=M.create(),b=pool('s1.mate');M.start(p,b,'s1.mate');const id=p.pending.puzzle.id;
  M.answer(p,'unknown');assert.equal(p.skills['s1.mate'].cycle.answers.length,0);assert.equal(p.reviewQueue.length,1);
  M.next(p,b,'s1.mate');assert.notEqual(p.pending.puzzle.id,id);M.answer(p,'skip');assert.equal(p.skills['s1.mate'].history[0].correct,false);
});
test('independent evidence deduplicates renamed positions and excludes practice/diagnosis',()=>{
  const p=M.create(),b=pool('s1.mate',20);b.push(item('renamed','s1.mate',b[0].position));
  assert.equal(M.fresh(p,b,'s1.mate').length,20);p.exposure.positions[b[0].position]='practice';
  assert.equal(M.start(p,b,'s1.mate').reason,'insufficient');assert.equal(M.mastered(p,'s1.mate'),false);
});
test('practice protects the assessment reserve and never broadens to another step',()=>{
  const p=M.create(),b=pool('s1.mate',20);b.push(item('wrong-step','s4.kingattack'));
  assert.equal(M.choosePractice(p,b,'s1.mate',()=>0.5),null);
  b.push(item('training-only','s1.mate','training',false));const selected=M.choosePractice(p,b,'s1.mate',()=>0.5);
  assert.equal(selected.item.puzzle.id,'training-only');assert.equal(M.fresh(p,b,'s1.mate').length,20);
});
test('maintenance decay retrains only the missing skill and preserves others',()=>{
  const p=M.create(),b=[...pool('s1.mate'),...pool('s1.capture')];complete(p,b,'s1.mate');complete(p,b,'s1.capture');
  M.start(p,b,'s1.mate',M.DAY*3,'maintenance');
  for(let i=0;i<3;i++){const result=M.answer(p,'wrong',M.DAY*3+i);if(i<2)M.next(p,b,'s1.mate');else assert.equal(result.state,'remediation');}
  assert.equal(M.state(p,'s1.mate').status,'remediation');assert.equal(M.mastered(p,'s1.capture'),true);
  assert.equal(M.target(p,'s2.mate'),'s1.mate');assert.equal(M.start(p,b,'s2.mate').reason,'locked');
});
test('placement is only advice and does not consume the twenty reserved assessments',()=>{
  const p=M.create(),b=pool('s1.mate',21);assert.equal(M.diagnose(p,b).ok,true);M.answer(p,'wrong');
  assert.equal(M.fresh(p,b,'s1.mate').length,20);assert.equal(M.mastered(p,'s1.mate'),false);assert.deepEqual(p.diagnostic.recommendations,['s1.mate']);
});
test('pending full line survives serialization and bad status/skill data is rejected',()=>{
  const p=M.create(),b=pool('s1.mate');M.start(p,b,'s1.mate');p.pending.line=['a1a2'];
  const restored=JSON.parse(JSON.stringify(p));assert.equal(M.valid(restored),true);assert.deepEqual(restored.pending.line,['a1a2']);
  restored.skills['s1.mate'].status='mastered';assert.equal(M.valid(restored),false);
});
test('curriculum graph is acyclic and does not confuse rating with step',()=>{
  const visiting=new Set(),done=new Set();function visit(id){assert.ok(C.byId[id]);assert.ok(!visiting.has(id),id);if(done.has(id))return;visiting.add(id);for(const k of C.byId[id].prerequisites)visit(k);visiting.delete(id);done.add(id);}
  C.skills.forEach(s=>visit(s.id));assert.equal(C.byId['s2.pin'].ply,3);assert.equal(C.byId['s3.pinned'].ply,3);assert.equal(C.byId['s4.pinattraction'].ply,5);
});
test('mixed sessions collect independent evidence per goal and wait 24h for each second set',()=>{
  const p=M.create(),b=[...pool('s1.mate'),...pool('s1.capture')];
  let now=100;
  assert.equal(M.startSession(p,b,1,now,()=>0).ok,true);
  const seen=new Set();
  while(p.pending){assert.ok(!seen.has(p.pending.position));seen.add(p.pending.position);M.answer(p,'correct',++now);if(p.session.state==='active')assert.equal(M.nextSession(p,b,now,()=>0.9).ok,true);}
  assert.equal(p.session.results.length,20);assert.equal(M.mastered(p,'s1.mate'),false);assert.equal(M.startSession(p,b,1,now).reason,'waiting');
  now+=M.DAY;assert.equal(M.startSession(p,b,1,now,()=>0).ok,true);
  while(p.pending){M.answer(p,'correct',++now);if(p.session.state==='active')assert.equal(M.nextSession(p,b,now,()=>0).ok,true);}
  assert.equal(M.mastered(p,'s1.mate'),true);assert.equal(M.mastered(p,'s1.capture'),true);assert.equal(M.unlocked(p,2),false);
});
test('a focused session covers only the selected leerdoel',()=>{
  const p=M.create(),b=[...pool('s1.mate'),...pool('s1.capture')];
  let now=100;
  assert.equal(M.startSession(p,b,1,now,()=>0,'s1.mate').ok,true);
  assert.deepEqual(p.session.slots.map(s=>s.id),['s1.mate']);
  assert.equal(p.session.slots[0].quota,10);
  while(p.pending){M.answer(p,'correct',++now);if(p.session.state==='active')assert.equal(M.nextSession(p,b,now,()=>0).ok,true);}
  assert.equal(p.session.results.length,10);
  assert.equal(p.session.results.every(r=>r.skillId==='s1.mate'),true);
  assert.equal(M.state(p,'s1.mate').cycle.state,'waiting');
  assert.equal(M.state(p,'s1.capture').cycle,null);
});
test('a higher-skill relapse schedules prerequisite checks before recertifying that skill',()=>{
  const p=M.create();let b=[];for(const s of C.stepSkills(1)){b.push(...pool(s.id));complete(p,b,s.id);}
  b.push(...pool('s2.pin'));complete(p,b,'s2.pin');
  M.start(p,b,'s2.pin',M.DAY*3,'maintenance');for(let i=0;i<3;i++){M.answer(p,'wrong');if(i<2)M.next(p,b,'s2.pin');}
  assert.deepEqual(M.prerequisiteChecks(p),['s1.capture','s1.defend']);
  assert.equal(M.start(p,b,'s2.pin',M.DAY*4).reason,'prerequisites-check');
  M.startSession(p,b,2,M.DAY*4,()=>0);assert.equal(p.pending.skillId,'s1.capture');
  assert.equal(M.mastered(p,'s1.mate'),true);
});
test('mastering every required stap-1 leerdoel unlocks stap 2',()=>{
  const p=M.create();let b=[];
  for(const s of C.stepSkills(1)){b.push(...pool(s.id));complete(p,b,s.id);}
  assert.ok(C.stepSkills(1).every(s=>M.mastered(p,s.id)));
  assert.equal(M.unlocked(p,2),true);
  assert.equal(M.activeStep(p),2);
});
test('malformed saved sessions and incomplete mastery proofs are rejected',()=>{
  const p=M.create();p.session={state:'active'};assert.equal(M.valid(p),false);
  p.session=null;p.skills['s1.mate']={status:'mastered',practice:0,practiceScore:0,history:[],cycle:null,proof:{count:20}};
  assert.equal(M.valid(p),false);
});
test('toetsaanbod requires ten correct practice scores before readiness',()=>{
  const p=M.create(),b=pool('s1.mate');
  for(let i=0;i<9;i++)M.practiceResult(p,'s1.mate',1);
  assert.equal(M.assessmentReady(p,b,'s1.mate'),null);
  M.practiceResult(p,'s1.mate',1);
  assert.equal(M.assessmentReady(p,b,'s1.mate')?.kind,'mastery');
  assert.equal(M.computeOffer(p,b)?.skillId,'s1.mate');
});
test('deferOffer makes toetsaanbod secondary until twenty-four hours pass',()=>{
  const p=M.create(),b=pool('s1.mate');
  for(let i=0;i<10;i++)M.practiceResult(p,'s1.mate',1);
  M.refreshOffer(p,b,100);
  assert.equal(M.offerProminence(p.assessmentOffer,100),'primary');
  M.deferOffer(p,200);
  assert.equal(M.offerProminence(p.assessmentOffer,200),'secondary');
  assert.equal(M.offerProminence(p.assessmentOffer,200+M.DAY-1),'secondary');
  assert.equal(M.offerProminence(p.assessmentOffer,200+M.DAY),'primary');
});
test('acceptOffer starts a session and clears the toetsaanbod',()=>{
  const p=M.create(),b=pool('s1.mate');
  for(let i=0;i<10;i++)M.practiceResult(p,'s1.mate',1);
  M.refreshOffer(p,b,100);
  assert.ok(p.assessmentOffer);
  assert.equal(M.acceptOffer(p,b,100,()=>0).ok,true);
  assert.equal(p.assessmentOffer,null);
  assert.equal(p.session.state,'active');
  assert.ok(p.pending);
});
test('computeOffer skips while pending or an active session exists',()=>{
  const p=M.create(),b=pool('s1.mate');
  for(let i=0;i<10;i++)M.practiceResult(p,'s1.mate',1);
  M.start(p,b,'s1.mate',100);
  assert.equal(M.computeOffer(p,b,100),null);
});
