const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const M=require('../mastery'),A=require('../assessment'),C=require('../curriculum'),Rules=require('../vendor/chess'),Repair=require('../puzzle-repair');
const source={window:{}};vm.runInNewContext(fs.readFileSync(require.resolve('../puzzles.js'),'utf8'),source);
// Genuine independent database positions, not twenty copies of one fixture.
const samples=source.window.LICHESS_PUZZLES.filter(p=>p.solution.length===1&&p.themes.includes('mateIn1')).slice(0,60);
function app(storage={},protocol='file:'){
  const nodes=new Map();
  const element=id=>{if(!nodes.has(id)){const node={textContent:'',value:'',hidden:false,disabled:false,style:{},dataset:{},children:[],classList:{add(){},remove(){},toggle(){}},appendChild(child){this.children.push(child);},setAttribute(){},addEventListener(){},querySelectorAll(){return []},insertAdjacentHTML(){}};Object.defineProperty(node,'innerHTML',{get(){return ''},set(){this.children=[]}});nodes.set(id,node);}return nodes.get(id);};
  const context=vm.createContext({ChessRules:Rules,ChessCurriculum:C,TacticalMastery:M,TacticalAssessment:A,PuzzleRepair:Repair,LocalChessEngine:require('../engine-client'),window:{LICHESS_PUZZLES:samples},location:{protocol},document:{getElementById:element,querySelectorAll:()=>[],querySelector:()=>null,createElement:()=>element(Symbol()),body:{appendChild(){},}},localStorage:{getItem:key=>storage[key]||null,setItem:(key,value)=>{storage[key]=value;}},setTimeout,clearTimeout,prompt:()=> 'Q',confirm:()=>true,console,URL:{createObjectURL:()=>'blob:fix',revokeObjectURL(){}}});
  const html=fs.readFileSync(require.resolve('../chess_exercises.html'),'utf8');
  vm.runInContext([...html.matchAll(/<script>([\s\S]*?)<\/script>/g)][0][1],context);
  vm.runInContext(fs.readFileSync(require.resolve('../training-ui.js'),'utf8'),context);
  return {run:code=>vm.runInContext(code,context),element,storage};
}
test('old 2200 rating does not unlock a step; app initializes using curriculum',()=>{
  const x=app({'chessExercises.training.v1':JSON.stringify({profile:{rating:2200,completed:999}})});
  assert.equal(x.run('selectedLevel'),1);assert.equal(x.run('masteryProfile.legacyRating'),2200);
  assert.equal(x.run('CM.unlocked(masteryProfile,2)'),false);assert.equal(x.element('levelGrid').children[1].disabled,true);
});
test('explicit assessment hides theme and guidance; board entry gets no immediate score',()=>{
  const x=app();x.run("selectedType='s1.mate';startAssessmentUI();");
  assert.equal(x.run('masteryProfile.session.slots.length'),1);
  assert.equal(x.run("masteryProfile.session.slots[0].id"),'s1.mate');
  assert.match(x.element('assessmentCounter').textContent,/Opgave 1 van 10/);
  for(const id of ['themeSelectionPanel','learningGoalsPanel','puzzleInfoPanel','themeExplainer','sourcePanel'])assert.equal(x.element(id).hidden,true);
  for(const id of ['hintButton','resetButton'])assert.equal(x.element(id).disabled,true);
  x.run("const first=currentPuzzle.solution[0];executeMove(legalCache.find(m=>sqName(m.from)+sqName(m.to)===first));");
  assert.equal(x.run('isAssessment()'),true);assert.equal(x.run("CM.state(masteryProfile,'s1.mate').history.length"),0);
  assert.equal(x.run('masteryProfile.pending.line.length'),1);
});
test('assessment requires a selected learning goal',()=>{
  const x=app();x.run('selectedType=null;startAssessmentUI();');
  assert.equal(x.run('isAssessment()'),false);
  assert.match(x.element('statusText').textContent,/Selecteer eerst een leerdoel/);
});
test('closing and reloading restores full pending variant without a skip or failure',()=>{
  const x=app();x.run("selectedType='s1.mate';startAssessmentUI();const first=currentPuzzle.solution[0];executeMove(legalCache.find(m=>sqName(m.from)+sqName(m.to)===first));");
  const id=x.run('currentPuzzle.id'),fen=x.run('gameState.fen');const y=app(x.storage);
  assert.equal(y.run('currentPuzzle.id'),id);assert.equal(y.run('gameState.fen'),fen);assert.equal(y.run("CM.state(masteryProfile,'s1.mate').history.length"),0);assert.equal(y.element('variantInput').value,x.element('variantInput').value);
});
test('submission records once without theme feedback; continuing selects an independent problem',async()=>{
  const x=app();x.run("selectedType='s1.mate';startAssessmentUI();");const first=x.run('currentPuzzle.id');
  x.element('variantInput').value=x.run("currentPuzzle.solution.join(' ')");await x.run('submitVariant()');
  assert.equal(x.run('isAssessment()'),false);assert.equal(x.run("CM.state(masteryProfile,'s1.mate').history.length"),1);
  assert.equal(x.element('learningGoalsPanel').hidden,true);assert.match(x.element('statusText').textContent,/Feedback volgt/);assert.doesNotMatch(x.element('statusText').textContent,/Mat in/);
  assert.equal(x.run("CM.state(masteryProfile,'s1.mate').history[0].correct"),true);
  await x.run('submitVariant()');assert.equal(x.run("CM.state(masteryProfile,'s1.mate').history.length"),1);
  x.run('newPuzzle();');assert.notEqual(x.run('currentPuzzle.id'),first);assert.equal(x.element('learningGoalsPanel').hidden,true);
});
test('skip is recorded as unsuccessful, storage failures still permit session training',()=>{
  const x=app();x.run("selectedType='s1.mate';startAssessmentUI();skipAssessment();");
  assert.equal(x.run("CM.state(masteryProfile,'s1.mate').history[0].outcome"),'skip');
  x.run("localStorage.setItem=()=>{throw Error('blocked');};saveTraining();");assert.equal(x.run('storageAvailable'),false);assert.match(x.element('adaptiveProgress').textContent,/Opslaan niet beschikbaar/);
});
test('repair is available in practice and blocked during assessment',async()=>{
  const x=app();
  x.run("selectedType='s1.mate';newPuzzle();");
  assert.equal(x.element('repairButton').disabled,false);
  x.run("repairEngine={search:async()=>({bestmove:currentPuzzle.solution[0].toLowerCase(),depth:16,type:'mate',value:1,bound:false})};");
  await x.run('repairPuzzle()');
  assert.match(x.element('statusText').textContent,/Niets te repareren/);
  x.run("selectedType='s1.mate';startAssessmentUI();");
  assert.equal(x.element('repairButton').disabled,true);
});
test('invalid stored mastery is backed up instead of awarding access',()=>{
  const storage={'chessExercises.mastery.v2':JSON.stringify({version:2,skills:{'s1.mate':{status:'mastered'}}})};const x=app(storage);
  assert.equal(x.run('CM.mastered(masteryProfile,"s1.mate")'),false);assert.equal(x.run('damagedProgress'),true);assert.ok(Object.keys(storage).some(k=>k.includes('.backup.')));
});
