import chalk from 'chalk';

import t from '../../i18n/index.js';
import logger from '../../libs/logger.js';
import { checkOS, Platforms } from '../../utils/checkOS.js';
import { getDevOpenBrowserUrl } from '../../utils/fileUtils/index.js';
import openInBrowser from '../../utils/openInBrowser.js';

import type Ew2Server from './ew2/server.js';
import type WorkerServer from './mockWorker/server.js';

const getShortcutSegments = (useEw2: boolean): Array<[string, string]> => [
  ['[b]', ' open a browser, '],
  ...(!useEw2
    ? ([['[d]', ' open Devtools, ']] as Array<[string, string]>)
    : []),
  ['[c]', ' clear console, '],
  ['[x]', ' to exit']
];

export const formatShortcutPanel = (
  useEw2: boolean,
  columns = process.stdout.columns
): string[] => {
  const segments = getShortcutSegments(useEw2);
  const fullPlain = segments
    .map(([key, description]) => key + description)
    .join('');
  const shouldStack = Boolean(columns && fullPlain.length + 4 > columns);
  const rows = shouldStack
    ? segments.map(([key, description]) => ({
        plain: key + description,
        styled: chalk.bold(key) + description
      }))
    : [
        {
          plain: fullPlain,
          styled: segments
            .map(([key, description]) => chalk.bold(key) + description)
            .join('')
        }
      ];
  const innerWidth = Math.max(...rows.map(({ plain }) => plain.length));
  const border = `+${'-'.repeat(innerWidth + 2)}+`;

  return [
    border,
    ...rows.map(
      ({ plain, styled }) =>
        `| ${styled}${' '.repeat(innerWidth - plain.length)} |`
    ),
    border
  ];
};

const printShortcutPanel = (useEw2: boolean) => {
  formatShortcutPanel(useEw2).forEach((line) => logger.log(line));
};

/**
 * Keyboard shortcut panel for `dev` mode, implemented with raw stdin
 * (previously an ink component). Returns the same shape as before:
 * `{ devElement: { waitUntilExit }, exit }`.
 */
const doProcess = (worker?: WorkerServer | Ew2Server) => {
  const inspectLink = chalk.underline.blue('chrome://inspect/#devices');
  const remoteTarget = chalk.blue('Remote Target');
  const inspect = chalk.blue('inspect');
  const OS = checkOS();
  const useEw2 = [
    Platforms.AppleArm,
    Platforms.AppleIntel,
    Platforms.LinuxX86
  ].includes(OS);

  printShortcutPanel(useEw2);

  let resolveExit: () => void;
  const exitPromise = new Promise<void>((resolve) => {
    resolveExit = resolve;
  });
  let exited = false;

  const cleanup = () => {
    process.stdin.off('data', onData);
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(false);
    }
    process.stdin.pause();
    if (worker) {
      worker.stop();
    }
  };

  const exit = () => {
    if (exited) return;
    exited = true;
    cleanup();
    resolveExit();
    setTimeout(() => {
      process.exit(0);
    }, 500);
  };

  const onData = async (data: string) => {
    const input = data.toString();
    // Ctrl+C
    if (input === '\u0003') {
      exit();
      return;
    }
    switch (input.toLowerCase()) {
      case 'c':
        console.clear();
        logger.block();
        printShortcutPanel(useEw2);
        break;
      case 'b': {
        await openInBrowser(getDevOpenBrowserUrl());
        break;
      }
      case 'd': {
        if (useEw2) return;
        logger.log(
          t('dev_input_inspect_tip1', { inspectLink }).d(
            `👉 Please visit ${inspectLink} in the Chrome browser`
          )
        );
        logger.log(
          t('dev_input_inspect_tip2', { inspect, remoteTarget }).d(
            `👉 See your debugger under ${remoteTarget} and click the ${inspect} button`
          )
        );
        break;
      }
      case 'x':
        exit();
        break;
      default:
        break;
    }
  };

  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
  }
  process.stdin.setEncoding('utf8');
  process.stdin.resume();
  process.stdin.on('data', onData);

  return {
    devElement: {
      waitUntilExit: () => exitPromise
    },
    exit
  };
};

export default doProcess;
