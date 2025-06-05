import { CommandModule, ArgumentsCamelCase, Argv } from 'yargs';
import chalk from 'chalk';
import {
  getProjectConfig,
  readEdgeRoutineFile
} from '../../utils/fileUtils/index.js';

import {
  Environment,
  GetRoutineReq,
  PublishRoutineCodeVersionReq,
  PublishType
} from '../../libs/interface.js';
import logger from '../../libs/logger.js';
import {
  checkDirectory,
  checkIsLoginSuccess,
  getRoutineVersionList
} from '../utils.js';
import { ProjectConfig } from '../../utils/fileUtils/interface.js';
import { ApiService } from '../../libs/apiService.js';
import {
  createAndDeployVersion,
  displaySelectDeployType,
  promptSelectVersion,
  yesNoPromptAndExecute
} from './helper.js';
import t from '../../i18n/index.js';
import prodBuild from '../commit/prodBuild.js';
import { exit } from 'process';
import path from 'path';
import { checkRoutineExist } from '../../utils/checkIsRoutineCreated.js';
import moment from 'moment';
import { ListRoutineCodeVersionsResponseBodyCodeVersions } from '@alicloud/esa20240910';

const deploy: CommandModule = {
  command: 'deploy [entry]',
  builder: (yargs: Argv) => {
    return yargs
      .positional('entry', {
        describe: t('dev_entry_describe').d('Entry file of the Routine'),
        type: 'string',
        demandOption: false
      })
      .option('quick', {
        alias: 'q',
        type: 'boolean'
      });
  },
  describe: `🚀 ${t('deploy_describe').d('Deploy your project')}`,
  handler: async (argv: ArgumentsCamelCase) => {
    await handleDeploy(argv);
    exit();
  }
};

export default deploy;

export async function quickDeploy(entry: string, projectConfig: ProjectConfig) {
  const server = await ApiService.getInstance();
  const entryFile = path.resolve(entry ?? '', 'src/index.js');

  await prodBuild(false, entryFile, entry);
  const code = readEdgeRoutineFile(entry) || '';

  const res = await server.quickDeployRoutine({
    name: projectConfig.name,
    code: code
  });
  if (res) {
    logger.success(
      t('quick_deploy_success').d('Your code has been successfully deployed')
    );
    logger.log(
      `👉 ${t('quick_deploy_success_guide').d('Run this command to add domains')}: ${chalk.green('esa domain add <DOMAIN>')}`
    );
  } else {
    logger.error(t('quick_deploy_failed').d('Quick deploy failed'));
    throw Error(t('quick_deploy_failed').d('Quick deploy failed'));
  }
}

export async function handleDeploy(argv: ArgumentsCamelCase) {
  if (!checkDirectory()) {
    return;
  }

  const projectConfig = getProjectConfig();
  if (!projectConfig) return logger.notInProject();

  const isSuccess = await checkIsLoginSuccess();
  if (!isSuccess) return;

  const server = await ApiService.getInstance();
  const entry = argv.entry as string;
  await checkRoutineExist(projectConfig.name, entry);

  const req: GetRoutineReq = { Name: projectConfig.name };
  const routineDetail = await server.getRoutine(req, false);

  const versionList = await getRoutineVersionList(projectConfig.name);
  const customEntry = argv.entry as string;

  const stagingVersion = routineDetail?.data?.Envs[1]?.CodeVersion;
  const productionVersion = routineDetail?.data?.Envs[0]?.CodeVersion;
  if (argv.quick) {
    await quickDeploy(customEntry, projectConfig);
    exit(0);
  }

  if (versionList.length === 0) {
    logger.log(
      t('no_formal_version_found').d(
        'No formal version found, you need to create a version first.'
      )
    );
    await handleOnlyUnstableVersionFound(projectConfig, customEntry);
  } else {
    await displayVersionList(versionList, stagingVersion, productionVersion);
    logger.log(
      chalk.bold(
        `${t('deploy_version_select').d('Select the version you want to publish')}:`
      )
    );

    const selectedVersion = await promptSelectVersion(versionList);
    const selectedType = await displaySelectDeployType();

    await deploySelectedCodeVersion(
      projectConfig.name,
      selectedType,
      selectedVersion
    );
  }
}

async function handleNoVersionsFound(
  projectConfig: ProjectConfig,
  customEntry?: string
): Promise<void> {
  logger.log(
    `😄 ${t('deploy_first_time').d("This is first time to deploy. Let's create a version first!")}`
  );
  const created = await yesNoPromptAndExecute(
    `📃 ${t('deploy_create_formal_version_ques').d('Do you want to create an unstable version now?')}`,
    () => createAndDeployVersion(projectConfig, true)
  );
  if (created) {
    await handleOnlyUnstableVersionFound(projectConfig);
  }
}

async function promptAndDeployVersion(projectConfig: ProjectConfig) {
  const versionList = await getRoutineVersionList(projectConfig.name);
  await displayVersionList(versionList);
  logger.log(
    `📃 ${t('deploy_select_version').d("Select which version you'd like to deploy")}`
  );
  const selectedVersion = await promptSelectVersion(versionList);
  const selectedType = await displaySelectDeployType();

  await deploySelectedCodeVersion(
    projectConfig.name,
    selectedType,
    selectedVersion
  );
}

export async function handleOnlyUnstableVersionFound(
  projectConfig: ProjectConfig,
  customEntry?: string
) {
  const created = await yesNoPromptAndExecute(
    `📃 ${t('deploy_create_formal_version_ques').d('Do you want to create a formal version to deploy on production environment?')}`,
    () => createAndDeployVersion(projectConfig)
  );
  if (created) {
    await promptAndDeployVersion(projectConfig);
  }
}

export async function deploySelectedCodeVersion(
  name: string,
  selectedType: PublishType,
  version: string
): Promise<void> {
  const server = await ApiService.getInstance();

  const param: PublishRoutineCodeVersionReq = {
    Name: name,
    Env:
      selectedType === PublishType.Staging
        ? Environment.Staging
        : Environment.Production
  };

  param.CodeVersion = version;

  try {
    const res = await server.publishRoutineCodeVersion(param);

    if (res) {
      logger.success(
        t('deploy_success').d('Your code has been successfully deployed')
      );
      logger.log(
        `👉 ${t('deploy_success_guide').d('Run this command to add domains')}: ${chalk.green('esa domain add <DOMAIN>')}`
      );
    }
  } catch (e) {
    console.error(e);
  }
}

export async function displayVersionList(
  versionList: ListRoutineCodeVersionsResponseBodyCodeVersions[],
  stagingVersion = 'unstable',
  productionVersion = 'unstable'
) {
  logger.log(
    `${chalk.bgYellow('Active')} ${t('deploy_env_staging').d('Staging')}`
  );
  logger.log(
    `${chalk.bgGreen('Active')} ${t('deploy_env_production').d('Production')}`
  );

  const data: string[][] = [];
  for (let i = 0; i < versionList.length; i++) {
    const version = versionList[i];
    const createTime = moment(version.createTime).format('YYYY/MM/DD HH:mm:ss');
    const tags = [
      version.codeVersion === stagingVersion ? chalk.bgYellow('Active') : '',
      version.codeVersion === productionVersion ? chalk.bgGreen('Active') : ''
    ];

    data.push([
      `${version.codeVersion} ${tags.join(' ')}`,
      createTime,
      version.codeDescription ?? ''
    ]);
  }

  logger.table(
    [
      t('deploy_table_header_version').d('Version'),
      t('deploy_table_header_created').d('Created'),
      t('deploy_table_header_description').d('Description')
    ],
    data,
    [30, 25, 15]
  );
}
