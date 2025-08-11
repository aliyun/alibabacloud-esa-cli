import path from 'path';
import { exit } from 'process';

import { ListRoutineCodeVersionsResponseBodyCodeVersions } from '@alicloud/esa20240910';
import chalk from 'chalk';
import moment from 'moment';
import { CommandModule, ArgumentsCamelCase, Argv } from 'yargs';

import t from '../../i18n/index.js';
import { ApiService } from '../../libs/apiService.js';
import {
  Environment,
  GetRoutineReq,
  PublishRoutineCodeVersionReq,
  PublishType
} from '../../libs/interface.js';
import logger from '../../libs/logger.js';
import {
  checkConfigRoutineType,
  EDGE_ROUTINE_TYPE
} from '../../utils/checkAssetsExist.js';
import { ensureRoutineExists } from '../../utils/checkIsRoutineCreated.js';
import compress from '../../utils/compress.js';
import {
  getProjectConfig,
  readEdgeRoutineFile
} from '../../utils/fileUtils/index.js';
import { ProjectConfig } from '../../utils/fileUtils/interface.js';
import { commitRoutineWithAssets } from '../commit/helper.js';
import prodBuild from '../commit/prodBuild.js';
import {
  checkDirectory,
  checkIsLoginSuccess,
  getRoutineVersionList
} from '../utils.js';

