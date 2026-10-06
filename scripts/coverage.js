#!/usr/bin/env node
// Real assessment eligibility, not merely CSV theme/depth counts.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const C=require('../curriculum'),A=require('../assessment');
const source={window:{}};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../puzzles.js'),'utf8'),source);
const bank=A.bank(source.window.LICHESS_PUZZLES);
const skills=C.skills.map(s=>({id:s.id,step:s.step,label:s.label.nl,ply:s.ply,source:s.source,
  candidates:bank.filter(b=>b.candidates.includes(s.id)||b.skills.includes(s.id)).length,
  assessmentPositions:new Set(bank.filter(b=>b.eligible&&b.skills.includes(s.id)).map(b=>b.position)).size,
  reviewedOutline:!s.outline}));
const report={rawPuzzles:source.window.LICHESS_PUZZLES.length,uniqueSourcePositions:new Set(bank.map(b=>b.position)).size,
  eligibleRecords:bank.filter(b=>b.eligible).length,skills};
if(process.argv.includes('--json'))console.log(JSON.stringify(report,null,2));
else for(const s of skills)console.log(`${s.id.padEnd(21)} ${String(s.assessmentPositions).padStart(4)} toetsposities / ${String(s.candidates).padStart(4)} kandidaten · ${s.ply} ply`);
