import chalk from 'chalk';
import {
  format,
  createLogger,
  transports,
  Logger as WinstonLogger
} from 'winston';
import Table from 'cli-table3';
import path from 'path';
import os from 'os';
import ora, { Ora } from 'ora';
import { fileURLToPath } from 'url';
import t from '../i18n/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

class Logger {
  private static instance: Logger;
  private logger: WinstonLogger;
  private spinner: Ora;

  private constructor() {
    const { combine, timestamp, label, printf } = format;
    const customFormat = printf(
      ({ level, message, label: printLabel, timestamp: printTimestamp }) => {
        let colorizedLevel: string;
        switch (level) {
          case 'error':
            colorizedLevel = chalk.bgRed(' ERROR ');
            return `❌ ${colorizedLevel} ${chalk.red(message)}`;
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
        )}] ${colorizedLevel}: ${message}`;
      }
    );

    this.logger = createLogger({
      level: 'info',
      format: combine(label({ label: 'Esa' }), timestamp(), customFormat),
      transports: [
        new transports.Console(),
        new transports.File({
          filename: path.join(os.homedir(), '.asea-logs/esa-debug.log'),
          level: 'error'
        })
      ]
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
    console.log(`🎉 ${chalk.bgGreen(' SUCCESS ')} ${chalk.green(message)}`);
  }

  debug(message: string) {
    this.logger.debug(message);
  }

  info(message: string) {
    console.log(`💬 ${message}`);
  }

  ask(message: string) {
    console.log(`❓ ${message}`);
  }

  point(message: string) {
    console.log(`👉🏻 ${chalk.green(message)}`);
  }

  block() {
    console.log(' ');
  }

  warn(message: string) {
    console.log(`${chalk.bgYellow(' WARNING ')} ${chalk.yellow(message)}`);
  }

  error(message: string) {
    this.logger.error(message);
  }

  subError(message: string) {
    console.log(` ${chalk.red(message)}`);
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
    this.logger.error(
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
    if (messages.length === 1) {
      console.log(`─ ${messages[0]}`);
      return;
    }
    console.log(`╭─ ${messages[0]}`);

    for (let i = 1; i < messages.length - 1; i++) {
      console.log(`│`);
      console.log(`├─ ${messages[i]}`);
    }

    if (messages.length > 1) {
      console.log(`│`);
      console.log(`╰─ ${messages[messages.length - 1]}`);
    }
  }
}

const logger = Logger.getInstance();

export default logger;
