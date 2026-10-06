const {test}=require('node:test');
const assert=require('node:assert/strict');
const Repair=require('../puzzle-repair');
const A=require('../assessment');

const mate={
  id:'repair_mate',
  turn:'w',
  pieces:[{sq:'f7',piece:'wQ'},{sq:'g6',piece:'wK'},{sq:'h8',piece:'bK'}],
  solution:['f7g7']
};

test('propose keeps a matching engine line and reports nothing to repair',async()=>{
  const engine={search:async()=>({bestmove:'f7g7',depth:16,type:'mate',value:1,bound:false})};
  const result=await Repair.propose(mate,engine);
  assert.equal(result.ok,true);
  assert.equal(result.unchanged,true);
  assert.deepEqual(result.solution,['f7g7']);
});

test('propose offers a different engine line as replacement',async()=>{
  const engine={search:async()=>({bestmove:'f7h7',depth:16,type:'mate',value:1,bound:false})};
  const result=await Repair.propose(mate,engine);
  assert.equal(result.ok,true);
  assert.equal(result.unchanged,false);
  assert.deepEqual(result.solution,['f7h7']);
  assert.deepEqual(result.previous,['f7g7']);
});

test('recorded fixes patch puzzles and bank items permanently in-memory',()=>{
  const broken={...mate,solution:['a2a3']};
  const fixes=Repair.record({},broken,['f7g7'],100);
  assert.deepEqual(Repair.applyToPuzzles([broken],fixes)[0].solution,['f7g7']);
  const bank=A.bank(Repair.applyToPuzzles([broken],fixes));
  assert.equal(bank[0].eligible,true);
  assert.deepEqual(bank[0].puzzle.solution,['f7g7']);
  const storage={};
  assert.equal(Repair.save(fixes,{setItem:(k,v)=>{storage[k]=v;}}),true);
  assert.deepEqual(Repair.load({getItem:k=>storage[k]}).repair_mate.solution,['f7g7']);
});

test('engine failure yields a repairable-failed result without mutating storage',async()=>{
  const engine={search:async()=>({bestmove:null})};
  const result=await Repair.propose(mate,engine);
  assert.equal(result.ok,false);
  assert.equal(result.reason,'engine-failed');
});
