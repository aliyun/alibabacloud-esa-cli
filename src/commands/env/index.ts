import { Argv, CommandModule } from 'yargs';

import deleteEnvironmentVariable from './delete.js';
import listEnvironmentVariables from './list.js';
import setEnvironmentVariable from './set.js';

const environmentCommand: CommandModule = {
  command: 'env <command>',
  describe: 'Manage runtime environment variables',
  builder: (yargs: Argv) =>
    yargs
      .command(listEnvironmentVariables)
      .command(setEnvironmentVariable)
      .command(deleteEnvironmentVariable)
      .demandCommand(1, 'Choose env list, env set, or env delete.'),
  handler: () => {}
};

export default environmentCommand;