import { displaySelectDeployType, promptSelectVersion } from './helper.js';

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
        describe: t('deploy_quick_describe').d(
          'Quick deploy the routine to production environment'
        ),
        type: 'boolean'
      })
      .option('version', {
        alias: 'v',
        describe: t('deploy_option_version').d(
          'Version to deploy (skip interactive selection)'
        ),
        type: 'string'
      })
      .option('environment', {
        alias: 'e',
        describe: t('deploy_option_environment').d(
          'Environment to deploy to: staging or production (skip interactive selection)'
        ),
        type: 'string',
        choices: ['staging', 'production']
      })
      .option('name', {
        alias: 'n',
        describe: t('deploy_option_name').d('Name of the routine'),
        type: 'string'
      })
      .option('assets', {
        alias: 'a',
        describe: t('deploy_option_assets').d('Deploy assets'),
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
export async function handleDeploy(argv: ArgumentsCamelCase) {
  if (!checkDirectory()) {
    return;
  }

  const projectConfig = getProjectConfig();
  if (!projectConfig) return logger.notInProject();
  const projectName = (argv.name as string) || projectConfig.name;

  const isSuccess = await checkIsLoginSuccess();
  if (!isSuccess) return;

  const server = await ApiService.getInstance();
  await ensureRoutineExists(projectConfig.name);

  const req: GetRoutineReq = { Name: projectConfig.name };
  const routineDetail = await server.getRoutine(req, false);

  const versionList = await getRoutineVersionList(projectConfig.name);

  const entry = (argv.entry as string) || projectConfig.entry;
  const assets = (argv.assets as string) || projectConfig.assets?.directory;

  const stagingVersion = routineDetail?.data?.Envs[1]?.CodeVersion;
  const productionVersion = routineDetail?.data?.Envs[0]?.CodeVersion;

  if (argv.quick) {
    await quickDeploy(entry ?? '', projectConfig);
    exit(0);
  }

  if (versionList.length === 0 || argv.quick) {
    logger.log(
      t('no_formal_version_found').d(
        'No formal version found, you need to create a version first.'
      )
    );
    // create a new version
    const zip = await compress(entry, assets);
    const res = await commitRoutineWithAssets(
      {
        Name: projectName,
        CodeDescription: ''
      },
      zip?.toBuffer() as Buffer
    );
    const isSuccess = res?.isSuccess;
    if (isSuccess) {
      logger.success(
        t('quick_deploy_assets_success').d(
          'A new version has been successfully generated'
        )
      );
      logger.log(
        `👉 ${t('quick_deploy_success_guide').d('Run this command to add domains')}: ${chalk.green('esa domain add <DOMAIN>')}`
      );
    }

    const codeVersion = res?.res?.data?.CodeVersion;
    const deployRes = await server.publishRoutineCodeVersion({
      Name: projectName,
      CodeVersion: codeVersion,
      Env: Environment.Production
    });
    if (deployRes) {
      logger.success(
        t('quick_deploy_success').d('Your code has been successfully deployed')
      );
    } else {
      logger.error(t('quick_deploy_failed').d('Quick deploy failed'));
    }
  }

  await displayVersionList(versionList, stagingVersion, productionVersion);

  let selectedVersion: string;
  let selectedType: PublishType;

  // Check if version and/or environment are provided via command line arguments
  if (argv.version || argv.environment) {
    // Validate version if provided
    if (argv.version) {
      const versionExists = versionList.some(
        (v) => v.codeVersion === argv.version
      );
      if (!versionExists) {
        logger.error(
          t('deploy_version_not_found').d(`Version '${argv.version}' not found`)
        );
        return;
      }
      selectedVersion = argv.version as string;
      logger.log(
        chalk.bold(
          `${t('deploy_using_version').d('Using version')}: ${selectedVersion}`
        )
      );
    } else {
      // If version not provided, prompt for it
      logger.log(
        chalk.bold(
          `${t('deploy_version_select').d('Select the version you want to publish')}:`
        )
      );
      selectedVersion = await promptSelectVersion(versionList);
    }

    // Validate environment if provided
    if (argv.environment) {
      selectedType =
        (argv.environment as string) === 'staging'
          ? PublishType.Staging
          : PublishType.Production;
      logger.log(
        chalk.bold(
          `${t('deploy_using_environment').d('Using environment')}: ${argv.environment}`
        )
      );
    } else {
      // If environment not provided, prompt for it
      selectedType = await displaySelectDeployType();
    }
  } else {
    logger.log(
      chalk.bold(
        `${t('deploy_version_select').d('Select the version you want to publish')}:`
      )
    );

    selectedVersion = await promptSelectVersion(versionList);
    selectedType = await displaySelectDeployType();
  }

  await deploySelectedCodeVersion(projectName, selectedType, selectedVersion);
}

export async function quickDeploy(entry: string, projectConfig: ProjectConfig) {
  const server = await ApiService.getInstance();

  const routineType = checkConfigRoutineType();

  if (
    routineType === EDGE_ROUTINE_TYPE.ASSETS_ONLY ||
    routineType === EDGE_ROUTINE_TYPE.JS_AND_ASSETS
  ) {
    // Handle assets project
    logger.log(
      `🔔 ${t('quick_deploy_assets_detected').d('Static assets detected, deploying with assets support')}`
    );

    // Compress assets and code
    const zip = await compress();

    const res = await commitRoutineWithAssets(
      {
        Name: projectConfig.name,
        CodeDescription: 'Quick deploy with assets'
      },
      zip?.toBuffer() as Buffer
    );

    if (res) {
      logger.success(
        t('quick_deploy_assets_success').d(
          'Your code with assets has been successfully deployed'
        )
      );
      logger.log(
        `👉 ${t('quick_deploy_success_guide').d('Run this command to add domains')}: ${chalk.green('esa domain add <DOMAIN>')}`
      );
    } else {
      logger.error(
        t('quick_deploy_assets_failed').d('Quick deploy with assets failed')
      );
      throw Error(
        t('quick_deploy_assets_failed').d('Quick deploy with assets failed')
      );
    }
  } else {
    // Handle regular project without assets
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

  const res = await server.publishRoutineCodeVersion(param);

  if (res) {
    logger.success(
      t('deploy_success').d('Your code has been successfully deployed')
    );
    logger.log(
      `👉 ${t('deploy_success_guide').d('Run this command to add domains')}: ${chalk.green('esa domain add <DOMAIN>')}`
    );
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
