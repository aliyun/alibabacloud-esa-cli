import { render , Text } from 'ink';
import SelectInput from 'ink-select-input';
import React from 'react';

import Item from './selectItem.js';

export interface SelectItem {
  label: string;
  value: string;
  key?: string;
  children?: SelectItem[];
}

const Indicator: React.FC<{ isSelected?: boolean }> = ({ isSelected }) => {
  return <Text>{isSelected ? '👉 ' : ' '}</Text>;
};

export interface Props {
  items: SelectItem[];
  handleSelect: (item: SelectItem) => Promise<void> | void;
}

const SelectItems = ({ items, handleSelect }: Props) => {
  const { unmount } = render(
    <SelectInput
      items={items}
      onSelect={onSelect}
      itemComponent={Item}
      indicatorComponent={Indicator}
    />
  );

  function onSelect(item: SelectItem) {
    unmount();
    handleSelect(item);
  }

  return unmount;
};

export default SelectItems;
