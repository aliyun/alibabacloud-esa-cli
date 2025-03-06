import inquirer from 'inquirer';
import { vi } from 'vitest';

export function mockInquirerPrompt(configs) {
  let callIndex = 0;
  vi.spyOn(inquirer, 'prompt').mockImplementation(async () => {
    if (callIndex >= configs.length) {
      throw new Error(
        'Unexpected inquirer.prompt call beyond configured responses'
      );
    }
    const response = configs[callIndex];
    callIndex++;
    console.log(response);
    return response;
  });
}
