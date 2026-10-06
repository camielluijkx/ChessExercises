// UI adapter: learning/assessment transitions are owned by mastery.js.
const CM = TacticalMastery;
const CA = TacticalAssessment;
const CC = ChessCurriculum;
const CR = PuzzleRepair;
const PROFILE_KEY = 'chessExercises.mastery.v2';
let storageAvailable = true;
let damagedProgress = false;
let masteryProfile;
let currentItem = null;
let gradingWorker = null;
let lastTestResult = null;
let bankCache = null;
let bankSource = null;
let bankFixesStamp = -1;
let puzzleFixes = CR.load(localStorage);
let repairEngine = null;
let repairBusy = false;
const MT = {
  nl:{answerRecorded:'Antwoord geregistreerd. Feedback volgt na deze toetsreeks.',sessionResults:'Resultaten van de toetsreeks',tacticalProgress:'Tactische voortgang',scope:'Alleen gedekte tactische vaardigheden; geen volledig Stappendiploma.',startAssessment:'Start beheersingstoets',startDiagnostic:'Start instaptoets',testRules:'Per leerdoel: 20 ongeziene opgaven in twee reeksen van 10, minimaal 24 uur ertussen. Minstens 18 zelfstandig correct. Selecteer een leerdoel en start de toets voor dat onderdeel. Voer de volledige variant in vóór feedback.',selectGoal:'Selecteer eerst een leerdoel.',problem:'Opgave',of:'van',repair:'Repareren',repairing:'Engine controleert de oplossing…',nothingToRepair:'Niets te repareren: de opgeslagen oplossing komt overeen met de engine.',confirmRepair:'De engine stelt een andere oplossing voor. Overnemen als permanente vervanging? (lokaal actief + downloadbare patch)',repairApplied:'Oplossing vervangen. Patch gedownload; lokaal meteen actief.',repairFailed:'Reparatie mislukt: engine niet beschikbaar of stelling ongeldig.',repairNeedPuzzle:'Laad eerst een puzzel om te repareren.',learningGoals:'Leerdoelen',variantLabel:'Volledige variant — voer beide kleuren op het bord in, of gebruik UCI-notatie',submitVariant:'Variant indienen',undoVariant:'Laatste invoer verwijderen',skipAssessment:'Ik weet het niet',learning:'Nog te beheersen',mastered:'Beheerst',remediation:'Gerichte herhaling nodig',insufficient:'Nog onvoldoende toetsmateriaal',fresh:'ongeziene toetsopgaven',practice:'Oefenen',waiting:'Tweede reeks beschikbaar vanaf',locked:'Beheers eerst de vereiste basisvaardigheden.',pending:'Hervat eerst de openstaande toetsopgave.',sessionOnly:'Opslaan niet beschikbaar: voortgang blijft alleen in deze sessie.',damaged:'Opgeslagen voortgang was beschadigd. Een kopie is bewaard; beheersing is opnieuw gestart.',test:'Toets',diagnostic:'Instaptoets — bepaalt oefenadvies, geen vrijstelling.',blind:'Thema verborgen. Voer ook de tegenzetten in; er volgt pas feedback na indiening.',entered:'halve zetten ingevoerd',submitted:'Variant wordt beoordeeld…',unknown:'Deze opgave is niet betrouwbaar beoordeelbaar en telt niet mee. Ze is gemarkeerd voor controle; de volgende opgave vervangt haar.',pass:'Onderdeel beheerst.',fail:'Nog niet beheerst. Oefen gericht en start daarna een nieuwe toets met andere opgaven.',firstDone:'Eerste reeks afgerond. De tweede reeks volgt na minimaal 24 uur.',maintenanceDone:'Onderhoudstoets afgerond.',decay:'Terugval gevonden. Train dit onderdeel opnieuw; andere bewezen onderdelen blijven behouden.',correctAnswer:'Zelfstandig correct.',wrongAnswer:'Niet zelfstandig opgelost.',nextTest:'Volgende toetsopgave',resume:'Hervat toets',noPractice:'Geen geschikt oefenmateriaal voor dit leerdoel. De onafhankelijke toetsvoorraad blijft gereserveerd.',candidate:'Deze oefening heeft een voorlopige leerdoelindeling en telt niet voor beheersing.',maintenance:'Herhaling van eerder beheerste stof.',basic:'Eerst trainen we de ontbrekende basisvaardigheid:',noDiagnostic:'Geen extra gecontroleerde instapopgaven beschikbaar. De twintig opgaven voor beheersing blijven gereserveerd.',diagnosticDone:'Instapadvies opgeslagen. Beheersing moet nog afzonderlijk worden aangetoond.',testFinished:'Toets afgerond. Bekijk je leerdoelen en oefenadvies.',useAssessment:'Start de volgende reeks via Start beheersingstoets.',rulesOnly:'Beoordeling volgt pas na de volledige variant.',replacement:'Vervangende toetsopgave',storageResume:'Een toetsopgave is hervat, inclusief je ingevoerde variant.',practiceRating:'Moeilijkheidsvoorkeur (optionele puzzelrating)',ratingHelp:'Bepaalt alleen moeilijkheid binnen de toegestane leerstof; verleent geen vrijstelling.',outline:'Voorlopig tactisch raamwerk; dekking nog niet volledig gecontroleerd.',source:'Bron',score:'zelfstandig correct',sequence:'Reeks',reviewed:'gecontroleerde toetsopgaven',requested:'Beheersing van andere onderdelen blijft behouden.'},
  en:{answerRecorded:'Answer recorded. Feedback follows this assessment set.',sessionResults:'Assessment set results',tacticalProgress:'Tactical progress',scope:'Covered tactical skills only; not a complete Steps diploma.',startAssessment:'Start mastery assessment',startDiagnostic:'Start placement screen',testRules:'Per goal: 20 unseen problems in two sets of 10, at least 24 hours apart. At least 18 independently correct. Select a learning goal and start the assessment for that skill. Enter the full line before feedback.',selectGoal:'Select a learning goal first.',problem:'Problem',of:'of',repair:'Repair',repairing:'Engine is checking the solution…',nothingToRepair:'Nothing to repair: the stored solution matches the engine.',confirmRepair:'The engine proposes a different solution. Replace it permanently? (active locally + downloadable patch)',repairApplied:'Solution replaced. Patch downloaded; active locally now.',repairFailed:'Repair failed: engine unavailable or invalid position.',repairNeedPuzzle:'Load a puzzle before repairing.',learningGoals:'Learning goals',variantLabel:'Full line — play both colours on the board, or enter UCI notation',submitVariant:'Submit line',undoVariant:'Remove last entry',skipAssessment:"I don't know",learning:'Not yet mastered',mastered:'Mastered',remediation:'Targeted practice needed',insufficient:'Insufficient assessment material',fresh:'unseen assessment problems',practice:'Practice',waiting:'Second set available from',locked:'First master the required basic skills.',pending:'Resume the outstanding assessment problem first.',sessionOnly:'Storage unavailable: progress lasts only for this session.',damaged:'Saved progress was damaged. A backup was retained; mastery has restarted.',test:'Assessment',diagnostic:'Placement screen — practice advice, no exemption.',blind:'Theme hidden. Enter the replies too; feedback follows submission.',entered:'half-moves entered',submitted:'Checking your full line…',unknown:'This problem cannot be graded reliably and does not count. It is flagged for review; the next problem replaces it.',pass:'Skill mastered.',fail:'Not yet mastered. Practise this skill, then take a new assessment with different problems.',firstDone:'First set completed. The second set follows after at least 24 hours.',maintenanceDone:'Maintenance assessment completed.',decay:'A gap was found. Retrain this skill; other proven skills remain mastered.',correctAnswer:'Independently correct.',wrongAnswer:'Not independently solved.',nextTest:'Next assessment problem',resume:'Resume assessment',noPractice:'No suitable practice material for this goal. Independent assessment items remain reserved.',candidate:'This practice problem has a provisional learning-goal classification and does not count toward mastery.',maintenance:'Review of previously mastered skills.',basic:'First practise the missing basic skill:',noDiagnostic:'No extra verified placement problems available. Twenty mastery problems remain reserved.',diagnosticDone:'Placement advice saved. Mastery still needs separate evidence.',testFinished:'Assessment complete. Review your goals and practice advice.',useAssessment:'Start the next set with Start mastery assessment.',rulesOnly:'Grading follows the full submitted line.',replacement:'Replacement assessment problem',storageResume:'An assessment problem was resumed, including your entered line.',practiceRating:'Difficulty preference (optional puzzle rating)',ratingHelp:'Only selects difficulty inside the permitted curriculum; gives no exemption.',outline:'Provisional tactical outline; coverage not fully reviewed.',source:'Source',score:'independently correct',sequence:'Set',reviewed:'verified assessment problems',requested:'Mastery of other skills is preserved.'}
};
function mt(key){return MT[lang][key] || key;}
function label(id){return CC.byId[id]?.label[lang] || id;}
function setPracticeRating(value){if(isTestingSession())return;const rating=Number(value);masteryProfile.practiceRating=value!==''&&Number.isFinite(rating)&&rating>=400&&rating<=4000?rating:null;saveTraining();}
function isTestingSession(){return isAssessment() || masteryProfile?.session?.state==='active';}
function isAssessment(){return Boolean(masteryProfile?.pending);}
function saveTraining(){
  try{localStorage.setItem(PROFILE_KEY,JSON.stringify(masteryProfile));}catch(e){storageAvailable=false;}
  updateTraining();
}
function getBank(){
  const data=sourceMode==='config'?configPuzzles:allPuzzles();
  const stamp=Object.keys(puzzleFixes).length;
  if(data!==bankSource || stamp!==bankFixesStamp){
    bankSource=data;bankFixesStamp=stamp;
    bankCache=CR.applyToBank(CA.bank(CR.applyToPuzzles(data,puzzleFixes)),puzzleFixes);
  }
  return bankCache;
}
function updateTraining(){
  document.querySelectorAll('[data-m]').forEach(el=>{el.textContent=mt(el.getAttribute('data-m'));});
  const step=CM.activeStep(masteryProfile), skills=CC.stepSkills(step);
  document.getElementById('adaptiveProgress').textContent=`${T[lang].levelNames[step]} · ${skills.filter(s=>CM.mastered(masteryProfile,s.id)).length}/${skills.length} ${mt('mastered').toLowerCase()}`+(storageAvailable?'':` · ${mt('sessionOnly')}`)+(damagedProgress?` · ${mt('damaged')}`:'');
  const active=isTestingSession();
  document.getElementById('assessmentNotice').hidden=active;
  for(const id of ['themeSelectionPanel','learningGoalsPanel','puzzleInfoPanel','themeExplainer','sourcePanel']) document.getElementById(id).hidden=active;
  document.getElementById('assessmentControls').hidden=!isAssessment();
  document.getElementById('practiceRating').value=masteryProfile.practiceRating ?? '';
  document.getElementById('practiceRating').disabled=active;
  for(const id of ['hintButton','resetButton','repairButton','startAssessment','startDiagnostic','srcRandom','srcConfig']) document.getElementById(id).disabled=active||(id==='repairButton'&&repairBusy);
  for(const id of ['submitVariant','undoVariant','skipAssessment']) document.getElementById(id).disabled=interactionLocked;
  document.getElementById('nextPractice').textContent=active?mt('resume'):lastTestResult&&['active','unknown','diagnostic'].includes(lastTestResult.state)?mt('nextTest'):t('newPuzzle');
  const p=masteryProfile.pending;
  let counter='';
  if(p){
    const parts=[p.kind==='diagnostic'?mt('diagnostic'):mt('test')];
    if(p.kind!=='diagnostic'){
      parts.push(`${mt('sequence')} ${CM.state(masteryProfile,p.skillId).cycle?.phase||1}`);
      const slot=masteryProfile.session?.slots?.find(s=>s.id===p.skillId);
      if(slot)parts.push(`${mt('problem')} ${(masteryProfile.session.counts[p.skillId]||0)+1} ${mt('of')} ${slot.quota}`);
    }
    parts.push(`${p.line.length}/${p.puzzle.solution.length} ${mt('entered')}. ${mt('blind')}`);
    counter=parts.join(' · ');
  }
  document.getElementById('assessmentCounter').textContent=counter;
  renderGoals();
}
function renderSessionResults(){
  const container=document.getElementById('sessionResults');container.innerHTML='';
  const session=masteryProfile.session;
  if(!session || ['active','blocked'].includes(session.state))return;
  const title=document.createElement('strong');title.textContent=mt('sessionResults');container.appendChild(title);
  for(const row of session.results){const item=document.createElement('div');item.className='goal-row';item.textContent=(row.correct?'✓ ':'✗ ')+label(row.skillId)+' · '+row.solution.join(' ');container.appendChild(item);}
}
function renderGoals(){
  const checks=CM.prerequisiteChecks(masteryProfile);
  if(checks.length&&!isAssessment())document.getElementById('assessmentNotice').textContent=mt('basic')+' '+checks.map(label).join(', ');
  const container=document.getElementById('learningGoals');container.innerHTML='';
  if(isTestingSession())return;
  renderSessionResults();
  for(const skill of CC.stepSkills(selectedLevel)){
    const state=CM.state(masteryProfile,skill.id),coverage=CM.coverage(masteryProfile,getBank(),skill.id);
    const row=document.createElement('div');row.className='goal-row';
    const name=document.createElement('strong');name.textContent=skill.label[lang];row.appendChild(name);
    const details=document.createElement('div');
    details.textContent=`${mt(state.status)} · ${skill.ply} ply · ${coverage.available} ${mt('fresh')}`;
    if(coverage.available<coverage.needed && state.status!=='mastered')details.textContent+=` · ${mt('insufficient')}`;
    const c=state.cycle;
    if(c) details.textContent+=` · ${c.answers.filter(a=>a.correct).length}/${c.answers.length} ${mt('score')}`;
    if(c?.state==='waiting') details.textContent+=` · ${mt('waiting')} ${new Date(c.firstCompletedAt+CM.DAY).toLocaleString(lang==='nl'?'nl-NL':'en-GB')}`;
    row.appendChild(details);
    const bases=CM.blockers(masteryProfile,skill.id);
    if(bases.length){const msg=document.createElement('div');msg.className='muted';msg.textContent=mt('basic')+' '+bases.map(label).join(', ');row.appendChild(msg);}
    const practice=document.createElement('button');practice.className='btn btn-secondary';practice.textContent=mt('practice');practice.onclick=()=>{selectedType=skill.id;newPuzzle();};row.appendChild(practice);
    const assess=document.createElement('button');assess.className='btn btn-primary';assess.textContent=mt('startAssessment');assess.onclick=()=>{selectedType=skill.id;buildTypes();startAssessmentUI();};row.appendChild(assess);
    const link=document.createElement('a');link.href=skill.source;link.target='_blank';link.rel='noopener';link.textContent=mt('source');link.style.marginLeft='8px';row.appendChild(link);
    if(skill.outline){const note=document.createElement('div');note.className='muted';note.textContent=mt('outline');row.appendChild(note);}
    container.appendChild(row);
  }
}
function buildLevels(){
  const grid=document.getElementById('levelGrid');grid.innerHTML='';
  for(let i=1;i<=6;i++){
    const btn=document.createElement('button');btn.className='level-btn'+(i===selectedLevel?' active':'');
    btn.textContent=T[lang].levelNames[i]+(CM.unlocked(masteryProfile,i)?'':' 🔒');
    btn.disabled=isTestingSession() || !CM.unlocked(masteryProfile,i);btn.title=CM.unlocked(masteryProfile,i)?'':mt('locked');btn.onclick=()=>selectLevel(i);grid.appendChild(btn);
  }
}
function buildTypes(){
  const list=document.getElementById('typeList');list.innerHTML='';
  for(const skill of CC.stepSkills(selectedLevel)){
    const btn=document.createElement('button');btn.className='type-btn'+(skill.id===selectedType?' active':'');btn.textContent=skill.label[lang];btn.onclick=()=>selectType(skill.id);list.appendChild(btn);
  }
}
function selectLevel(level){
  if(isTestingSession()){setStatus(mt('pending'),'info');return;}
  if(!CM.unlocked(masteryProfile,level)){setStatus(mt('locked'),'info');return;}
  selectedLevel=level;selectedType=null;buildLevels();buildTypes();updateTraining();
}
function selectType(id){if(isTestingSession())return;selectedType=selectedType===id?null:id;buildTypes();}
function setSource(mode){
  if(isTestingSession()){setStatus(mt('pending'),'info');return;}
  sourceMode=mode;bankSource=null;
  document.getElementById('srcRandom').className='source-btn'+(mode==='random'?' active':'');
  document.getElementById('srcConfig').className='source-btn'+(mode==='config'?' active':'');
  document.getElementById('configArea').style.display=mode==='config'?'block':'none';updateTraining();
}
function updateInfo(){
  if(currentPuzzle && !isAssessment()){
    document.getElementById('infoLevel').textContent=attempt?.skill?T[lang].levelNames[CC.byId[attempt.skill].step]:'–';
    document.getElementById('infoType').textContent=attempt?.skill?label(attempt.skill):'–';
    document.getElementById('infoToMove').textContent=currentPuzzle.turn==='w'?t('white'):t('black');
    document.getElementById('infoMoves').textContent=currentPuzzle.solution.length+' ply';
    document.getElementById('themeExplainer').textContent=currentItem?.eligible && currentItem.skills.includes(attempt?.skill)?'':mt('candidate');
  }
  const indicator=document.getElementById('toPlayIndicator');indicator.style.display=gameState?'flex':'none';
  if(gameState){document.getElementById('toPlayDot').className='to-play-dot '+(gameState.turn==='w'?'white':'black');document.getElementById('toPlayText').textContent=gameState.turn==='w'?t('whiteToPlay'):t('blackToPlay');}
  updateTraining();
}
function loadPuzzle(puzzle,preserveAttempt=false,skill=null){
  clearTimeout(pendingMove);interactionLocked=false;
  currentPuzzle=puzzle;currentItem=CA.describe(puzzle);
  if(!currentItem){setStatus(t('noPuzzles'),'info');return;}
  if(!preserveAttempt)attempt={skill,errors:0,hints:0,finished:false};
  gameState=stateFromFen(currentItem.fen);selectedSq=null;solutionStep=0;moveHistory=[];legalCache=legalMoves(gameState);flipped=puzzle.turn==='b';
  buildBoard();renderPieces();updateInfo();updateMoveHistory();
  setStatus(isAssessment()?mt('blind'):(puzzle.turn==='w'?t('whiteToPlay'):t('blackToPlay')),'info');
}
function newPuzzle(){
  if(isAssessment()){resumeAssessment();return;}
  if(masteryProfile.session?.state==='active'){continueAssessment();return;}
  if(masteryProfile.session && masteryProfile.session.state!=='active' && lastTestResult?.state!=='diagnostic')lastTestResult=null;
  if(lastTestResult && ['active','unknown','diagnostic'].includes(lastTestResult.state)){continueAssessment();return;}
  const requested=selectedType || (selectedLevel<CM.activeStep(masteryProfile)?CC.stepSkills(selectedLevel).find(s=>CM.coverage(masteryProfile,getBank(),s.id).training>0)?.id:null);
  const pick=CM.choosePractice(masteryProfile,getBank(),requested);
  if(!pick){setStatus(mt('noPractice'),'info');return;}
  lastTestResult=null;selectedLevel=CC.byId[pick.skill].step;
  loadPuzzle(pick.item.puzzle,false,pick.skill);saveTraining();buildLevels();buildTypes();
  const context=requested && requested!==pick.skill?mt('basic')+' '+label(pick.skill):pick.maintenance?mt('maintenance'):'';
  if(context)setStatus(context,'info');
}
function finishAttempt(){
  if(isAssessment() || !attempt || attempt.finished)return;
  attempt.finished=true;if(attempt.skill)CM.practiceResult(masteryProfile,attempt.skill,attempt.errors?0:attempt.hints?0.5:1);saveTraining();
}
function resetPuzzle(){if(isTestingSession())return;if(currentPuzzle){if(attempt&&!attempt.finished)attempt.hints++;loadPuzzle(currentPuzzle,true);}}
function showHint(){if(isTestingSession()||!currentPuzzle||attempt?.finished)return;attempt.hints++;const move=currentPuzzle.solution[solutionStep];setStatus(currentPuzzle.hint?'💡 '+currentPuzzle.hint:move?t('hintText')+move.slice(0,2):t('noHint'),'info');}
function downloadPuzzleFixes(){
  const blob=new Blob([JSON.stringify(puzzleFixes,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const link=document.createElement('a');link.href=url;link.download='puzzle-fixes.json';
  document.body.appendChild(link);link.click();link.remove();URL.revokeObjectURL(url);
}
async function repairPuzzle(){
  if(isTestingSession()||repairBusy)return;
  if(!currentPuzzle){setStatus(mt('repairNeedPuzzle'),'info');return;}
  repairBusy=true;updateTraining();setStatus(mt('repairing'),'info');
  try{
    if(typeof LocalChessEngine==='undefined'){setStatus(mt('repairFailed'),'info');return;}
    if(!repairEngine)repairEngine=new LocalChessEngine();
    const result=await CR.propose(currentPuzzle,repairEngine);
    if(!result.ok){setStatus(mt('repairFailed'),'info');return;}
    if(result.unchanged){setStatus(mt('nothingToRepair'),'info');return;}
    if(!confirm(mt('confirmRepair')))return;
    puzzleFixes=CR.record(puzzleFixes,currentPuzzle,result.solution);
    if(!CR.save(puzzleFixes,localStorage))storageAvailable=false;
    bankSource=null;
    const skill=attempt?.skill||null;
    currentPuzzle={...currentPuzzle,solution:result.solution};
    loadPuzzle(currentPuzzle,false,skill);
    downloadPuzzleFixes();
    setStatus(mt('repairApplied'),'correct');
  }catch(e){setStatus(mt('repairFailed'),'info');}
  finally{repairBusy=false;updateTraining();}
}
window.repairPuzzle=repairPuzzle;
function onSquareClick(idx){
  if(!gameState||!currentPuzzle||interactionLocked||(!isAssessment()&&attempt?.finished))return;
  if(selectedSq===null){if(gameState.board[idx]?.[0]===gameState.turn)selectedSq=idx;renderPieces();return;}
  if(idx===selectedSq){selectedSq=null;renderPieces();return;}
  const moves=legalCache.filter(m=>m.from===selectedSq&&m.to===idx);
  if(!moves.length){selectedSq=gameState.board[idx]?.[0]===gameState.turn?idx:null;renderPieces();return;}
  let move=moves.find(m=>m.promo==='Q')||moves[0];
  if(moves.some(m=>m.promo)){
    const choice=prompt(lang==='nl'?'Promotie: Q, R, B of N':'Promotion: Q, R, B or N','Q');
    move=moves.find(m=>m.promo===choice?.toUpperCase());if(!move)return;
  }
  executeMove(move);
}
function executeMove(move){
  if(interactionLocked || (!isAssessment()&&attempt?.finished))return;
  const uci=sqName(move.from)+sqName(move.to)+(move.promo?.toLowerCase()||'');
  if(isAssessment()){
    const p=masteryProfile.pending;if(p.line.length>=currentPuzzle.solution.length)return;
    gameState=applyMove(gameState,move);p.line.push(uci);p.draft=p.line.join(' ');solutionStep=p.line.length;
    moveHistory.push({from:move.from,to:move.to,alg:moveToAlg(gameState,move)});selectedSq=null;legalCache=legalMoves(gameState);
    document.getElementById('variantInput').value=p.draft;saveTraining();renderPieces();updateInfo();updateMoveHistory();return;
  }
  let correct=uci.toLowerCase()===currentPuzzle.solution[solutionStep].toLowerCase();
  if(currentItem.verification?.kind==='mate' && currentPuzzle.solution.length===1)correct=isCheckmate(applyMove(gameState,move));
  if(currentItem.verification?.kind==='safeCapture')correct=CA.safeCapture(currentItem.fen,uci);
  if(!correct){attempt.errors++;selectedSq=null;moveHistory.push({from:move.from,to:move.to,alg:move.san,correct:false});renderPieces();updateMoveHistory();setStatus(t('wrong'),'wrong');return;}
  gameState=applyMove(gameState,move);solutionStep++;moveHistory.push({from:move.from,to:move.to,alg:move.san,correct:true});selectedSq=null;legalCache=legalMoves(gameState);renderPieces();updateInfo();updateMoveHistory();
  if(solutionStep>=currentPuzzle.solution.length||isCheckmate(gameState)){finishAttempt();setStatus(t('solved'),'correct');return;}
  interactionLocked=true;pendingMove=setTimeout(()=>{
    interactionLocked=false;const reply=currentPuzzle.solution[solutionStep];
    const m=legalCache.find(m=>sqName(m.from)+sqName(m.to)+(m.promo?.toLowerCase()||'')===reply?.toLowerCase());
    if(!m){setStatus(mt('candidate'),'info');return;}
    gameState=applyMove(gameState,m);solutionStep++;moveHistory.push({from:m.from,to:m.to,alg:m.san});legalCache=legalMoves(gameState);renderPieces();updateMoveHistory();updateInfo();setStatus(gameState.turn==='w'?t('whiteToPlay'):t('blackToPlay'),'info');
  },500);
}
function assessmentNotice(result){
  let message=mt(['active','no-cycle','passed','failed','interrupted'].includes(result.reason)?'testFinished':result.reason==='active-cycle'?'pending':result.reason==='prerequisites-check'?'locked':result.reason);
  if(result.reason==='insufficient')message=mt('insufficient')+(Number.isFinite(result.available)?` (${result.available}/${result.needed})`:'');
  if(result.reason==='waiting')message=mt('waiting')+' '+new Date(result.until).toLocaleString(lang==='nl'?'nl-NL':'en-GB');
  document.getElementById('assessmentNotice').textContent=message;setStatus(message,'info');
}
function startAssessmentUI(){
  if(isAssessment()){resumeAssessment();return;}
  if(!selectedType){setStatus(mt('selectGoal'),'info');return;}
  const result=CM.startSession(masteryProfile,getBank(),CC.byId[selectedType].step,Date.now(),Math.random,selectedType);
  if(result.ok){lastTestResult=null;saveTraining();resumeAssessment();}
  else{assessmentNotice(result);saveTraining();}
}
function startDiagnosticUI(){const result=CM.diagnose(masteryProfile,getBank());if(!result.ok){setStatus(mt('noDiagnostic'),'info');return;}lastTestResult=null;saveTraining();resumeAssessment();}
function resumeAssessment(){
  const p=masteryProfile.pending;if(!p)return;
  loadPuzzle(p.puzzle);
  for(const uci of p.line){
    const move=legalCache.find(m=>sqName(m.from)+sqName(m.to)+(m.promo?.toLowerCase()||'')===uci);
    if(!move){lastTestResult=CM.answer(masteryProfile,'unknown');saveTraining();setStatus(mt('unknown'),'info');return;}
    gameState=applyMove(gameState,move);moveHistory.push({from:move.from,to:move.to,alg:move.san});legalCache=legalMoves(gameState);
  }
  solutionStep=p.line.length;document.getElementById('variantInput').value=p.draft??p.line.join(' ');
  renderPieces();updateInfo();updateMoveHistory();buildLevels();
}
function saveVariantDraft(value){if(isAssessment()){masteryProfile.pending.draft=value.slice(0,500);saveTraining();}}
function undoVariant(){
  if(!isAssessment()||interactionLocked)return;
  const p=masteryProfile.pending;p.line.pop();p.draft=p.line.join(' ');saveTraining();resumeAssessment();
}
async function evaluateVariant(item,line){
  if(typeof Worker==='undefined' || location.protocol==='file:'){
    if(item.verification?.kind==='engine' || line.length>1)return {outcome:'unknown',reason:'worker-unavailable'};
    return CA.grade(item,line);
  }
  return new Promise(resolve=>{
    const worker=new Worker('assessment-worker.js');gradingWorker=worker;
    const finish=result=>{clearTimeout(timer);worker.terminate();gradingWorker=null;resolve(result);};
    const timer=setTimeout(()=>finish({outcome:'unknown',reason:'engine-timeout'}),90000);
    worker.onmessage=e=>finish(e.data);worker.onerror=()=>finish({outcome:'unknown',reason:'engine-unavailable'});
    worker.postMessage({item,line});
  });
}
async function submitVariant(){
  if(!isAssessment()||interactionLocked)return;
  const pending=masteryProfile.pending;
  const line=document.getElementById('variantInput').value.trim().split(/\s+/).filter(Boolean).map(m=>m.toLowerCase());
  pending.draft=document.getElementById('variantInput').value;
  // Persist submission before grading. Reload resumes the same evidence item.
  saveTraining();interactionLocked=true;updateTraining();setStatus(mt('submitted'),'info');
  const result=await evaluateVariant(currentItem,line);
  if(masteryProfile.pending!==pending)return;
  pending.line=line.filter(m=>/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(m));
  pending.verificationFailure=result.reason;
  lastTestResult=CM.answer(masteryProfile,result.outcome);interactionLocked=false;
  showTestResult(result.outcome,pending,result.reason);
}
function skipAssessment(){if(!isAssessment()||interactionLocked)return;const pending=masteryProfile.pending;lastTestResult=CM.answer(masteryProfile,'skip');showTestResult('skip',pending);}
function showTestResult(outcome,pending,reason=''){
  // Reveal this item's learning goal and line only after the submitted evidence
  // has been recorded; it cannot be resubmitted as a fresh test.
  attempt={skill:pending.skillId,finished:true,hints:0,errors:0};
  const ongoing=masteryProfile.session?.state==='active';
  let message=outcome==='unknown'?mt('unknown'):ongoing?mt('answerRecorded'):outcome==='correct'?mt('correctAnswer'):mt('wrongAnswer');
  const state=lastTestResult.state;
  const extra={waiting:'firstDone',passed:pending.kind==='maintenance'?'maintenanceDone':'pass',failed:'fail',remediation:'decay',diagnostic:'diagnosticDone'}[state];
  if(!ongoing){if(extra)message+=' '+mt(extra);message+=' '+label(pending.skillId)+': '+pending.puzzle.solution.join(' ');}
  selectedLevel=CM.activeStep(masteryProfile);selectedType=null;saveTraining();buildLevels();buildTypes();updateInfo();setStatus(message,outcome==='correct'?'correct':'info');
}
function continueAssessment(){
  if(!lastTestResult && masteryProfile.session?.state!=='active')return;
  let result;
  if(masteryProfile.session?.state==='active')result=CM.nextSession(masteryProfile,getBank());
  else if(lastTestResult?.state==='diagnostic')result=CM.diagnose(masteryProfile,getBank());
  else if(lastTestResult?.state==='unknown' && !CM.state(masteryProfile,lastTestResult.skillId).cycle)result=CM.diagnose(masteryProfile,getBank());
  else result=CM.next(masteryProfile,getBank(),lastTestResult.skillId);
  if(result.ok){lastTestResult=null;saveTraining();resumeAssessment();}
  else{lastTestResult=null;assessmentNotice(result);saveTraining();}
}
function loadPuzzleFile(event){
  if(isTestingSession())return;
  const file=event.target.files[0];if(!file)return;
  const reader=new FileReader();reader.onload=e=>{
    try{
      const parsed=JSON.parse(e.target.result),puzzles=Array.isArray(parsed)?parsed:parsed.puzzles;
      if(!Array.isArray(puzzles)||puzzles.length>10000)throw Error('Invalid puzzle set');
      configPuzzles=puzzles.filter(p=>CA.describe(p));bankSource=null;buildPuzzleList();updateTraining();setStatus(t('puzzleLoaded'),'info');
    }catch(error){setStatus('JSON: '+error.message,'info');}
  };reader.readAsText(file);
}
function buildPuzzleList(){
  const list=document.getElementById('puzzleList');list.innerHTML='';
  for(const p of configPuzzles.slice(0,100)){
    const item=document.createElement('div');item.className='puzzle-item';item.textContent=p.title||p.id;
    item.onclick=()=>{
      if(isTestingSession())return;
      const d=CA.describe(p),id=[...d.skills,...d.candidates].find(k=>CM.unlocked(masteryProfile,CC.byId[k].step)&&!CM.blockers(masteryProfile,k).length);
      if(!id){setStatus(mt('locked'),'info');return;}
      const reserve=CM.fresh(masteryProfile,getBank(),id).slice(0,20);
      if(reserve.some(b=>b.position===d.position)){setStatus(mt('noPractice'),'info');return;}
      CM.exposed(masteryProfile,d);masteryProfile.exposure.ids[p.id]='practice';masteryProfile.exposure.positions[d.position]='practice';
      loadPuzzle(p,false,id);saveTraining();
    };list.appendChild(item);
  }
}
function initializeMastery(){
  masteryProfile=CM.create();
  try{
    const raw=localStorage.getItem(PROFILE_KEY);
    let saved=null;
    try{saved=raw?JSON.parse(raw):null;}catch(e){damagedProgress=true;}
    if(CM.valid(saved))masteryProfile=saved;
    else{
      if(raw){localStorage.setItem(PROFILE_KEY+'.backup.'+Date.now(),raw);damagedProgress=true;}
      let legacy=null;
      try{legacy=JSON.parse(localStorage.getItem('chessExercises.training.v1'));}catch(e){}
      masteryProfile=CM.create(legacy?.profile);
    }
  }catch(e){storageAvailable=false;}
  selectedLevel=CM.activeStep(masteryProfile);init();
  document.getElementById('repairButton')?.addEventListener('click',()=>repairPuzzle());
  if(masteryProfile.session?.state==='active'&&!masteryProfile.pending)lastTestResult={state:'active'};
  if(masteryProfile.pending){resumeAssessment();setStatus(mt('storageResume'),'info');}
}
initializeMastery();
