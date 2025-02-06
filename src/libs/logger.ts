import chalk from 'chalk';
import { format, createLogger, Logger as WinstonLogger } from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import Table from 'cli-table3';
import path from 'path';
import os from 'os';
import ora, { Ora } from 'ora';
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

  private constructor() {
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

  log(message: string) {
    console.log(message);
  }

  subLog(message: string) {
    console.log(`\t${message}`);
  }

  success(message: string) {
    console.log(`\n🎉 ${chalk.bgGreen(' SUCCESS ')} ${chalk.green(message)}`);
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
    lines.push(`╭─ ${messages[0]}`);
    for (let i = 1; i < messages.length - 1; i++) {
      lines.push(`│ ${messages[i]}`);
    }
    if (messages.length > 1) {
      lines.push(`╰─ ${messages[messages.length - 1]}`);
    }
    console.log(lines.join('\n'));
  }
}

const logger = Logger.getInstance();

export default logger;
