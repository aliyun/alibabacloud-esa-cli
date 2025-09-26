import chalk from 'chalk';
import { CommandModule } from 'yargs';

import t from '../../i18n/index.js';
import { ApiService } from '../../libs/apiService.js';
import {
  GetRoutineReq,
  GetRoutineRes,
  GetRoutineStagingEnvIpRes
} from '../../libs/interface.js';
import logger from '../../libs/logger.js';
import { validRoutine } from '../../utils/checkIsRoutineCreated.js';
import { getProjectConfig } from '../../utils/fileUtils/index.js';
import { displayVersionList } from '../deploy/helper.js';
import { checkIsLoginSuccess, getRoutineCodeVersions } from '../utils.js';

const deploymentsList: CommandModule = {
  command: 'list',
  describe: `🔍 ${t('deployments_list_describe').d('List all deployments')}`,
  handler: async () => {
    handleListDeployments();
  }
};

export default deploymentsList;

export async function handleListDeployments() {
  const projectConfig = getProjectConfig();

  if (!projectConfig) return logger.notInProject();

  const isSuccess = await checkIsLoginSuccess();
  if (!isSuccess) return;

  await validRoutine(projectConfig.name);

  const server = await ApiService.getInstance();
  const req: GetRoutineReq = { Name: projectConfig.name };
  const routineDetail = await server.getRoutine(req);
  if (!routineDetail) return;

  const { allVersions, stagingVersions, productionVersions } =
    await getRoutineCodeVersions(projectConfig.name);

  await displayDeployingVersions(
    routineDetail,
    stagingVersions,
    productionVersions
  );
  await displayVersionList(allVersions, stagingVersions, productionVersions);
}

async function displayDeployingVersions(
  routineDetail: GetRoutineRes,
  stagingVersions: string[],
  productionVersions: string[]
) {
  const server = await ApiService.getInstance();
  const res: GetRoutineStagingEnvIpRes | null =
    await server.getRoutineStagingEnvIp();

  const stagingIpList = res?.data?.IPV4 ?? [];
  const coloredStagingIpList = stagingIpList.map((ip) => {
    return chalk.green(ip);
  });

  const showEnvTable = (version: string) => {
    const data: Record<string, string>[] = [{ Version: version }];

    logger.table([], data);
  };

  logger.log(chalk.bold(t('deploy_env_staging').d('Staging')));
  if (stagingIpList.length > 0) {
    logger.log(`Staging IP: ${coloredStagingIpList.join(', ')}`);
  }
  if (stagingVersions.length > 0) {
    showEnvTable(stagingVersions.join(','));
  }

  logger.block();
  logger.log(
    `${chalk.bold(`${t('deploy_env_production').d('Production')} ${chalk.green('●')}`)}`
  );
  if (productionVersions.length > 0) {
    showEnvTable(productionVersions.join(','));
  }

  logger.log(
    `${t('show_default_url').d(`You can visit:`)} ${chalk.yellowBright(routineDetail.data.DefaultRelatedRecord)}`
  );
  logger.info(routineDetail.data.DefaultRelatedRecord);
  logger.block();
}
