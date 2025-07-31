import { CommandModule } from 'yargs';

import SelectItems, { SelectItem } from '../components/selectInput.js';
import t from '../i18n/index.js';
import logger from '../libs/logger.js';
import { updateCliConfigFile } from '../utils/fileUtils/index.js';

const docs: CommandModule = {
  command: 'lang',
  describe: `🌐 ${t('lang_describe').d('Set the language of the CLI')}`,
  handler: async () => {
    SelectItems({
      items: [
        { label: 'English', value: 'en' },
        { label: '简体中文', value: 'zh_CN' }
      ],
      handleSelect: async (item: SelectItem) => {
        await updateCliConfigFile({
          lang: item.value
        });
        logger.success(t('lang_success').d('Language switched'));
      }
    });
  }
};

export default docs;
