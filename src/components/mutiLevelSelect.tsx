import { render, Text, useApp } from 'ink';
import SelectInput from 'ink-select-input';
import React, { useState } from 'react';

import t from '../i18n/index.js';

import { SelectItem } from './selectInput.js';
import Item from './selectItem.js';

export interface Props {
  items: SelectItem[];
  handleSelect: (item: SelectItem) => Promise<void> | void;
  handleExit: () => void;
}

const Indicator: React.FC<{ isSelected?: boolean }> = ({ isSelected }) => {
  return <Text>{isSelected ? '👉 ' : '  '}</Text>;
};

const RETURN_ITEM: SelectItem = {
  label: t('return_select_init_template').d('Return'),
  key: 'return',
  value: '__return__'
};

const MultiLevelSelect: React.FC<Props> = ({
  items,
  handleSelect,
  handleExit
}) => {
  const { exit } = useApp();
  const [stack, setStack] = useState<SelectItem[][]>([[...items]]);

  const currentItems = stack[stack.length - 1];

  const onSelect = (item: SelectItem) => {
    if (item.value === '__return__') {
      if (stack.length > 1) {
        // 返回上一级菜单
        setStack(stack.slice(0, -1));
      } else {
        // 顶层菜单，忽略返回（不退出）
      }
      return;
    }

    if (item.children && item.children.length > 0) {
      setStack([...stack, [...item.children, RETURN_ITEM]]);
    } else {
      handleSelect(item);
      exit();
    }
  };
  return (
    <SelectInput
      items={currentItems}
      onSelect={onSelect}
      itemComponent={Item}
      indicatorComponent={Indicator}
      limit={10}
    />
  );
};

export const MultiLevelSelectComponent = async (props: {
  items: SelectItem[];
  handleSelect?: (item: SelectItem) => void;
  handleExit?: () => void;
}): Promise<SelectItem | null> => {
  const { items, handleSelect, handleExit } = props;
  return new Promise((resolve) => {
    const { unmount } = render(
      <MultiLevelSelect
        items={items}
        handleSelect={(item) => {
          unmount();
          handleSelect && handleSelect(item);
          resolve(item);
        }}
        handleExit={() => {
          unmount();
          handleExit && handleExit();
          resolve(null);
        }}
      />
    );
  });
};

export default MultiLevelSelectComponent;
