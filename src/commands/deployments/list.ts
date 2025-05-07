import { CommandModule, ArgumentsCamelCase, Argv } from 'yargs';
import { displayVersionList } from '../deploy/index.js';
import {
  checkDirectory,
  checkIsLoginSuccess,
  getRoutineVersionList
} from '../utils.js';
import { getProjectConfig } from '../../utils/fileUtils/index.js';
import {
  GetRoutineReq,
  GetRoutineRes,
  GetRoutineStagingEnvIpRes
} from '../../libs/interface.js';
import chalk from 'chalk';
import { ApiService } from '../../libs/apiService.js';
import t from '../../i18n/index.js';
import logger from '../../libs/logger.js';
import { validRoutine } from '../../utils/checkIsRoutineCreated.js';

const deploymentsList: CommandModule = {
  command: 'list',
  describe: `🔍 ${t('deployments_list_describe').d('List all deployments')}`,
  handler: async (argv: ArgumentsCamelCase) => {
    handleListDeployments(argv);
  }
};

export default deploymentsList;

export async function handleListDeployments(argv: ArgumentsCamelCase) {
  if (!checkDirectory()) {
    return;
  }
  const projectConfig = getProjectConfig();
  if (!projectConfig) return logger.notInProject();

  const isSuccess = await checkIsLoginSuccess();
  if (!isSuccess) return;

  await validRoutine(projectConfig.name);

  const server = await ApiService.getInstance();

  const versionList = await getRoutineVersionList(projectConfig.name);
  const req: GetRoutineReq = { Name: projectConfig.name };
  const routineDetail = await server.getRoutine(req);

  if (!routineDetail) return;

  //测试环境版本
  const stagingVersion = routineDetail?.data?.Envs[1]?.CodeVersion;
  //生产环境版本
  const productionVersion = routineDetail?.data?.Envs[0]?.CodeVersion;

  await displayListPrompt(routineDetail);
  await displayVersionList(versionList, stagingVersion, productionVersion);
}

async function displayListPrompt(routineDetail: GetRoutineRes) {
  const isCanary =
    (routineDetail.data.Envs[0].CanaryAreaList ?? []).length !== 0;
  const canaryEnv = routineDetail.data.Envs[0];
  const stagingEnv = routineDetail.data.Envs[1];

  const server = await ApiService.getInstance();
  const res: GetRoutineStagingEnvIpRes | null =
    await server.getRoutineStagingEnvIp();

  const stagingIpList = res?.data?.IPV4 ?? [];
  const coloredStagingIpList = stagingIpList.map((ip) => {
    return chalk.green(ip);
  });

  const showEnvTable = (version: string, region?: string) => {
    const data: Record<string, string>[] = [{ Version: version }];

    if (region) {
      data.push({ Region: region });
    }

    logger.table([], data);
  };

  logger.log(chalk.bold(t('deploy_env_staging').d('Staging')));
  if (stagingIpList.length > 0) {
    logger.log(`Staging IP: ${coloredStagingIpList.join(', ')}`);
  }
  showEnvTable(stagingEnv.CodeVersion);
  logger.block();
  logger.log(
    `${chalk.bold(`${t('deploy_env_production').d('Production')} ${!isCanary ? chalk.green('●') : ''}`)}`
  );
  showEnvTable(canaryEnv.CodeVersion);
  logger.block();

  logger.log(
    `${chalk.bold(`${t('deploy_env_canary').d('Canary')} ${isCanary ? chalk.green('●') : ''}`)}`
  );

  showEnvTable(
    canaryEnv.CanaryCodeVersion ?? '',
    canaryEnv.CanaryAreaList?.join(', ')
  );
  logger.log(
    `${t('show_default_url').d(`You can visit:`)} ${chalk.yellowBright(routineDetail.data.DefaultRelatedRecord)}`
  );
  logger.info(routineDetail.data.DefaultRelatedRecord);
  logger.block();
}
