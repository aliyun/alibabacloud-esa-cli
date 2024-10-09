import { CommandModule, ArgumentsCamelCase, Argv } from 'yargs';
import { EdgeFunctionItem, ListSitesReq } from '../../libs/interface.js';
import Table from 'cli-table3';
import logger from '../../libs/logger.js';
import { Base64 } from 'js-base64';
import { checkIsLoginSuccess } from '../utils.js';
import chalk from 'chalk';
import { ApiService } from '../../libs/apiService.js';
import t from '../../i18n/index.js';

const list: CommandModule = {
  command: 'list',
  describe: `📋 ${t('list_describe').d('List all your routines')}`,
  builder: (yargs: Argv) => {
    return (
      yargs
        // .positional('deployment', {
        //   type: 'string',
        //   description: t('list_deployment_positional_describe').d(
        //     '(Optional) ID or URL of the deployment to tail. Specify by environment if deployment ID is unknown.'
        //   ),
        //   demandOption: true
        // })
        // .option('site', {
        //   alias: 's',
        //   describe: t('list_site_option_describe').d(
        //     'List all site names of your account'
        //   ),
        //   type: 'boolean',
        //   default: false
        // })
        .usage(`${t('common_usage').d('Usage')}: \$0 list []`)
    );
  },
  handler: async (argv: ArgumentsCamelCase) => {
    handleList(argv);
  }
};

export default list;

export async function handleList(argv: ArgumentsCamelCase) {
  const { site, ...args } = argv;
  const isSuccess = await checkIsLoginSuccess();
  if (!isSuccess) return;
  const server = await ApiService.getInstance();

  if (site) {
    const req: ListSitesReq = {
      SiteSearchType: 'fuzzy',
      Status: 'active',
      PageNumber: 1,
      PageSize: 50
    };
    const res = await server.listSites(req);
    const siteList = res?.data.Sites ?? [];
    const siteNameList: string[] = siteList?.map((item: any) => item.SiteName);
    logger.log(
      chalk.bold.bgGray(
        `📃 ${t('list_site_name_title').d('List all of site names')}:`
      )
    );
    logger.tree(siteNameList);
    return;
  }

  const res = await server.getRoutineUserInfo();
  const routineList = res?.Routines;
  if (routineList) {
    console.log(
      chalk.bold.bgGray(
        `📃 ${t('list_routine_name_title').d('List all of routine')}:`
      )
    );
    displayRoutineList(routineList);
  }
}

export async function displayRoutineList(versionList: EdgeFunctionItem[]) {
  const table = new Table({
    head: ['Name', 'Created', 'Description', 'Specification']
  });

  versionList.forEach((version) => {
    table.push([
      version.RoutineName,
      new Date(version.CreateTime).toLocaleString(),
      Base64.decode(version.Description),
      version.SpecName ?? ' '
    ]);
  });

  console.log(table.toString());
}
