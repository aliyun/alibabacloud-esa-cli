import { ArgumentsCamelCase, Argv, CommandModule } from 'yargs';

import logger from '../../libs/logger.js';
import {
  addRoutineEnvironmentOptions,
  parseEnvironmentVariableFile,
  resolveRoutineEnvironmentContext,
  RoutineEnvironmentCommandArguments,
  setRoutineEnvironmentVariableValues
} from '../env/utils.js';

interface BulkSecretsArguments extends RoutineEnvironmentCommandArguments {
  file?: string;
}

const bulkSecrets: CommandModule = {
  command: 'bulk <file>',
  describe: 'Set encrypted runtime secrets from a dotenv file',
  builder: (yargs: Argv) =>
    addRoutineEnvironmentOptions(yargs).positional('file', {
      describe: 'Path to a dotenv file',
      type: 'string',
      demandOption: true
    }),
  handler: async (argv: ArgumentsCamelCase) => {
    const success = await handleBulkSecrets(argv);
    if (!success) process.exitCode = 1;
  }
};

export async function handleBulkSecrets(
  argv: BulkSecretsArguments
): Promise<boolean> {
  if (!argv.file) {
    logger.error('A dotenv file path is required.');
    return false;
  }

  const context = await resolveRoutineEnvironmentContext(argv);
  if (!context) return false;

  let values: Record<string, string>;
  try {
    values = await parseEnvironmentVariableFile(argv.file);
  } catch {
    logger.error(`Unable to read dotenv file: ${argv.file}.`);
    return false;
  }

  const emptyKeys = Object.entries(values)
    .filter(([, value]) => value.length === 0)
    .map(([key]) => key);
  if (emptyKeys.length > 0) {
    logger.error(`Secret values must not be empty: ${emptyKeys.join(', ')}.`);
    return false;
  }

  return await setRoutineEnvironmentVariableValues(
    context,
    values,
    'secret_text'
  );
}

export default bulkSecrets;
