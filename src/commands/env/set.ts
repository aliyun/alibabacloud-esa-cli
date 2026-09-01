import { ArgumentsCamelCase, Argv, CommandModule } from 'yargs';

import logger from '../../libs/logger.js';

import {
  addRoutineEnvironmentOptions,
  parseEnvironmentVariableAssignment,
  resolveRoutineEnvironmentContext,
  RoutineEnvironmentCommandArguments,
  setRoutineEnvironmentVariableValues
} from './utils.js';

interface SetEnvironmentVariableArguments extends RoutineEnvironmentCommandArguments {
  assignment?: string;
}

const setEnvironmentVariable: CommandModule = {
  command: 'set <assignment>',
  describe: 'Set a plaintext runtime environment variable',
  builder: (yargs: Argv) =>
    addRoutineEnvironmentOptions(yargs).positional('assignment', {
      describe: 'Environment variable in KEY=VALUE format',
      type: 'string',
      demandOption: true
    }),
  handler: async (argv: ArgumentsCamelCase) => {
    const success = await handleSetEnvironmentVariable(argv);
    if (!success) process.exitCode = 1;
  }
};

export async function handleSetEnvironmentVariable(
  argv: SetEnvironmentVariableArguments
): Promise<boolean> {
  if (!argv.assignment) {
    logger.error('Expected an environment variable in KEY=VALUE format.');
    return false;
  }

  let assignment: { key: string; value: string };
  try {
    assignment = parseEnvironmentVariableAssignment(argv.assignment);
  } catch (error) {
    logger.error((error as Error).message);
    return false;
  }

  const context = await resolveRoutineEnvironmentContext(argv);
  if (!context) return false;

  const values: Record<string, string> = Object.create(null);
  values[assignment.key] = assignment.value;
  return await setRoutineEnvironmentVariableValues(
    context,
    values,
    'plain_text'
  );
}

export default setEnvironmentVariable;
