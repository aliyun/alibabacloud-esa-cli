import { Box, render, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import React, { useState, useEffect } from 'react';
import t from '../i18n/index.js';

export interface Option {
  label: string;
  value: string;
}

export interface FilterSelectorProps {
  data: Option[];
  onSubmit: (input: string) => void;
  hideCount?: number;
}

export const FilterSelector: React.FC<FilterSelectorProps> = ({
  data,
  onSubmit,
  hideCount = 20
}) => {
  const [inputValue, setInputValue] = useState('');
  const [filteredData, setFilteredData] = useState(data);
  const [isShowFilteredData, setIsShowFilteredData] = useState(false);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [tabPressCount, setTabPressCount] = useState(0);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    if (showAll && !isSelectionMode) {
      setFilteredData(data.filter((site) => site.label.includes(inputValue)));
    }
  }, [inputValue, data]);

  const handleSubmit = () => {
    onSubmit(inputValue);
  };

  useInput((input, key) => {
    if (key.return && isSelectionMode && filteredData[selectedIndex]) {
      setInputValue(filteredData[selectedIndex].label);
      setIsSelectionMode(false);
      setIsShowFilteredData(false);
      setSelectedIndex(-1);
      setTabPressCount(0);
    } else if (key.tab) {
      if (tabPressCount === 0) {
        const filteredDataInner = data.filter((site) =>
          site.label.includes(inputValue)
        );
        setFilteredData(filteredDataInner);

        if (filteredData.length === 1) {
          setIsShowFilteredData(false);
          setInputValue(filteredDataInner[0].label);
          setSelectedIndex(0);
        } else {
          setIsShowFilteredData(true);
        }
      } else if (tabPressCount === 1) {
        const filteredDataInner = data.filter((site) =>
          site.label.includes(inputValue)
        );
        setFilteredData(filteredDataInner);
        // 匹配结果大于等于1个时，进入选择模式
        if (
          (filteredDataInner.length >= 1 &&
            showAll &&
            filteredDataInner.length > hideCount) ||
          (filteredDataInner.length >= 1 &&
            filteredDataInner.length <= hideCount)
        ) {
          setIsSelectionMode(true);
          setSelectedIndex(0);
          setInputValue(filteredDataInner[0].label);
        }
      } else if (
        tabPressCount >= 2 &&
        isSelectionMode &&
        (showAll || filteredData.length <= hideCount) &&
        filteredData.length > 1
      ) {
        setSelectedIndex((prevIndex) => (prevIndex + 1) % filteredData.length);
        setInputValue(
          filteredData[(selectedIndex + 1) % filteredData.length].label
        );
      }

      setTabPressCount((prevCount) => prevCount + 1);
    } else if (key.downArrow && isSelectionMode) {
      setSelectedIndex((prevIndex) => (prevIndex + 1) % filteredData.length);
      setInputValue(
        filteredData[(selectedIndex + 1) % filteredData.length].label
      );
    } else if (key.upArrow && isSelectionMode) {
      setSelectedIndex(
        (prevIndex) =>
          (prevIndex - 1 + filteredData.length) % filteredData.length
      );
      setInputValue(
        filteredData[
          (selectedIndex - 1 + filteredData.length) % filteredData.length
        ].label
      );
    } else if (key.leftArrow || key.rightArrow) {
    } else if (key.return) {
      handleSubmit();
      setTabPressCount(0);
    } else if (
      input === 'y' &&
      !showAll &&
      isShowFilteredData &&
      filteredData?.length > hideCount
    ) {
      setShowAll(true);
      setIsSelectionMode(true);
    } else {
      setIsSelectionMode(false);
      setIsShowFilteredData(false);
      setSelectedIndex(-1);
      setTabPressCount(0);
      setShowAll(false);
    }
  });

  const renderFilterData = () => {
    return (
      (showAll || filteredData.length <= hideCount) &&
      filteredData.length > 1 && (
        <>
          <Text>{`👉 ${t('route_add_tab_tip').d('Press Tab to select')}`}</Text>
          {filteredData.map((item, index) => (
            <Text key={index} inverse={index === selectedIndex}>
              {item.label}
            </Text>
          ))}
        </>
      )
    );
  };

  return (
    <Box flexDirection="column">
      <TextInput
        value={inputValue}
        highlightPastedText
        onChange={(value) => {
          if (
            !showAll &&
            value[value.length - 1] === 'y' &&
            tabPressCount === 1
          ) {
            return;
          }
          setInputValue(value);
        }}
      />
      {isShowFilteredData && (
        <>
          {filteredData.length > hideCount && !showAll && (
            <Text>
              {t('route_add_see_more').d(
                `Do you wish to see all ${filteredData.length} possibilities? (y/n)`
              )}
            </Text>
          )}
          {renderFilterData()}
        </>
      )}
    </Box>
  );
};

export const promptFilterSelector = async (
  siteList: Option[]
): Promise<Option> => {
  return new Promise((resolve) => {
    const { unmount } = render(
      <FilterSelector
        onSubmit={(input) => {
          unmount();
          resolve(
            siteList.find((site) => site.label === input) || {
              label: '',
              value: ''
            }
          );
        }}
        data={siteList}
      />
    );
  });
};
