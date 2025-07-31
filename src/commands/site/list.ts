import chalk from 'chalk';
import { CommandModule, Argv } from 'yargs';

import t from '../../i18n/index.js';
import { ApiService } from '../../libs/apiService.js';
import { ListSitesReq } from '../../libs/interface.js';
import logger from '../../libs/logger.js';
import { checkIsLoginSuccess } from '../utils.js';

const list: CommandModule = {
  command: 'list',
  describe: `📋 ${t('site_describe_list').d('List all your sites')}`,
  builder: (yargs: Argv) => {
    return yargs.usage(`${t('common_usage').d('Usage')}: \$0 list []`);
  },
  handler: async () => {
    handleList();
  }
};

export default list;

export async function handleList() {
  const isSuccess = await checkIsLoginSuccess();
  if (!isSuccess) return;
  const server = await ApiService.getInstance();

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
