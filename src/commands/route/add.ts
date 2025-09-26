import inquirer from 'inquirer';
import { CommandModule, ArgumentsCamelCase, Argv } from 'yargs';

import { routeBuilder } from '../../components/routeBuilder.js';
import t from '../../i18n/index.js';
import { ApiService } from '../../libs/apiService.js';
import { ListSitesReq } from '../../libs/interface.js';
import logger from '../../libs/logger.js';
import { validRoutine } from '../../utils/checkIsRoutineCreated.js';
import { getProjectConfig } from '../../utils/fileUtils/index.js';
import { checkDirectory, checkIsLoginSuccess } from '../utils.js';

import { transferRouteToRuleString } from './helper.js';

const addRoute: CommandModule = {
  command: 'add [route] [site]',
  describe: `🚄 ${t('route_add_describe').d('Bind a Route to a project')}`,
  builder: (yargs: Argv) => {
    return yargs
      .option('route', {
        describe: t('route_add_route_value_option').d(
          'The route value. For example: example.com/*'
        ),
        alias: 'r',
        type: 'string'
      })
      .option('site', {
        describe: t('route_add_site_describe').d(
          'The site to bind the route to. For example: example.com'
        ),
        alias: 's',
        type: 'string'
      })

      .option('alias', {
        alias: 'a',
        describe: t('route_add_route_name_option').d('Route name (aliases)'),
        type: 'string'
      })

      .fail((msg, err, yargsIns) => {
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

  if (!ListSitesRes?.data?.Sites || ListSitesRes.data.Sites.length === 0) {
    logger.error(
      t('no_active_sites').d('No active sites found in your account')
    );
    return;
  }

  const siteList = ListSitesRes.data.Sites.map((i: any) => ({
    name: i.SiteName,
    value: i.SiteId
  }));

  let routeName = argv.alias as string;
  if (!routeName) {
    const response = await inquirer.prompt([
      {
        type: 'input',
        name: 'routeName',
        message: t('create_route_route_name').d(
          'Enter a Route Name (Aliases):'
        ),
        validate: (input: string) => {
          if (!input) {
            return t('route_name_input_required').d('Route name is required');
          }
          return true;
        }
      }
    ]);
    routeName = response.routeName;
  }

  let siteName = argv.site as string;
  let siteId: string | number;

  if (!siteName) {
    const response = await inquirer.prompt([
      {
        type: 'list',
        name: 'routeSite',
        message: t('create_route_site').d(
          'Select a site that is active in your account:'
        ),
        choices: siteList
      }
    ]);
    siteId = response.routeSite;
  } else {
    // Find corresponding site ID by site name
    const matchedSite = siteList.find((site: any) => site.name === siteName);
    if (matchedSite) {
      siteId = matchedSite.value;
    } else {
      logger.error(
        t('site_not_found').d(`Site "${siteName}" not found in your account`)
      );
      return;
    }
  }

  let inputRoute = argv.route as string;
  if (!inputRoute) {
    // Get selected site name for route building
    const selectedSite = siteList.find((site: any) => site.value === siteId);
    const displaySiteName = selectedSite ? selectedSite.name : siteName;

    // Use route builder
    const builtRoute = await routeBuilder(displaySiteName);
    if (!builtRoute) {
      logger.info(t('route_build_cancelled').d('Route building cancelled'));
      return;
    }
    inputRoute = builtRoute;
  }

  const rule = transferRouteToRuleString(inputRoute as string);

  if (!rule) {
    logger.error(t('route_format_invalid').d('Invalid route format'));
    return;
  }

  const selectedSite = siteList.find((site: any) => site.value === siteId);
  const displaySiteName = selectedSite ? selectedSite.name : siteName;

  const req = {
    RoutineName: projectConfig.name,
    RouteName: routeName,
    SiteId: siteId,
    RouteEnable: 'on',
    Bypass: 'off',
    Rule: rule
  };

  try {
    logger.info(t('creating_route').d('Creating route...'));
    const res = await server.createRoutineRoute(req as any);

    const addSuccess = res?.code === 200;
    if (addSuccess) {
      logger.success(t('route_add_success').d('Add route success!'));
      logger.info(
        `Route "${routeName}" has been successfully added to routine "${projectConfig.name}" for site "${displaySiteName}"`
      );
    } else {
      logger.error(t('route_add_fail').d('Add route fail!'));
    }
  } catch (error) {
    logger.error(t('route_add_fail').d('Add route fail!'));
    if (error instanceof Error) {
      logger.error(`Error: ${error.message}`);
    }
  }
}

export default addRoute;
