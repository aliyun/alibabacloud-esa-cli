import { isCancel, select as clackSelect } from '@clack/prompts';

import logger from '../libs/logger.js';

// Define the structure of a selection item
export interface SelectItem {
  label: string;
  value: string;
  hint?: string;
  children?: SelectItem[];
}

/**
 * Perform multi-level selection and return the final selected template path
 * @param items Array of selection items (including categories and sub-templates)
 * @param message Initial prompt message
 * @returns Selected template path, or null if the user exits
 */
export default async function multiLevelSelect(
  items: SelectItem[],
  message = 'Select a template:'
): Promise<string | null> {
  let currentItems = items; // Current level options
  const stack: SelectItem[][] = []; // Stack to store previous level options for back navigation
  let selectedPath: string | null = null;

  while (selectedPath === null) {
    const choice = (await clackSelect({
      message,
      options: [
        ...currentItems.map((item) => ({
          label: item.label,
          value: item.value,
          hint: item.hint
        })),
        ...(stack.length > 0 ? [{ label: 'Back', value: '__back__' }] : [])
      ]
    })) as string;
    if (isCancel(choice)) {
      logger.log('User canceled the operation.');
      return null;
    }

    if (choice === '__back__') {
      currentItems = stack.pop()!; // Return to the previous level
      continue;
    }

    // If a category with children is selected
    const selected = currentItems.find((i) => i.value === choice);
    if (selected && selected.children && selected.children.length > 0) {
      stack.push(currentItems); // Save the current level
      currentItems = selected.children; // Move to the next level
      message = `Select a template under ${selected.label}:`;
    } else {
      // A leaf node (no children) is selected, end the selection
      selectedPath = choice;
    }
  }

  return selectedPath;
}
