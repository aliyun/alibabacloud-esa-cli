import { Readable } from 'node:stream';

import { ArgumentsCamelCase, Argv, CommandModule } from 'yargs';

import logger from '../../libs/logger.js';
import promptParameter from '../../utils/prompt.js';
import {
  addRoutineEnvironmentOptions,
  MAX_ENVIRONMENT_VARIABLE_VALUE_LENGTH,
  resolveRoutineEnvironmentContext,
  RoutineEnvironmentCommandArguments,
  setRoutineEnvironmentVariableValues,
  validateEnvironmentVariableKey
} from '../env/utils.js';

interface PutSecretArguments extends RoutineEnvironmentCommandArguments {
  key?: string;
  stdin?: boolean;
}

const putSecret: CommandModule = {
  command: 'put <key>',
  describe: 'Set an encrypted runtime secret',
  builder: (yargs: Argv) =>
    addRoutineEnvironmentOptions(yargs)
      .positional('key', {
        describe: 'Secret key',
        type: 'string',
        demandOption: true
      })
      .option('stdin', {
        describe: 'Read the secret value from standard input',
        type: 'boolean',
        default: false
      }),
  handler: async (argv: ArgumentsCamelCase) => {
    const success = await handlePutSecret(argv);
    if (!success) process.exitCode = 1;
  }
};

export async function readSecretFromStream(
  input: Readable = process.stdin
): Promise<string> {
  let value = '';
  for await (const chunk of input) value += chunk.toString();
  return value.replace(/\r?\n$/, '');
}

export async function promptForSecretValue(): Promise<string> {
  return (await promptParameter<string>({
    type: 'password',
    question: 'Enter secret value',
    label: 'Secret',
    validate: (value) => {
      if (value.length === 0) return 'Secret value is required.';
      if (value.length > MAX_ENVIRONMENT_VARIABLE_VALUE_LENGTH) {
        return `Secret value must not exceed ${MAX_ENVIRONMENT_VARIABLE_VALUE_LENGTH} characters.`;
      }
      return true;
    }
  })) as string;
}

export async function handlePutSecret(
  argv: PutSecretArguments
): Promise<boolean> {
  if (!argv.key) {
    logger.error('Secret key is required.');
    return false;
  }
  const keyError = validateEnvironmentVariableKey(argv.key);
  if (keyError) {
    logger.error(keyError);
    return false;
  }

  const context = await resolveRoutineEnvironmentContext(argv);
  if (!context) return false;

  const value = argv.stdin
    ? await readSecretFromStream()
    : await promptForSecretValue();
  if (value.length === 0) {
    logger.error('Secret value is required.');
    return false;
  }

  const values: Record<string, string> = Object.create(null);
  values[argv.key] = value;
  return await setRoutineEnvironmentVariableValues(
    context,
    values,
    'secret_text'
  );
}

export default putSecret;
