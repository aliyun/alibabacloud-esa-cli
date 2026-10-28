import { ArgumentsCamelCase, Argv, CommandModule } from 'yargs';

import logger from '../../libs/logger.js';

import {
  addRoutineEnvironmentOptions,
  deleteRoutineEnvironmentVariableKeys,
  resolveRoutineEnvironmentContext,
  RoutineEnvironmentCommandArguments
} from './utils.js';

interface DeleteEnvironmentVariableArguments extends RoutineEnvironmentCommandArguments {
  key?: string;
}

const deleteEnvironmentVariable: CommandModule = {
  command: 'delete <key>',
  describe: 'Delete a runtime environment variable or secret',
  builder: (yargs: Argv) =>
    addRoutineEnvironmentOptions(yargs).positional('key', {
      describe: 'Environment variable key',
      type: 'string',
      demandOption: true
    }),
  handler: async (argv: ArgumentsCamelCase) => {
    const success = await handleDeleteEnvironmentVariable(argv);
    if (!success) process.exitCode = 1;
  }
};

export async function handleDeleteEnvironmentVariable(
  argv: DeleteEnvironmentVariableArguments
): Promise<boolean> {
  if (!argv.key) {
    logger.error('Environment variable key is required.');
    return false;
  }

  const context = await resolveRoutineEnvironmentContext(argv);
  if (!context) return false;
  return await deleteRoutineEnvironmentVariableKeys(context, [argv.key]);
}

export default deleteEnvironmentVariable;
