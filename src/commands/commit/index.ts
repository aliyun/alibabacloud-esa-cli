import { exit } from 'process';

import { CommandModule, Argv, ArgumentsCamelCase } from 'yargs';

import { descriptionInput } from '../../components/descriptionInput.js';
import t from '../../i18n/index.js';
import {
  validateAndInitializeProject,
  generateCodeVersion
} from '../common/utils.js';

const commit: CommandModule = {
  command: 'commit [entry]',
  describe: `📥 ${t('commit_describe').d('Commit your code, save as a new version')}`,
  builder: (yargs: Argv) => {
    return yargs
      .option('minify', {
        alias: 'm',
        describe: t('commit_option_minify').d('Minify code before committing'),
        type: 'boolean',
        default: false
      })
      .option('assets', {
        alias: 'a',
        describe: t('commit_option_assets').d('Assets directory'),
        type: 'string'
      })
      .option('description', {
        alias: 'd',
        describe: t('commit_option_description').d(
          'Description for the routine/version (skip interactive input)'
        ),
        type: 'string'
      })
      .option('name', {
        alias: 'n',
        describe: t('commit_option_name').d('Edge Routine name'),
        type: 'string'
      });
  },
  handler: async (argv: ArgumentsCamelCase) => {
    await handleCommit(argv);
    exit();
  }
};

export default commit;

export async function handleCommit(argv: ArgumentsCamelCase) {
  const projectInfo = await validateAndInitializeProject(argv?.name as string);
  if (!projectInfo) return;
  const { projectName } = projectInfo;
  let description;
  if (argv.description) {
    description = argv.description as string;
  } else {
    description = await descriptionInput(
      `🖊️ ${t('commit_version_description').d('Enter a description for the version')}:`,
      false
    );
  }
  await generateCodeVersion(
    projectName,
    description,
    argv?.entry as string,
    argv?.assets as string,
    argv?.minify as boolean
  );
}
