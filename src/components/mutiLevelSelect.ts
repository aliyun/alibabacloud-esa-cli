import inquirer from 'inquirer';
import logger from '../libs/logger.js';

// Define the structure of a selection item
export interface SelectItem {
  label: string;
  value: string;
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
  message: string = 'Select a template:'
): Promise<string | null> {
  let currentItems = items; // Current level options
  const stack: SelectItem[][] = []; // Stack to store previous level options for back navigation
  let selectedPath: string | null = null;

  while (selectedPath === null) {
    const { choice } = await inquirer.prompt([
      {
        type: 'list',
        name: 'choice',
        message,
        pageSize: 10,
        choices: [
          ...currentItems.map((item) => ({ name: item.label, value: item })),
          ...(stack.length > 0 ? [{ name: 'Back', value: 'back' }] : []), // Show "Back" if there’s a previous level
          { name: 'Exit', value: 'exit' }
        ]
      }
    ]);

    if (choice === 'exit') {
      logger.log('User canceled the operation.');
      return null;
    }

    if (choice === 'back') {
      currentItems = stack.pop()!; // Return to the previous level
      continue;
    }

    // If a category with children is selected
    if (choice.children && choice.children.length > 0) {
      stack.push(currentItems); // Save the current level
      currentItems = choice.children; // Move to the next level
      message = `Select a template under ${choice.label}:`;
    } else {
      // A leaf node (no children) is selected, end the selection
      selectedPath = choice.value;
    }
  }

  return selectedPath;
}
