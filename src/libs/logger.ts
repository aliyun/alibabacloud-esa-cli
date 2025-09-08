import os from 'os';
import path from 'path';

import chalk from 'chalk';
import Table from 'cli-table3';
import ora, { Ora } from 'ora';
import { format, createLogger, Logger as WinstonLogger } from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

import t from '../i18n/index.js';
import { getProjectConfig } from '../utils/fileUtils/index.js';

type HorizontalTableRow = string[];
type VerticalTableRow = Record<string, string>;
type CrossTableRow = Record<string, string[]>;
type TableRow = HorizontalTableRow | VerticalTableRow | CrossTableRow;

export type LogLevel =
  | 'error'
  | 'warn'
  | 'info'
  | 'http'
  | 'verbose'
  | 'debug'
  | 'silly';

const transport: DailyRotateFile = new DailyRotateFile({
  filename: path.join(os.homedir(), '.esa-logs/esa-debug-%DATE%.log'),
  level: 'info',
  datePattern: 'YYYY-MM-DD-HH',
  zippedArchive: true,
  maxSize: '10m',
  maxFiles: '7d'
});

class Logger {
  private static instance: Logger;
  private logger: WinstonLogger;
  private spinner: Ora;
  private spinnerText: string;

  private constructor() {
    this.spinnerText = '';
    const { combine, timestamp, label, printf } = format;
    const customFormat = printf(
      ({ level, message, label: printLabel, timestamp: printTimestamp }) => {
        let colorizedLevel: string;
        const projName = getProjectConfig()?.name || 'Outside';
        switch (level) {
          case 'warn':
            colorizedLevel = chalk.yellow(level);
            break;
          case 'info':
            colorizedLevel = chalk.green(level);
            break;
          case 'error':
            colorizedLevel = chalk.red(level);
          case 'verbose':
            colorizedLevel = chalk.magenta(level);
            break;
          case 'debug':
            colorizedLevel = chalk.grey(level);
            break;
          case 'silly':
            colorizedLevel = chalk.white(level);
            break;
          default:
            colorizedLevel = level;
        }
        return `${printTimestamp} [${chalk.green(
          printLabel
        )}] ${colorizedLevel} in ${chalk.italic(projName)}: ${message}`;
      }
    );

    this.logger = createLogger({
      level: 'info',
      format: combine(label({ label: 'ESA' }), timestamp(), customFormat),
      transports: [transport]
    });

    this.spinner = ora('Loading...');
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
      // Object.freeze(Logger.instance);
    }
    return Logger.instance;
  }

  get ora() {
    return this.spinner;
  }

  setLogLevel(level: LogLevel) {
    this.logger.level = level;
  }

  /**
   * Start a sub-step: show a spinner with the provided message.
   * If a spinner is already running, just update its text.
   */
  startSubStep(message: string): void {
    this.spinnerText = message;
    this.spinner.text = message;
    if (!this.spinner.isSpinning) {
      this.spinner.start();
    }
  }

  /**
   * End a sub-step: stop loading and replace spinner with `├` and final message.
   * This overwrites the previous spinner line with the provided message.
   */
  endSubStep(message: string): void {
    // console.log(chalk.gray('├') + ' ' + this.spinnerText);
    try {
      if (this.spinner && this.spinner.isSpinning) {
        this.spinner.stop();
      }
    } catch {}
    console.log(chalk.gray(`│ `));
    console.log(chalk.gray('├  ') + this.spinnerText);
    console.log(chalk.gray(`│  ${message}`));
  }

  stopSpinner(): void {
    try {
      if (this.spinner && this.spinner.isSpinning) {
        this.spinner.stop();
      }
    } catch {}
  }

  /**
   * Prepare terminal output just before showing an interactive prompt.
   * - Stops any active spinner
   * - Replaces the previous line with a clean `╰ <text>` indicator
   */
  prepareForPrompt(text?: string): void {
    this.stopSpinner();
    const content = `╰ ${text || ''}`;
    this.replacePrevLine(content);
  }

  /**
   * Consolidate interactive prompt output after completion by replacing
   * the previous N lines with a concise summary line.
   * Defaults to 2 lines (prompt + answer line in most cases).
   */
  consolidateAfterPrompt(summary: string, linesToReplace = 2): void {
    const content = `├ ${summary}`;
    this.replacePrevLines(linesToReplace, content);
  }

  log(message: string) {
    console.log(message);
  }

  subLog(message: string) {
    console.log(`\t${message}`);
  }

  success(message: string) {
    console.log(`🎉 ${chalk.bgGreen(' SUCCESS ')} ${chalk.green(message)}`);
  }

  debug(message: string) {
    this.logger.debug(message);
    if (this.logger.level === 'debug') {
      console.log(`${chalk.grey('[DEBUG]')} ${message}`);
    }
  }

  info(message: string) {
    this.logger.info(message);
  }

  ask(message: string) {
    console.log(`❓ ${message}`);
  }

  point(message: string) {
    console.log(`👉🏻 ${chalk.green(message)}`);
  }

  block() {
    console.log('\n');
  }

  warn(message: string) {
    this.logger.warn(message);
    console.log(`\n${chalk.bgYellow(' WARNING ')} ${chalk.yellow(message)}`);
  }

  error(message: string) {
    this.logger.error(message);
    console.log(`\n❌ ${chalk.bgRed(' ERROR ')} ${chalk.red(message)}`);
  }

  subError(message: string) {
    console.log(`\n${chalk.red(message)}`);
  }

  http(message: string) {
    this.logger.http(message);
  }

  url(message: string) {
    console.log(`🔗 ${chalk.blue(message)}`);
  }

  verbose(message: string) {
    this.logger.verbose(message);
  }

  silly(message: string) {
    this.logger.silly(message);
  }

  announcement(message: string) {
    // todo
    console.log(message);
  }

  notInProject() {
    const initCommand = chalk.green('esa init');
    this.error(
      t('common_not_edge_project', { initCommand }).d(
        `You are not in an esa project, Please run ${initCommand} to initialize a project, or enter an esa project.`
      )
    );
  }

  pathEacces(localPath: string) {
    this.block();
    this.log(
      chalk.yellow(
        t('common_eacces_intro', { localPath }).d(
          `You do not have permission to ${localPath}, please use`
        )
      )
    );
    this.block();
    this.log(chalk.green(`$ ${chalk.red('sudo')} esa <Command>`));
    this.block();
    this.subLog(chalk.yellow('OR'));
    this.block();
    this.log(chalk.green(`$ sudo chmod -R 777 ${localPath}`));
  }

  table(head: string[], data: TableRow[], width: number[] = []): void {
    const table = new Table({
      head,
      colWidths: width
    });
    table.push(...data);

    this.log(table.toString());
    this.block();
  }

  tree(messages: string[]): void {
    if (messages.length === 0) return;
    const lines = [];
    lines.push(`╭ ${messages[0]}`);
    for (let i = 1; i < messages.length - 1; i++) {
      lines.push(`│ ${messages[i]}`);
    }
    if (messages.length > 1) {
      lines.push(`╰ ${messages[messages.length - 1]}`);
    }
    console.log(lines.join('\n'));
  }

  StepHeader(title: string, step: number, total: number): void {
    console.log(`\n╭ ${title} ${chalk.green(`Step ${step} of ${total}`)}`);
    console.log('│');
  }

  StepItem(prompt: string): void {
    console.log(`├ ${prompt}`);
  }

  StepStart(prompt: string): void {
    console.log(`╭ ${prompt}`);
  }

  StepKV(key: string, value: string): void {
    const orange = chalk.hex('#FFA500');
    console.log(`│ ${orange(key)} ${value}`);
  }

  StepSpacer(): void {
    console.log('│');
  }

  StepEnd(str?: string): void {
    console.log(`╰ ${str || ''}`);
  }

  StepEndInline(): void {
    try {
      process.stdout.write('╰ ');
    } catch {
      console.log('╰');
    }
  }

  divider(): void {
    console.log(
      chalk.yellow('--------------------------------------------------------')
    );
  }

  // Replace the previous single terminal line with new content
  replacePrevLine(content: string): void {
    try {
      // Move cursor up 1 line, clear it, carriage return, print new content
      process.stdout.write('\x1b[1A');
      process.stdout.write('\x1b[2K');
      process.stdout.write('\r');
      console.log(content);
    } catch {
      console.log(content);
    }
  }

  // Replace multiple previous lines with one consolidated line
  replacePrevLines(linesToReplace: number, content: string): void {
    try {
      for (let i = 0; i < linesToReplace; i++) {
        process.stdout.write('\x1b[1A'); // move up
        process.stdout.write('\x1b[2K'); // clear line
      }
      process.stdout.write('\r');
      console.log(content);
    } catch {
      console.log(content);
    }
  }
}

const logger = Logger.getInstance();

export default logger;
