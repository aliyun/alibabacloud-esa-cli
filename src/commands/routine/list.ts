import chalk from 'chalk';
import Table from 'cli-table3';
import moment from 'moment';
import { CommandModule, ArgumentsCamelCase, Argv } from 'yargs';

import t from '../../i18n/index.js';
import { ApiService } from '../../libs/apiService.js';
import { EdgeFunctionItem, ListSitesReq } from '../../libs/interface.js';
import logger from '../../libs/logger.js';
import { checkIsLoginSuccess } from '../utils.js';

const list: CommandModule = {
  command: 'list',
  describe: `📋 ${t('list_describe').d('List all your routines')}`,
  builder: (yargs: Argv) => {
    return yargs.usage(`${t('common_usage').d('Usage')}: \$0 list []`);
  },
  handler: async (argv: ArgumentsCamelCase) => {
    handleList(argv);
  }
};

export default list;

export async function handleList(argv: ArgumentsCamelCase) {
  const { site } = argv;
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

  const res = await server.listUserRoutines();
  const routineList = res?.body?.Routines;
  if (routineList) {
    logger.log(
      chalk.bold.bgGray(
        `📃 ${t('list_routine_name_title').d('List all of routine')}:`
      )
    );
    displayRoutineList(routineList);
  }
}

export async function displayRoutineList(versionList: EdgeFunctionItem[]) {
  const table = new Table({
    head: ['Name', 'Created', 'Description'],
    colWidths: [20, 25, 30]
  });
  versionList.forEach((version) => {
    table.push([
      version.RoutineName,
      moment(version.CreateTime).format('YYYY/MM/DD HH:mm:ss'),
      version.Description
    ]);
  });
  console.table(table.toString());
}
