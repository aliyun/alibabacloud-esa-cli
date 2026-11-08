import { resolve } from 'node:path';
import { stripVTControlCharacters } from 'node:util';
import { runCliProcess, type CliInput } from '../support/cli-process';

export function stripAnsi(text: string): string {
  return stripVTControlCharacters(text);
}

export async function runInteractiveDelayed(
  options: {
    bin: string;
    args: string[];
    cwd?: string;
    env?: Record<string, string>;
    timeout?: number;
  },
  inputs: CliInput[] = []
) {
  const result = await runCliProcess({
    ...options,
    inputs,
    nodeArgs: ['--require', resolve('tests/fixtures/offline-http.cjs')]
  });
  if (result.timedOut)
    throw new Error(`CLI ${options.args[0] ?? ''} timed out`);
  return result;
}
