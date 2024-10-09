import chalk from 'chalk';
import logger from '../../libs/logger.js';
import {
  checkDirectory,
  checkIsLoginSuccess,
  isValidRouteForDomain
} from '../utils.js';
import { getProjectConfig } from '../../utils/fileUtils/index.js';
import {
  CreateRoutineRelatedRouteReq,
  ListSitesReq
} from '../../libs/interface.js';
import { ApiService } from '../../libs/apiService.js';
import t from '../../i18n/index.js';
import { descriptionInput } from '../../components/descriptionInput.js';
import { promptFilterSelector } from '../../components/filterSelector.js';
import { CommandModule, ArgumentsCamelCase, Argv } from 'yargs';
import { validRoutine } from '../../utils/checkIsRoutineCreated.js';

const addRoute: CommandModule = {
  command: 'add [route] [site]',
  describe: `📥 ${t('route_add_describe').d('Bind a Route to a routine')}`,
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

  // input route and site
  const { route, site } = argv;

  const listSitesReq: ListSitesReq = {
    SiteSearchType: 'fuzzy',
    Status: 'active',
    PageNumber: 1,
    PageSize: 500
  };
  const server = await ApiService.getInstance();
  const ListSitesRes = await server.listSites(listSitesReq);
  const siteList = (ListSitesRes?.data.Sites || []).map((i: any) => ({
    label: i.SiteName,
    value: i.SiteId
  }));

  if (route && site) {
    const siteId = siteList.find((item) => item.label === site)?.value;
    const req: CreateRoutineRelatedRouteReq = {
      Name: projectConfig.name,
      SiteId: Number(siteId),
      SiteName: String(site),
      Route: String(route)
    };
    const res = await server.createRoutineRelatedRoute(req);
    const addSuccess = res?.data?.Status === 'OK';
    if (addSuccess) {
      logger.success(t('route_add_success').d('Add route success!'));
    } else {
      logger.error(t('route_add_fail').d('Add route fail!'));
    }
    return;
  }

  logger.warn(t('interactive_mode').d('Interactive mode'));

  // not input route and site, enter interactive mode

  logger.log(
    `🖊️ ${t('domain_input').d('Enter the name of domain (Support fuzzy matching on tab press):')}`
  );
  const domain = await promptFilterSelector(siteList);

  const inputRoute = await descriptionInput(
    `🖊️ ${t('route_input').d('Enter a Route:')} (${chalk.green(t('route_validate').d('You can add an asterisk (*) as the prefix or suffix to match more URLs, such as "*.example.com/*".'))})`,
    true
  );
  const ROUTE_PATTERN =
    /^(?:\*\.)?([a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*\.[a-zA-Z]{2,})(\/\*|\/[^?#]*)?$/;

  if (!ROUTE_PATTERN.test(inputRoute)) {
    return logger.error(t('route_add_invalid_route').d('Invalid route'));
  }
  if (!isValidRouteForDomain(inputRoute, domain.label)) {
    return logger.error(
      t('route_site_not_match').d(
        'The route does not correspond to the domain.'
      )
    );
  }

  if (domain.value !== '') {
    const req: CreateRoutineRelatedRouteReq = {
      Name: projectConfig.name,
      SiteId: Number(domain.value),
      SiteName: domain.label,
      Route: inputRoute
    };
    const res = await server.createRoutineRelatedRoute(req);
    const addSuccess = res?.data?.Status === 'OK';
    if (addSuccess) {
      logger.success(t('route_add_success').d('Add route success!'));
    } else {
      logger.error(t('route_add_fail').d('Add route fail!'));
    }
  } else {
    logger.error(t('invalid_domain').d('Input domain is invalid'));
  }
}

export default addRoute;
