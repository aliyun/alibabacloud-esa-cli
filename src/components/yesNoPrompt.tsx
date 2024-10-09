import SelectItems, { SelectItem } from './selectInput.js';

const yesNoItems: SelectItem[] = [
  { label: 'Yes', value: 'yes' },
  { label: 'No', value: 'no' }
];

export const yesNoPrompt = (
  handleSelect: (item: SelectItem) => Promise<void>,
  title: string
) => {
  console.log(title);
  SelectItems({ items: yesNoItems, handleSelect });
};
