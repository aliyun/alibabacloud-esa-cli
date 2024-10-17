const fs = require('fs-extra');

fs.copySync('README.md', 'dist/README.md');
fs.copySync('zh_CN.md', 'dist/zh_CN.md');
fs.copySync('package.json', 'dist/package.json');
fs.copySync('bin', 'dist/bin');
fs.copySync('docs', 'dist/docs');
fs.copySync(
  'src/commands/dev/config/devEntry.js',
  'dist/commands/dev/config/devEntry.js'
);
fs.copySync('src/commands/dev/mock', 'dist/commands/dev/config/mock');
fs.copySync('src/cliconfig.toml', 'dist/cliconfig.toml');
fs.copySync('src/utils/install', 'dist/utils/install');
fs.copySync('src/i18n/locales.json', 'dist/i18n/locales.json');
console.log('copy success');
