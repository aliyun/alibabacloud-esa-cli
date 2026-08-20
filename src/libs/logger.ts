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
  'error' | 'warn' | 'info' | 'http' | 'verbose' | 'debug' | 'silly';

export type OutputStream = 'stdout' | 'stderr';

const shouldWriteLogFile = () =>
  process.env.NODE_ENV !== 'test' &&
  !process.env.VITEST &&
  !process.env.VITEST_WORKER_ID;

const createFileTransport = (): DailyRotateFile =>
  new DailyRotateFile({
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
  private outputStream: OutputStream;

  private constructor() {
    this.spinnerText = '';
    this.outputStream = 'stdout';
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

    const transports = shouldWriteLogFile() ? [createFileTransport()] : [];
    this.logger = createLogger({
      level: 'info',
      format: combine(label({ label: 'ESA' }), timestamp(), customFormat),
      silent: transports.length === 0,
      transports
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

  getOutputStream(): OutputStream {
    return this.outputStream;
  }

  setOutputStream(outputStream: OutputStream): void {
    this.outputStream = outputStream;
  }

  private writeLine(message: string): void {
    if (this.outputStream === 'stderr') {
      console.error(message);
    } else {
      console.log(message);
    }
  }

  private writeRaw(message: string): void {
    const stream =
      this.outputStream === 'stderr' ? process.stderr : process.stdout;
    stream.write(message);
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
    this.writeLine(chalk.gray(`│ `));
    this.writeLine(chalk.gray('├  ') + this.spinnerText);
    this.writeLine(chalk.gray(`│  ${message}`));
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
    this.writeLine(message);
  }

  subLog(message: string) {
    this.writeLine(`\t${message}`);
  }

  success(message: string) {
    this.writeLine(`🎉 ${chalk.bgGreen(' SUCCESS ')} ${chalk.green(message)}`);
  }

  debug(message: string) {
    this.logger.debug(message);
    if (this.logger.level === 'debug') {
      this.writeLine(`${chalk.grey('[DEBUG]')} ${message}`);
    }
  }

  info(message: string) {
    this.logger.info(message);
  }

  ask(message: string) {
    this.writeLine(`❓ ${message}`);
  }

  point(message: string) {
    this.writeLine(`👉🏻 ${chalk.green(message)}`);
  }

  block() {
    this.writeLine('\n');
  }

  warn(message: string) {
    this.logger.warn(message);
    this.writeLine(`\n${chalk.bgYellow(' WARNING ')} ${chalk.yellow(message)}`);
  }

  error(message: string) {
    this.logger.error(message);
    this.writeLine(`\n❌ ${chalk.bgRed(' ERROR ')} ${chalk.red(message)}`);
  }

  subError(message: string) {
    this.writeLine(`\n${chalk.red(message)}`);
  }

  http(message: string) {
    this.logger.http(message);
  }

  url(message: string) {
    this.writeLine(`🔗 ${chalk.blue(message)}`);
  }

  verbose(message: string) {
    this.logger.verbose(message);
  }

  silly(message: string) {
    this.logger.silly(message);
  }

  announcement(message: string) {
    // todo
    this.writeLine(message);
  }

  notInProject() {
    this.block();
    this.error('Missing ESA project configuration (esa.jsonc or esa.toml)');
    this.block();

    this.log('If there is code to deploy, you can either:');
    this.subLog(
      `- Specify an entry-point to your Routine via the command line (ex: ${chalk.green(
        'esa-cli deploy src/index.ts'
      )})`
    );
    this.subLog('- Or create an "esa.jsonc" file (recommended):');
    this.writeLine(
      '```jsonc\n' +
        '{\n' +
        '  "name": "my-routine",\n' +
        '  "entry": "src/index.ts",\n' +
        '  "dev": { "port": 18080 }\n' +
        '}\n' +
        '```'
    );
    this.subLog('- Or, if you prefer TOML, create an "esa.toml" file:');
    this.writeLine(
      '```toml\n' +
        'name = "my-routine"\n' +
        'entry = "src/index.ts"\n' +
        '\n' +
        '[dev]\n' +
        'port = 18080\n' +
        '```\n'
    );

    this.log(
      'If you are deploying a directory of static assets, you can either:'
    );
    this.subLog(
      `- Create an "esa.jsonc" file (recommended) and run ${chalk.green(
        'esa-cli deploy -a ./dist'
      )}`
    );
    this.writeLine(
      '```jsonc\n' +
        '{\n' +
        '  "name": "my-routine",\n' +
        '  "assets": {\n' +
        '    "directory": "./dist"\n' +
        '  }\n' +
        '}\n' +
        '```'
    );
    this.subLog(
      `- Or create an "esa.toml" file and run ${chalk.green('esa-cli deploy -a ./dist')}`
    );
    this.writeLine(
      '```toml\n' +
        'name = "my-routine"\n' +
        '\n' +
        '[assets]\n' +
        'directory = "./dist"\n' +
        '```\n'
    );

    this.log('Alternatively, initialize a new ESA project:');
    this.log(chalk.green('$ esa-cli init my-project'));
    this.block();
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
    this.log(chalk.green(`$ ${chalk.red('sudo')} esa-cli <Command>`));
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
    this.writeLine(lines.join('\n'));
  }

  StepHeader(title: string, step: number, total: number): void {
    this.writeLine(`\n╭ ${title} ${chalk.green(`Step ${step} of ${total}`)}`);
    this.writeLine('│');
  }

  StepItem(prompt: string): void {
    this.writeLine(`├ ${prompt}`);
  }

  StepStart(prompt: string): void {
    this.writeLine(`╭ ${prompt}`);
  }

  StepKV(key: string, value: string): void {
    const orange = chalk.hex('#FFA500');
    this.writeLine(`│ ${orange(key)} ${value}`);
  }

  StepSpacer(): void {
    this.writeLine('│');
  }

  StepEnd(str?: string): void {
    this.writeLine(`╰ ${str || ''}`);
  }

  StepEndInline(): void {
    try {
      this.writeRaw('╰ ');
    } catch {
      this.writeLine('╰');
    }
  }

  divider(): void {
    this.writeLine(
      chalk.yellow('--------------------------------------------------------')
    );
  }

  // Replace the previous single terminal line with new content
  replacePrevLine(content: string): void {
    try {
      // Move cursor up 1 line, clear it, carriage return, print new content
      this.writeRaw('\x1b[1A');
      this.writeRaw('\x1b[2K');
      this.writeRaw('\r');
      this.writeLine(content);
    } catch {
      this.writeLine(content);
    }
  }

  // Replace multiple previous lines with one consolidated line
  replacePrevLines(linesToReplace: number, content: string): void {
    try {
      for (let i = 0; i < linesToReplace; i++) {
        this.writeRaw('\x1b[1A'); // move up
        this.writeRaw('\x1b[2K'); // clear line
      }
      this.writeRaw('\r');
      this.writeLine(content);
    } catch {
      this.writeLine(content);
    }
  }
}

const logger = Logger.getInstance();

export default logger;
