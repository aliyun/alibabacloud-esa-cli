import { CommandModule, ArgumentsCamelCase, Argv } from 'yargs';
import { getProjectConfig } from '../../utils/fileUtils/index.js';
import { GetRoutineReq, RelatedRouteProps } from '../../libs/interface.js';
import Table from 'cli-table3';
import { checkDirectory, checkIsLoginSuccess } from '../utils.js';
import { ApiService } from '../../libs/apiService.js';
import logger from '../../libs/logger.js';
import t from '../../i18n/index.js';
import { validRoutine } from '../../utils/checkIsRoutineCreated.js';

const listRoute: CommandModule = {
  command: 'list',
  describe: `🔍 ${t('route_list_describe').d('List all related routes')}`,
  handler: async () => {
    handleListRoutes();
  }
};

export default listRoute;

export async function handleListRoutes() {
  if (!checkDirectory()) {
    return;
  }

  const projectConfig = getProjectConfig();
  if (!projectConfig) return logger.notInProject();
  const isSuccess = await checkIsLoginSuccess();
  if (!isSuccess) return;

  await validRoutine(projectConfig.name);

  const server = await ApiService.getInstance();
  const req: GetRoutineReq = { Name: projectConfig.name };

  const routineDetail = await server.getRoutine(req);
  if (!routineDetail) return;
  const relatedRoutes: RelatedRouteProps[] =
    routineDetail.data?.RelatedRoutes ?? [];

  if (relatedRoutes.length === 0) {
    logger.warn(`🙅 ${t('route_list_empty').d('No related routes found')}`);
    return;
  }
  logger.log(`📃 ${t('route_list_title').d('Related routes')}:`);
  displayRelatedRouteList(relatedRoutes);
}

export async function displayRelatedRouteList(routeList: RelatedRouteProps[]) {
  const table = new Table({
    head: ['Route', 'Site']
  });
  for (let i = 0; i < routeList.length; i++) {
    const route = routeList[i];
    table.push([route.Route, route.SiteName]);
  }
  console.log(table.toString());
}
