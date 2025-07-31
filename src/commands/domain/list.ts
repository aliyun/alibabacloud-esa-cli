import { CommandModule } from 'yargs';

import t from '../../i18n/index.js';
import { ApiService } from '../../libs/apiService.js';
import {
  ListRoutineRelatedRecordsReq,
  RelatedRecordProps
} from '../../libs/interface.js';
import logger from '../../libs/logger.js';
import { validRoutine } from '../../utils/checkIsRoutineCreated.js';
import { getProjectConfig } from '../../utils/fileUtils/index.js';
import { checkDirectory, checkIsLoginSuccess } from '../utils.js';

const listDomain: CommandModule = {
  command: 'list',
  describe: `🔍 ${t('domain_list_describe').d('List all related domains')}`,
  handler: async () => {
    handleListDomains();
  }
};

export default listDomain;

export async function handleListDomains() {
  if (!checkDirectory()) {
    return;
  }

  const projectConfig = getProjectConfig();
  if (!projectConfig) return logger.notInProject();

  const isSuccess = await checkIsLoginSuccess();
  if (!isSuccess) return;

  await validRoutine(projectConfig.name);

  const server = await ApiService.getInstance();

  const req: ListRoutineRelatedRecordsReq = { Name: projectConfig.name };
  const res = await server.listRoutineRelatedRecords(req);

  if (!res) return;
  const relatedRecords: RelatedRecordProps[] = res.data?.RelatedRecords ?? [];

  if (relatedRecords.length === 0) {
    logger.log(`🙅 ${t('domain_list_empty').d('No related domains found')}`);
    return;
  }
  const domainList = relatedRecords.map((record) => record.RecordName);
  logger.log(`📃 ${t('domain_list_title').d('Related domains:')}`);
  logger.tree(domainList);
}
