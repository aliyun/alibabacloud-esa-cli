const fs = require('fs-extra');

// fs.copySync('README.md', 'dist/README.md');
// fs.copySync('zh_CN.md', 'dist/zh_CN.md');
// fs.copySync('package.json', 'dist/package.json');
fs.copySync('bin', 'dist/bin');
fs.copySync('docs', 'dist/docs');
fs.copySync(
  'src/commands/dev/mockWorker/devEntry.js',
  'dist/commands/dev/mockWorker/devEntry.js'
);
fs.copySync(
  'src/commands/dev/mockWorker/mock',
  'dist/commands/dev/mockWorker/mock'
);
fs.copySync(
  'src/commands/dev/ew2/devEntry.js',
  'dist/commands/dev/ew2/devEntry.js'
);
fs.copySync('src/commands/dev/ew2/mock', 'dist/commands/dev/ew2/mock');
fs.copySync('src/cliconfig.toml', 'dist/cliconfig.toml');
fs.copySync('src/utils/install', 'dist/utils/install');
fs.copySync('src/i18n/locales.json', 'dist/i18n/locales.json');
console.log('copy success');
