import { select, isCancel, cancel } from '@clack/prompts';

export interface SelectItem {
  label: string;
  value: string;
  key?: string;
  children?: SelectItem[];
}

export interface Props {
  items: SelectItem[];
  handleSelect: (item: SelectItem) => Promise<void> | void;
  message?: string;
}

/**
 * Single-choice select prompt based on @clack/prompts.
 * Keeps the callback-style API of the previous ink implementation
 * so existing call sites stay unchanged.
 */
const SelectItems = async ({
  items,
  handleSelect,
  message = 'Please select'
}: Props): Promise<void> => {
  const value = await select({
    message,
    options: items.map((item) => ({ label: item.label, value: item.value }))
  });
  if (isCancel(value)) {
    cancel('Operation cancelled.');
    process.exit(130);
  }
  const selected = items.find((item) => item.value === value);
  if (selected) {
    await handleSelect(selected);
  }
};

export default SelectItems;
