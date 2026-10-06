#!/usr/bin/env node
/** Export curriculum + puzzle bank as JSON assets for the Angular app. */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const outDir = path.join(root, 'web', 'public', 'data');
fs.mkdirSync(outDir, { recursive: true });

const curriculum = require(path.join(root, 'curriculum.js'));
fs.writeFileSync(
  path.join(outDir, 'curriculum.json'),
  JSON.stringify({ skills: curriculum.skills, sources: curriculum.sources })
);

const puzzlesSrc = fs.readFileSync(path.join(root, 'puzzles.js'), 'utf8');
const match = puzzlesSrc.match(/window\.LICHESS_PUZZLES\s*=\s*([\s\S]*);\s*$/);
if (!match) {
  console.error('export-for-angular: could not parse window.LICHESS_PUZZLES from puzzles.js');
  process.exit(1);
}
const puzzles = JSON.parse(match[1]);
if (!Array.isArray(puzzles) || puzzles.length === 0) {
  console.error('export-for-angular: puzzle bank is empty or invalid');
  process.exit(1);
}
fs.writeFileSync(path.join(outDir, 'puzzles.json'), JSON.stringify(puzzles));

console.log(
  `export-for-angular: ${curriculum.skills.length} leerdoelen, ${puzzles.length} puzzels → web/public/data/`
);
