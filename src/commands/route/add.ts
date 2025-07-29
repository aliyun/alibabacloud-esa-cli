import inquirer from 'inquirer';
import { CommandModule, ArgumentsCamelCase, Argv } from 'yargs';

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
  describe: `🚄 ${t('route_add_describe').d('Bind a Route to a routine')}`,
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

  // 获取路由名称，支持直接通过参数传入
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
    if (argv._.length > 2) {
      siteName = argv._[2] as string;
    }

    // 如果仍未提供站点名称，则提示选择
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
      // 根据站点名称查找对应的站点ID
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
  } else {
    // 根据站点名称查找对应的站点ID
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

  // 获取路由值，支持直接通过参数传入
  let inputRoute = argv.route as string;
  if (!inputRoute) {
    // 如果参数中提供了路由值，使用它
    if (argv._.length > 1) {
      inputRoute = argv._[1] as string;
    }

    // 如果仍未提供路由值，则提示输入
    if (!inputRoute) {
      const response = await inquirer.prompt([
        {
          type: 'input',
          name: 'inputRoute',
          message: t('create_route_route').d(
            'Enter a Route (e.g., example.com/*):'
          ),
          validate: (input: string) => {
            if (!input) {
              return t('route_input_required').d('Route is required');
            }
            if (!input.includes('*') && !input.includes('/')) {
              return t('route_format_invalid').d(
                'Route format is invalid. Please include wildcard (*) or path (/)'
              );
            }
            return true;
          }
        }
      ]);
      inputRoute = response.inputRoute;
    }
  }

  const rule = transferRouteToRuleString(inputRoute as string);

  if (!rule) {
    logger.error(t('route_format_invalid').d('Invalid route format'));
    return;
  }

  // 获取站点名称用于显示
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
