#! /usr/bin/env node
const fs = require('fs');
const spawn = require('cross-spawn');
const path = require('path');

const getRuntimeNodePath = () => {
  const nodePaths = new Set();
  const launcherDirs = [
    __dirname,
    process.argv[1] ? path.dirname(process.argv[1]) : undefined
  ].filter(Boolean);

  for (const launcherDir of launcherDirs) {
    const pnpmNodeModules = path.resolve(
      launcherDir,
      '..',
      '..',
      '.pnpm',
      'node_modules'
    );

    if (fs.existsSync(pnpmNodeModules)) {
      nodePaths.add(pnpmNodeModules);
    }
  }

  if (process.env.NODE_PATH) {
    for (const nodePath of process.env.NODE_PATH.split(path.delimiter)) {
      if (nodePath) {
        nodePaths.add(nodePath);
      }
    }
  }

  return nodePaths.size > 0 ? Array.from(nodePaths).join(path.delimiter) : '';
};

const main = (entryPathOverride) => {
  let entryPath = entryPathOverride;
  if (!entryPath) {
    if (fs.existsSync(path.join(__dirname, '../dist/index.js'))) {
      entryPath = path.join(__dirname, '../dist/index.js');
    } else if (fs.existsSync(path.join(__dirname, '../index.js'))) {
      entryPath = path.join(__dirname, '../index.js');
    } else {
      throw new Error('Neither dist/index.js nor index.js could be found.');
    }
  }

  const nodePath = getRuntimeNodePath();

  const cliProcess = spawn(
    process.execPath,
    ['--no-warnings', ...process.execArgv, entryPath, ...process.argv.slice(2)],
    {
      stdio: 'inherit',
      env: {
        ...process.env,
        ...(nodePath ? { NODE_PATH: nodePath } : {})
      }
    }
  );
  const forwardSignal = (signal) => {
    if (!cliProcess.killed) {
      cliProcess.kill(signal);
    }
  };
  const onSigint = () => forwardSignal('SIGINT');
  const onSigterm = () => forwardSignal('SIGTERM');
  const removeSignalHandlers = () => {
    process.off('SIGINT', onSigint);
    process.off('SIGTERM', onSigterm);
  };
  process.on('SIGINT', onSigint);
  process.on('SIGTERM', onSigterm);

  let spawnFailed = false;
  return cliProcess
    .on('error', (err) => {
      spawnFailed = true;
      removeSignalHandlers();
      console.error('Failed to start esa-cli:', err);
      process.exitCode = 1;
    })
    .on('exit', (code, signal) => {
      removeSignalHandlers();
      if (spawnFailed) return;
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
  main();
}

module.exports = { main, getRuntimeNodePath };
