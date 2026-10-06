importScripts('vendor/chess.js','curriculum.js','assessment.js','engine-client.js');
onmessage = async event => {
  try {
    const {item,line}=event.data;
    const engine=item.verification?.kind==='engine'?new LocalChessEngine():null;
    const result=await TacticalAssessment.grade(item,line,engine);
    engine?.close();postMessage(result);
  } catch(e) {postMessage({outcome:'unknown',reason:'verification-failed'});}
};
