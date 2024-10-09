import path from 'path';
import { execSync } from 'child_process';
import { getSummary, SUMMARIES_LIST } from '../../commands/common/constant.js';
import chalk from 'chalk';

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
      console.log(`${title}: ${command}`);
    });
  }
}
