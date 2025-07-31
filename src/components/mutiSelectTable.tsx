import { Box, render, Text, useInput } from 'ink';
import React, { useState } from 'react';

import t from '../i18n/index.js';

export interface TableItem {
  label: string;
}
interface MultiSelectTableProps {
  items: TableItem[];
  itemsPerRow: number;
  onSubmit: (selectedItems: TableItem[]) => void;
  boxWidth?: number;
}

export const MultiSelectTable: React.FC<MultiSelectTableProps> = ({
  items,
  itemsPerRow,
  onSubmit,
  boxWidth = 25
}) => {
  const [selectedIndexes, setSelectedIndexes] = useState<Set<string>>(
    new Set()
  );
  const [cursorRow, setCursorRow] = useState(0);
  const [cursorCol, setCursorCol] = useState(0);

  const rows: TableItem[][] = [];
  for (let i = 0; i < items.length; i += itemsPerRow) {
    rows.push(items.slice(i, i + itemsPerRow));
  }
  const totalRows = Math.ceil(items.length / itemsPerRow);

  const toggleSelect = (row: number, col: number) => {
    const key = `${row}:${col}`;
    setSelectedIndexes((prevSelectedIndexes) => {
      const newSelectedIndexes = new Set(prevSelectedIndexes);
      if (newSelectedIndexes.has(key)) {
        newSelectedIndexes.delete(key);
      } else {
        newSelectedIndexes.add(key);
      }
      return newSelectedIndexes;
    });
  };

  const handleSubmission = () => {
    const selectedItems = Array.from(selectedIndexes).map((key) => {
      const [row, col] = key.split(':').map(Number);
      return rows[row][col];
    });
    onSubmit(selectedItems);
  };
  useInput((input, key) => {
    if (key.leftArrow) {
      setCursorCol((prev) => Math.max(prev - 1, 0));
    } else if (key.rightArrow) {
      setCursorCol((prev) => Math.min(prev + 1, itemsPerRow - 1));
    } else if (key.upArrow) {
      setCursorRow((prev) => Math.max(prev - 1, 0));
    } else if (key.downArrow) {
      setCursorRow((prev) => Math.min(prev + 1, totalRows - 1));
    } else if (input === ' ') {
      toggleSelect(cursorRow, cursorCol);
    } else if (key.tab) {
      setCursorCol((prevCol) => {
        let newCol = prevCol + 1;
        let newRow = cursorRow;
        if (newCol >= itemsPerRow) {
          newCol = 0;
          newRow = cursorRow + 1;
          if (newRow >= totalRows) {
            newRow = 0;
          }
          setCursorRow(newRow);
        }
        return newCol;
      });
    } else if (key.return) {
      handleSubmission();
    }
  });

  return (
    <Box flexDirection="column">
      {rows.map((rowItems, row) => (
        <Box key={row} flexDirection="row">
          {rowItems.map((item, col) => (
            <Box key={`${row}:${col}`} width={boxWidth}>
              <Text
                color={
                  cursorRow === row && cursorCol === col ? 'green' : undefined
                }
              >
                {selectedIndexes.has(`${row}:${col}`) ? '✅' : '  '}
                {item.label}
              </Text>
            </Box>
          ))}
        </Box>
      ))}
      <Box flexDirection="column">
        <Text>
          🔔{' '}
          {t('deploy_select_table_tip').d(
            'Use arrow keys to move, space to select, and enter to submit.'
          )}
        </Text>
      </Box>
    </Box>
  );
};

export const displayMultiSelectTable = async (
  items: TableItem[],
  itemsPerRow = 7,
  boxWidth = 25
): Promise<string[]> => {
  return new Promise<string[]>((resolve) => {
    const { unmount } = render(
      <MultiSelectTable
        items={items}
        itemsPerRow={itemsPerRow}
        onSubmit={(selectedItems) => {
          unmount();
          resolve(selectedItems.map((item) => item.label));
        }}
        boxWidth={boxWidth}
      />
    );
  });
};
