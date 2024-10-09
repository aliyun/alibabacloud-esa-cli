import { CommandModule, Argv, ArgumentsCamelCase } from 'yargs';
import {
  getProjectConfig,
  readEdgeRoutineFile
} from '../../utils/fileUtils/index.js';
import { checkDirectory, checkIsLoginSuccess } from '../utils.js';
import {
  CreateRoutineReq,
  EdgeRoutineProps,
  GetRoutineReq
} from '../../libs/interface.js';
import { displaySelectSpec } from '../deploy/index.js';
import { descriptionInput } from '../../components/descriptionInput.js';
import { ApiService } from '../../libs/apiService.js';
import prodBuild from './prodBuild.js';
import logger from '../../libs/logger.js';
import t from '../../i18n/index.js';
import { exit } from 'process';

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
      .positional('entry', {
        describe: t('dev_entry_describe').d('Entry file of the Routine'),
        type: 'string',
        demandOption: false
      });
  },
  handler: async (argv: ArgumentsCamelCase) => {
    handleCommit(argv);
  }
};

export default commit;

export async function handleCommit(argv: ArgumentsCamelCase) {
  if (!checkDirectory()) return;

  const projectConfig = getProjectConfig();
  if (!projectConfig) return logger.notInProject();

  if (!(await checkIsLoginSuccess())) return;

  await prodBuild(!!argv.minify, argv?.entry as string);

  try {
    const server = await ApiService.getInstance();
    const req: GetRoutineReq = { Name: projectConfig.name };
    const response = await server.getRoutine(req, false);
    let specName = response?.data.Envs[0].SpecName ?? '50ms';
    let action = 'Creating';
    let description;

    if (!response) {
      logger.log(
        `🙅 ${t('commit_er_not_exist').d('No routine found, creating a new one')}`
      );
      description = await descriptionInput(
        `🖊️ ${t('commit_er_description').d('Enter a description for the routine')}:`,
        false
      );
      const specList = await server.listRoutineSpecs();
      specName = await displaySelectSpec(specList?.data.Specs ?? []);
    } else {
      logger.log(
        `🔄 ${t('commit_er_exist').d('Routine exists, updating the code')}`
      );
      description = await descriptionInput(
        `🖊️ ${t('commit_version_description').d('Enter a description for the version')}:`,
        false
      );
      action = 'Updating';
    }

    const code = readEdgeRoutineFile() || '';
    const edgeRoutine: CreateRoutineReq = {
      name: projectConfig.name,
      code,
      description,
      specName
    };

    if (action === 'Creating') {
      await createEdgeRoutine(edgeRoutine);
    } else {
      if (!(await uploadEdgeRoutineCode(edgeRoutine))) return;
      await releaseOfficialVersion(edgeRoutine);
    }
    exit(0);
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
    return await uploadEdgeRoutineCode(edgeRoutine);
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
      return false;
    }
    logger.success(t('commit_upload_success').d('Code uploaded successfully.'));
    return true;
  } catch (error) {
    logger.error(
      `${t('common_error_occurred').d('An error occurred:')} ${error}`
    );
    return false;
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
