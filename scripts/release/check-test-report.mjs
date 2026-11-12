import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export function assertExecutedReport(report, minimum) {
  if (
    !Number.isInteger(minimum) ||
    minimum < 1 ||
    report.success !== true ||
    !Number.isInteger(report.numTotalTests) ||
    report.numTotalTests < minimum ||
    report.numPassedTests !== report.numTotalTests ||
    report.numFailedTests !== 0 ||
    report.numPendingTests !== 0 ||
    (report.numTodoTests ?? 0) !== 0 ||
    (report.numFailedTestSuites ?? 0) !== 0
  ) {
    throw new Error('Required tests failed, were skipped, or did not execute');
  }
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  assertExecutedReport(
    JSON.parse(readFileSync(process.argv[2], 'utf8')),
    Number(process.argv[3])
  );
  console.log('Required tests executed without failures or skips');
}
