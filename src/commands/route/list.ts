import { CommandModule } from 'yargs';
import { getProjectConfig } from '../../utils/fileUtils/index.js';
import { RelatedRouteProps } from '../../libs/interface.js';
import Table from 'cli-table3';
import { checkDirectory, checkIsLoginSuccess } from '../utils.js';
import logger from '../../libs/logger.js';
import t from '../../i18n/index.js';
import { validRoutine } from '../../utils/checkIsRoutineCreated.js';
import api from '../../libs/api.js';
import { transferRuleStringToRoute } from './helper.js';

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

  const req = {
    routineName: projectConfig.name
  };

  const res = await api.listRoutineRoutes(req as any);
  const configs = res.body?.configs || [];

  if (configs.length === 0) {
    logger.warn(`🙅 ${t('route_list_empty').d('No related routes found')}`);
    return;
  }
  const simpleRoutes = configs
    .filter((item) => item.mode !== 'custom')
    .map((config) => {
      return {
        RouteName: config.routeName ?? '',
        Route: transferRuleStringToRoute(config.rule ?? ''),
        SiteName: config.siteName ?? ''
      };
    });
  if (simpleRoutes.length > 0) {
    logger.log(
      `📃 ${t('route_list_simple_title').d('Related simple mode routes')}:`
    );
    displayRelatedRouteList(simpleRoutes);
  }

  const customRoutes = configs
    .filter((item) => item.mode === 'custom')
    .map((config) => {
      return {
        RouteName: config.routeName ?? '',
        Route: config.rule ?? '',
        SiteName: config.siteName ?? ''
      };
    });
  if (customRoutes.length > 0) {
    logger.log(
      `📃 ${t('route_list_custom_title').d('Related custom mode routes')}:`
    );
    displayRelatedRouteRuleList(customRoutes);
  }
}

export async function displayRelatedRouteList(routeList: RelatedRouteProps[]) {
  const table = new Table({
    head: ['Route Name', 'Route', 'Site'],
    colWidths: [20]
  });
  for (let i = 0; i < routeList.length; i++) {
    const route = routeList[i];
    table.push([route.RouteName, route.Route, route.SiteName]);
  }
  console.log(table.toString());
}

export async function displayRelatedRouteRuleList(
  routeList: RelatedRouteProps[]
) {
  const table = new Table({
    head: ['Route Name', 'Rule', 'Site'],
    colWidths: [20]
  });
  for (let i = 0; i < routeList.length; i++) {
    const route = routeList[i];
    table.push([route.RouteName, route.Route, route.SiteName]);
  }
  console.log(table.toString());
}
