import logger from '../../libs/logger.js';
import { checkDirectory, checkIsLoginSuccess } from '../utils.js';
import { getProjectConfig } from '../../utils/fileUtils/index.js';
import { ListSitesReq } from '../../libs/interface.js';
import { ApiService } from '../../libs/apiService.js';
import t from '../../i18n/index.js';
import { CommandModule, ArgumentsCamelCase, Argv } from 'yargs';
import { validRoutine } from '../../utils/checkIsRoutineCreated.js';
import inquirer from 'inquirer';
import { transferRouteToRuleString } from './helper.js';

const addRoute: CommandModule = {
  command: 'add [route] [site]',
  describe: `🚄 ${t('route_add_describe').d('Bind a Route to a routine')}`,
  builder: (yargs: Argv) => {
    return yargs.fail((msg, err, yargsIns) => {
      if (err) throw err;
      if (msg) {
        console.error(msg);
        yargsIns.showHelp('log');
      }
      process.exit(1);
    });
  },
  handler: async (argv: ArgumentsCamelCase) => {
    handlerAddRoute(argv);
  }
};

export async function handlerAddRoute(argv: ArgumentsCamelCase) {
  if (!checkDirectory()) {
    return;
  }
  const projectConfig = getProjectConfig();
  if (!projectConfig) return logger.notInProject();
  const isSuccess = await checkIsLoginSuccess();
  if (!isSuccess) return;
  await validRoutine(projectConfig.name);

  const listSitesReq: ListSitesReq = {
    SiteSearchType: 'fuzzy',
    Status: 'active',
    PageNumber: 1,
    PageSize: 500
  };
  const server = await ApiService.getInstance();
  const ListSitesRes = await server.listSites(listSitesReq);
  const siteList = (ListSitesRes?.data.Sites || []).map((i: any) => ({
    name: i.SiteName,
    value: i.SiteId
  }));

  const { routeName } = await inquirer.prompt([
    {
      type: 'input',
      name: 'routeName',
      message: t('create_route_route_name').d('Enter a Route Name (Aliases):'),
      validate: (input: string) => {
        if (!input) {
          return t('route_name_input_required').d('Route name is required');
        }
        return true;
      }
    }
  ]);

  const { routeSite } = await inquirer.prompt([
    {
      type: 'list',
      name: 'routeSite',
      message: t('create_route_site').d(
        'Select a site that is active in your account:'
      ),
      choices: siteList
    }
  ]);

  const { inputRoute } = await inquirer.prompt([
    {
      type: 'input',
      name: 'inputRoute',
      message: t('create_route_route').d('Enter a Route:'),
      validate: (input: string) => {
        if (!input) {
          return t('route_input_required').d('Route is required');
        }
        return true;
      }
    }
  ]);
  const rule = transferRouteToRuleString(inputRoute as string);

  const req = {
    RoutineName: projectConfig.name,
    RouteName: routeName,
    SiteId: routeSite,
    RouteEnable: 'on',
    Bypass: 'off',
    Rule: rule
  };

  const res = await server.createRoutineRoute(req as any);

  const addSuccess = res?.code === 200;
  if (addSuccess) {
    logger.success(t('route_add_success').d('Add route success!'));
  } else {
    logger.error(t('route_add_fail').d('Add route fail!'));
  }
}

export default addRoute;
