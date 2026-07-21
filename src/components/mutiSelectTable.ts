import { multiselect, isCancel, cancel } from '@clack/prompts';

import t from '../i18n/index.js';

export interface TableItem {
  label: string;
}

/**
 * Multi-select prompt based on @clack/prompts.
 * Replaces the previous ink grid table; keeps the same signature so
 * existing call sites stay unchanged (itemsPerRow/boxWidth are obsolete).
 */
export const displayMultiSelectTable = async (
  items: TableItem[],
  _itemsPerRow = 7,
  _boxWidth = 25
): Promise<string[]> => {
  const value = await multiselect({
    message: t('deploy_select_table_tip').d(
      'Use arrow keys to move, space to select, and enter to submit.'
    ),
    options: items.map((item) => ({ label: item.label, value: item.label })),
    required: false
  });
  if (isCancel(value)) {
    cancel('Operation cancelled.');
    process.exit(130);
  }
  return value as string[];
};
