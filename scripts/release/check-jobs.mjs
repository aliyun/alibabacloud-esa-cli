import { pathToFileURL } from 'node:url';
import { realpathSync } from 'node:fs';

// CI summary jobs deliberately run before installing any npm dependencies.
export function assertSuccessfulJobs(jobs, required) {
  if (!required.length) throw new Error('No required jobs were configured');
  for (const name of required) {
    if (jobs[name]?.result !== 'success')
      throw new Error(
        `Required job ${name}: ${jobs[name]?.result ?? 'missing'}`
      );
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href
) {
  assertSuccessfulJobs(
    JSON.parse(process.env.JOB_RESULTS ?? '{}'),
    process.argv.slice(2)
  );
  console.log('All required jobs succeeded');
}
