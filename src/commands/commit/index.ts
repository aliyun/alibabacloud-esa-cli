import { exit } from 'process';

import { CommandModule, Argv, ArgumentsCamelCase } from 'yargs';

import { descriptionInput } from '../../components/descriptionInput.js';
import t from '../../i18n/index.js';
import { ApiService } from '../../libs/apiService.js';
import {
  CreateRoutineReq,
  EdgeRoutineProps,
  GetRoutineReq
} from '../../libs/interface.js';
import logger from '../../libs/logger.js';
import {
  checkConfigRoutineType,
  EDGE_ROUTINE_TYPE
} from '../../utils/checkAssetsExist.js';
import compress from '../../utils/compress.js';
import {
  getProjectConfig,
  readEdgeRoutineFile
} from '../../utils/fileUtils/index.js';
import { checkDirectory, checkIsLoginSuccess } from '../utils.js';

import prodBuild from './prodBuild.js';

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
      .option('description', {
        alias: 'd',
        describe: t('commit_option_description').d(
          'Description for the routine/version (skip interactive input)'
        ),
        type: 'string'
      })
      .positional('entry', {
        describe: t('dev_entry_describe').d('Entry file of the Routine'),
        type: 'string',
        demandOption: false
      });
  },
  handler: async (argv: ArgumentsCamelCase) => {
    await handleCommit(argv);
    exit();
  }
};

export default commit;

export async function handleCommit(argv: ArgumentsCamelCase) {
  if (!checkDirectory()) return;

  const projectConfig = getProjectConfig();
  if (!projectConfig) return logger.notInProject();

  if (!(await checkIsLoginSuccess())) return;

  const routineType = checkConfigRoutineType();

  let zip;
  if (
    routineType === EDGE_ROUTINE_TYPE.ASSETS_ONLY ||
    routineType === EDGE_ROUTINE_TYPE.JS_AND_ASSETS
  ) {
    logger.log(
      `🔔 ${t('commit_assets_exist').d('This is a routine with assets project')}`
    );
    zip = await compress();
  } else {
    await prodBuild(!!argv.minify, argv?.entry as string);
  }

  try {
    const server = await ApiService.getInstance();
    const req: GetRoutineReq = { Name: projectConfig.name };
    const response = await server.getRoutine(req, false);
    let action = 'Creating';
    let description;

    if (!response) {
      logger.log(
        `🙅 ${t('commit_er_not_exist').d('No routine found, creating a new one')}`
      );
      if (argv.description) {
        description = argv.description as string;
      } else {
        description = await descriptionInput(
          `🖊️ ${t('commit_er_description').d('Enter a description for the routine')}:`,
          false
        );
      }
    } else {
      logger.log(
        `🔄 ${t('commit_er_exist').d('Routine exists, updating the code')}`
      );
      if (argv.description) {
        description = argv.description as string;
      } else {
        description = await descriptionInput(
          `🖊️ ${t('commit_version_description').d('Enter a description for the version')}:`,
          false
        );
      }
      action = 'Updating';
    }

    const code = readEdgeRoutineFile() || '';

    if (action === 'Creating') {
      const edgeRoutineProps: EdgeRoutineProps = {
        name: projectConfig.name,
        code,
        description: ''
      };

      await createEdgeRoutine(edgeRoutineProps);
    }

    if (
      routineType === EDGE_ROUTINE_TYPE.JS_ONLY ||
      routineType === EDGE_ROUTINE_TYPE.NOT_EXIST
    ) {
      const versionProps: EdgeRoutineProps = {
        name: projectConfig.name,
        code,
        description: description
      };

      const uploadResult = await uploadEdgeRoutineCode(versionProps);
      if (uploadResult) {
        await releaseOfficialVersion(versionProps);
      }
    } else {
      const isSuccess = await server.createRoutineWithAssetsCodeVersion(
        {
          Name: projectConfig.name,
          CodeDescription: description
        },
        zip?.toBuffer() as Buffer
      );
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
  } catch (error) {
    logger.error(
      `${t('common_error_occurred').d('An error occurred:')} ${error}`
    );
  }
}

export async function createEdgeRoutine(
  edgeRoutine: CreateRoutineReq
): Promise<boolean> {
  try {
    const server = await ApiService.getInstance();
    const res = await server.createRoutine(edgeRoutine);
    const createResult = res?.data.Status === 'OK';
    if (!createResult) {
      logger.error(
        t('commit_create_er_fail').d(
          'An error occurred while trying to create a routine'
        )
      );
      return false;
    }
    logger.success(
      t('commit_create_er_success').d('Routine created successfully.')
    );

    const routineType = checkConfigRoutineType();

    if (
      routineType === EDGE_ROUTINE_TYPE.JS_ONLY ||
      routineType === EDGE_ROUTINE_TYPE.NOT_EXIST
    ) {
      const code = readEdgeRoutineFile() || '';
      edgeRoutine.code = code;
      return await uploadEdgeRoutineCode(edgeRoutine);
    }
    return true;
  } catch (error) {
    logger.error(
      `${t('common_error_occurred').d('An error occurred:')} ${error}`
    );
    return false;
  }
}

export async function uploadEdgeRoutineCode(
  edgeRoutine: EdgeRoutineProps
): Promise<boolean> {
  try {
    const server = await ApiService.getInstance();
    const uploadResult =
      await server.getRoutineStagingCodeUploadInfo(edgeRoutine);
    if (!uploadResult) {
      logger.error(
        t('commit_upload_fail').d(
          'An error occurred while trying to upload your code'
        )
      );
      process.exit(0);
    }

    logger.success(t('commit_upload_success').d('Code uploaded successfully.'));
    return true;
  } catch (error) {
    logger.error(
      `${t('common_error_occurred').d('An error occurred:')} ${error}`
    );
    process.exit(0);
  }
}

export async function releaseOfficialVersion(
  edgeRoutine: EdgeRoutineProps
): Promise<boolean> {
  const param = {
    Name: edgeRoutine.name,
    CodeDescription: edgeRoutine.description ?? ''
  };
  const server = await ApiService.getInstance();
  const commitResult = await server.commitRoutineStagingCode(param);

  if (commitResult) {
    logger.success(
      t('commit_success').d('Code version committed successfully.')
    );
    return true;
  } else {
    logger.error(
      t('commit_fail').d('An error occurred while trying to commit your code.')
    );
    return false;
  }
}
