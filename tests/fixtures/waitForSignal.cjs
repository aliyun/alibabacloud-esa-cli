const launcherPid = process.ppid;

process.stdout.write(`ready:${process.pid}\n`);
setInterval(() => {
  try {
    process.kill(launcherPid, 0);
  } catch {
    process.exit(1);
  }
}, 250);
