import { ArgumentsCamelCase, Argv, CommandModule } from 'yargs';

import logger from '../../libs/logger.js';

import {
  addRoutineEnvironmentOptions,
  listAllRoutineEnvironmentVariables,
  resolveRoutineEnvironmentContext,
  RoutineEnvironmentCommandArguments
} from './utils.js';

const listEnvironmentVariables: CommandModule = {
  command: 'list',
  describe: 'List runtime environment variables',
  builder: (yargs: Argv) => addRoutineEnvironmentOptions(yargs),
  handler: async (argv: ArgumentsCamelCase) => {
    const success = await handleListEnvironmentVariables(argv);
    if (!success) process.exitCode = 1;
  }
};

export async function handleListEnvironmentVariables(
  argv: RoutineEnvironmentCommandArguments
): Promise<boolean> {
  const context = await resolveRoutineEnvironmentContext(argv);
  if (!context) return false;

  const variables = await listAllRoutineEnvironmentVariables(context);
  if (!variables) {
    logger.error('Failed to list environment variables.');
    return false;
  }

  const rows = Object.entries(variables)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, variable]) => [
      key,
      variable.Type,
      variable.Type === 'secret_text' ? '********' : (variable.Value ?? ''),
      variable.UpdatedAt ?? variable.CreatedAt ?? '-'
    ]);

  if (rows.length === 0) {
    logger.log(`No environment variables found for ${context.environment}.`);
    return true;
  }

  logger.table(['Key', 'Type', 'Value', 'Updated'], rows, [28, 14, 42, 25]);
  return true;
}

export default listEnvironmentVariables;
