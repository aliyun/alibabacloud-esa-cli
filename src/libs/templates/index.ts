import chalk from 'chalk';

import { getSummary } from '../../commands/common/constant.js';
import logger from '../logger.js';

interface TemplateInterface {
  path: string;
  title: string;
}

export default class Template implements TemplateInterface {
  path: string;
  title: string;

  constructor(path: string, title: string) {
    this.path = path;
    this.title = title;
  }

  printSummary(): void {
    const list = getSummary(this.title);
    list.forEach((summary) => {
      const title = chalk.bold(summary.title);
      const command = chalk.green(summary.command);
      logger.log(`${title}: ${command}`);
    });
  }
}
