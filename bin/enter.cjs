#! /usr/bin/env node
const fs = require('fs');
const spawn = require('cross-spawn');
const path = require('path');

const main = () => {
  let entryPath;
  if (fs.existsSync(path.join(__dirname, '../dist/index.js'))) {
    entryPath = path.join(__dirname, '../dist/index.js');
  } else if (fs.existsSync(path.join(__dirname, '../index.js'))) {
    entryPath = path.join(__dirname, '../index.js');
  } else {
    throw new Error('Neither dist/index.js nor index.js could be found.');
  }

  return spawn(
    process.execPath,
    ['--no-warnings', ...process.execArgv, entryPath, ...process.argv.slice(2)],
    {
      stdio: 'inherit',
      env: {
        ...process.env
      }
    }
  )
    .on('error', (err) => {
      console.log('Get Error', err);
    })
    .on('exit', (code, signal) => {
      if (code !== null) {
        process.exit(code);
      } else if (signal) {
        process.kill(process.pid, signal);
      } else {
        process.exit(1);
      }
    });
};

if (require.main === module) {
  const cliProcess = main();
  // Normal
  process.on('SIGINT', () => {
    cliProcess && cliProcess.kill();
  });
  process.on('SIGTERM', () => {
    cliProcess && cliProcess.kill();
  });
}
