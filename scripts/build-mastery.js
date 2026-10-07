const esbuild = require('esbuild');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const entry = path.join(root, 'web/src/app/domain/mastery.boot.ts');
const outFile = path.join(root, 'mastery.js');

const { outputFiles } = esbuild.buildSync({
  entryPoints: [entry],
  bundle: true,
  platform: 'neutral',
  format: 'iife',
  globalName: '__MasteryBoot',
  write: false,
});

const bootBundle = outputFiles[0].text;

const masteryJs = `${bootBundle}
(function (root) {
  const C =
    typeof module !== 'undefined' && module.exports
      ? require('./curriculum.js')
      : root.ChessCurriculum;
  const api = __MasteryBoot.createApi(C);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.TacticalMastery = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
`;

fs.writeFileSync(outFile, masteryJs);
