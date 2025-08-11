import { exit } from 'process';

import { CommandModule, Argv, ArgumentsCamelCase } from 'yargs';

import { descriptionInput } from '../../components/descriptionInput.js';
import t from '../../i18n/index.js';
import logger from '../../libs/logger.js';
import { ensureRoutineExists } from '../../utils/checkIsRoutineCreated.js';
import compress from '../../utils/compress.js';
import { getProjectConfig } from '../../utils/fileUtils/index.js';
import { checkIsLoginSuccess } from '../utils.js';

import { commitRoutineWithAssets } from './helper.js';

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
  const projectConfig = getProjectConfig();
  if (!projectConfig) return logger.notInProject();

  if (!(await checkIsLoginSuccess())) return;

  const projectName = (argv?.name as string) || projectConfig.name;
  await ensureRoutineExists(projectName);

  let zip = await compress(argv?.entry as string, argv?.assets as string);

  let description;
  if (argv.description) {
    description = argv.description as string;
  } else {
    description = await descriptionInput(
      `🖊️ ${t('commit_version_description').d('Enter a description for the version')}:`,
      false
    );
  }

  const isSuccess = (
    await commitRoutineWithAssets(
      {
        Name: projectName,
        CodeDescription: description
      },
      zip?.toBuffer() as Buffer
    )
  )?.isSuccess;
  if (isSuccess) {
    logger.success(
      t('commit_routine_with_assets_success').d(
        'Routine with assets code version committed successfully.'
      )
    );
  } else {
    logger.error(
      t('commit_routine_with_assets_fail').d(
        'An error occurred while trying to commit your routine with assets.'
      )
    );
  }
}
