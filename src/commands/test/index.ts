import { ArgumentsCamelCase, Argv, CommandModule } from 'yargs';
import compress from '../../utils/compress.js';

const test: CommandModule = {
  command: 'test',
  describe: `测试命令`,
  builder: (yargs: Argv) => {
    return yargs.fail((msg, err, yargsIns) => {
      if (err) throw err;
      if (msg) {
        console.error(msg);
        yargsIns.showHelp('log');
      }
      process.exit(1);
    });
  },
  handler: async (argv: ArgumentsCamelCase) => {
    compress();
  }
};
export default test;
