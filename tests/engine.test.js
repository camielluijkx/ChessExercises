const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const readline=require('node:readline');
const Engine=require('../engine-client');
function nodeWorker(){
  const process=spawn(global.process.execPath,[require.resolve('../vendor/stockfish-19-lite-single.js')],{stdio:['pipe','pipe','pipe']});
  const listeners={message:new Set(),error:new Set()};
  readline.createInterface({input:process.stdout}).on('line',line=>listeners.message.forEach(f=>f({data:line})));
  process.on('error',()=>listeners.error.forEach(f=>f()));
  return {postMessage:message=>process.stdin.write(message+'\n'),addEventListener:(name,f)=>listeners[name].add(f),removeEventListener:(name,f)=>listeners[name].delete(f),terminate:()=>process.kill()};
}
test('bundled Stockfish initializes and evaluates both unrestricted and chosen moves locally',async()=>{
  const engine=new Engine(nodeWorker);
  try {
    const fen='7k/5Q2/6K1/8/8/8/8/8 w - - 0 1';
    const [best,chosen]=await engine.compare(fen,'f7g7');
    assert.equal(best.type,'mate');assert.equal(chosen.type,'mate');assert.equal(best.value,1);assert.equal(chosen.value,1);assert.ok(best.depth>=12);assert.ok(chosen.depth>=12);
    assert.equal(best.bestmove,'f7g7');
    assert.deepEqual(await engine.search(fen),best);
  } finally {engine.close();}
});
