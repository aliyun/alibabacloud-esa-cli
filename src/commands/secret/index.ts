import { Argv, CommandModule } from 'yargs';

import bulkSecrets from './bulk.js';
import putSecret from './put.js';

const secretCommand: CommandModule = {
  command: 'secret <command>',
  describe: 'Manage encrypted runtime secrets',
  builder: (yargs: Argv) =>
    yargs
      .command(putSecret)
      .command(bulkSecrets)
      .demandCommand(1, 'Choose secret put or secret bulk.'),
  handler: () => {}
};

export default secretCommand;
