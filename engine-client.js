// Local UCI worker. Evaluation is an estimate; ambiguous results stay unscored.
(function(root) {
  class LocalEngine {
    constructor(factory = null) {this.factory=factory || (()=>new Worker('vendor/stockfish-19-lite-single.js'));this.worker=null;this.cache=new Map();this.queue=Promise.resolve();}
    async ready() {
      if(this.worker) return;
      this.worker=this.factory();
      try {await this.command('uci','uciok');this.worker.postMessage('setoption name Hash value 16');await this.command('isready','readyok');}
      catch(e){this.close();throw e;}
    }
    command(command,end) {
      return new Promise((resolve,reject)=>{
        const lines=[];
        const onMessage=e=>{const line=String(e.data);lines.push(line);if(line.startsWith(end)){cleanup();resolve(lines);}};
        const onError=()=>{cleanup();reject(Error('Engine failed'));};
        const timer=setTimeout(()=>{cleanup();this.close();reject(Error('Engine timeout'));},15000);
        const cleanup=()=>{clearTimeout(timer);this.worker?.removeEventListener('message',onMessage);this.worker?.removeEventListener('error',onError);};
        this.worker.addEventListener('message',onMessage);this.worker.addEventListener('error',onError);this.worker.postMessage(command);
      });
    }
    search(fen,move=null) {
      const key=`${fen}|${move||''}`;
      if(this.cache.has(key)) return Promise.resolve(this.cache.get(key));
      const task=this.queue.then(async()=>{
        await this.ready();this.worker.postMessage(`position fen ${fen}`);
        const lines=await this.command(`go depth 16 nodes 200000${move?' searchmoves '+move:''}`,'bestmove');
        let result={depth:0,type:'cp',value:0,bound:false,bestmove:null};
        for(const line of lines){
          const m=line.match(/info depth (\d+).*?score (cp|mate) (-?\d+)(.*)/);
          if(m) result={...result,depth:Number(m[1]),type:m[2],value:Number(m[3]),bound:/lowerbound|upperbound/.test(m[4])};
          const best=line.match(/^bestmove\s+(\S+)/i);
          if(best) result.bestmove=best[1]==='(none)'?null:best[1].toLowerCase();
        }
        this.cache.set(key,result);return result;
      });
      this.queue=task.catch(()=>{});return task;
    }
    async compare(fen,move) {const best=await this.search(fen);const chosen=await this.search(fen,move);return [best,chosen];}
    close(){this.worker?.terminate();this.worker=null;}
  }
  if(typeof module!=='undefined' && module.exports) module.exports=LocalEngine;
  else root.LocalChessEngine=LocalEngine;
})(globalThis);
