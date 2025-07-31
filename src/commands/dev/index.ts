import { exec } from 'child_process';
import { isIP } from 'net';

import chokidar from 'chokidar';
import { CommandModule, ArgumentsCamelCase, Argv } from 'yargs';

import SelectItems, { SelectItem } from '../../components/selectInput.js';
import t from '../../i18n/index.js';
import logger from '../../libs/logger.js';
import checkAndInputPort from '../../utils/checkDevPort.js';
import { checkOS, Platforms } from '../../utils/checkOS.js';
import debounce from '../../utils/debounce.js';
import { getRoot } from '../../utils/fileUtils/base.js';
import {
  getProjectConfig,
  generateConfigFile,
  getDevConf
} from '../../utils/fileUtils/index.js';
import { preCheckDeno } from '../../utils/installDeno.js';
import { preCheckEw2 } from '../../utils/installEw2.js';

import doProcess from './doProcess.js';
import ew2Pack from './ew2/devPack.js';
import Ew2Server from './ew2/server.js';
import mockPack from './mockWorker/devPack.js';
import MockServer from './mockWorker/server.js';

let yargsIns: Argv;
const OS = checkOS();
const EW2OS = [Platforms.AppleArm, Platforms.AppleIntel, Platforms.LinuxX86];
const useEw2 = EW2OS.includes(OS);
const dev: CommandModule = {
  command: 'dev [entry]',
  describe: `💻 ${t('dev_describe').d('Start a local server for developing your routine')}`,
  builder: (yargs: Argv) => {
    yargsIns = yargs
      .positional('entry', {
        describe: t('dev_entry_describe').d('Entry file of the Routine'),
        type: 'string',
        demandOption: false
      })
      .option('p', {
        alias: 'port',
        describe: t('dev_port_describe').d('Port to listen on'),
        type: 'number'
      })
      .option('m', {
        alias: 'minify',
        describe: t('dev_option_minify').d('Minify code during development'),
        type: 'boolean',
        default: false
      })
      .option('refresh-command', {
        describe: t('dev_refresh_command_describe').d(
          'Provide a command to be executed before the auto-refresh on save'
        ),
        type: 'string'
      })
      .option('local-upstream', {
        describe: t('dev_option_local_upstream').d(
          'Host to act as origin in development'
        ),
        type: 'string'
      })
      .option('debug', {
        describe: t('dev_option_debugger').d('Output debug logs'),
        type: 'boolean',
        default: false
      });

    if (!useEw2) {
      yargsIns.option('inspect-port', {
        describe: t('dev_inspect_port_describe').d(
          'Chrome inspect devTool port'
        ),
        type: 'number'
      });
    }
    return yargsIns;
  },
  handler: async (argv: ArgumentsCamelCase) => {
    let { port, inspectPort } = argv;
    let userFileRepacking = false; // Indicates that user code repacking does not change the .dev file
    const { entry, minify, refreshCommand, localUpstream, help, debug } = argv;

    if (yargsIns && help) {
      yargsIns.showHelp('log');
      process.exit(0);
    }

    if (debug) {
      logger.setLogLevel('debug');
    }

    // Get options and set global variables
    const projectConfig = getProjectConfig();

    if (!projectConfig) {
      if (!entry) {
        logger.notInProject();
        process.exit(1);
      }
      try {
        // If no config is found and an entry is provided, create a new one.
        await selectToCreateConf(entry as string);
      } catch (_) {
        logger.notInProject();
        process.exit(1);
      }
    }

    if (entry) {
      // @ts-ignore
      global.entry = entry;
    }

    if (port) {
      if (Array.isArray(port)) {
        port = Number(port[0]);
      } else {
        port = Number(port);
        if (isNaN(port as number)) {
          logger.warn(
            t('dev_import_port_invalid').d(
              'Invalid port entered, default port will be used.'
            )
          );
        }
      }
      // @ts-ignore
      global.port = port;
      logger.debug(`Entered port: ${port}`);
    }

    if (inspectPort) {
      if (Array.isArray(inspectPort)) {
        inspectPort = Number(inspectPort[0]);
      } else {
        inspectPort = Number(inspectPort);
        if (isNaN(inspectPort as number)) {
          logger.warn(
            t('dev_import_port_invalid').d(
              'Invalid port entered, default port will be used.'
            )
          );
        }
      }
      // @ts-ignore
      global.inspectPort = inspectPort;
    }

    if (minify) {
      // @ts-ignore
      global.minify = minify;
    }

    if (localUpstream) {
      const url = localUpstream as string;
      // @ts-ignore
      global.localUpstream = localUpstream;
      try {
        const hostname = new URL(url).hostname;
        if (isIP(hostname)) {
          logger.error(
            t('dev_ip_not_allowed', { url }).d(
              `Direct access to IP addresses is not allowed when setting local-upstream: ${url}`
            )
          );
          process.exit(1);
        }
      } catch (err) {
        logger.error(
          t('dev_url_invalid', { url }).d(
            `Invalid URL: ${url}. Please enter a valid URL.`
          )
        );
        process.exit(1);
      }
    }

    const checkFunc = useEw2 ? preCheckEw2 : preCheckDeno;
    const checkResult = await checkFunc();
    if (!checkResult) {
      process.exit(1);
    }

    if (useEw2) {
      const speEw2Port = getDevConf('port', 'dev', 18080);
      const result = await checkAndInputPort(speEw2Port);
      // @ts-ignore
      global.port = result.port;
    } else {
      const speDenoPort = getDevConf('port', 'dev', 18080);
      const speInspectPort = getDevConf('inspectPort', 'dev', 9229);
      const result = await checkAndInputPort(speDenoPort, speInspectPort);
      // @ts-ignore
      global.port = result.port;
      // @ts-ignore
      global.inspectPort = result.inspectPort;
    }

    const devPack = useEw2 ? ew2Pack : mockPack;
    try {
      await devPack();
    } catch (err) {
      process.exit(1);
    }

    let worker;

    if (useEw2) {
      worker = new Ew2Server({ onClose: onWorkerClosed });
    } else {
      worker = new MockServer({ command: checkResult as string });
    }

    try {
      await worker.start();
    } catch (err) {
      console.log('Track err', err);
      process.exit(1);
    }

    const ignored = (path: string) => {
      return /(^|[\/\\])\.(?!dev($|[\/\\]))/.test(path);
    };

    const watcher = chokidar.watch([`${getRoot()}/src`, `${getRoot()}/.dev`], {
      ignored,
      persistent: true
    });

    watcher.on(
      'change',
      debounce(async (path: string) => {
        if (path.includes('.dev')) {
          if (userFileRepacking) {
            userFileRepacking = false;
            return;
          }
          worker.restart(devPack);
          return;
        }
        logger.info('Dev repack');
        logger.log(
          `${t('dev_repacking').d('Detected local file changes, re-packaging')}...`
        );
        if (refreshCommand) {
          try {
            await execRefreshCommand(refreshCommand as string);
          } catch (err) {}
        }
        userFileRepacking = true;
        await worker.restart(devPack);
      }, 500)
    );

    var { devElement, exit } = doProcess(worker);
    const { waitUntilExit } = devElement;

    await waitUntilExit();
    function onWorkerClosed() {
      exit?.();
    }
    watcher.close();
  }
};

function execCommand(cmd: string): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    exec(cmd, (error, stdout, stderr) => {
      logger.log(stdout);
      if (error) {
        reject({ error, stderr });
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
}

function isSafeCommand(cmd: string) {
  const dangerousPatterns = [
    /[`;]/,
    /\|\|/,
    /&&/,
    />|<|>>|<<|&/,
    /\$(?=.*\()|=/
  ];
  return !dangerousPatterns.some((pattern) => pattern.test(cmd));
}

async function execRefreshCommand(cmd: string) {
  if (isSafeCommand(cmd)) {
    logger.ora.start(
      `${t('dev_refresh_exec_start').d('Trying to execute command:')} ${cmd}`
    );
    try {
      const { stderr } = await execCommand(cmd);
      logger.ora.succeed(
        `${t('dev_refresh_exec_success').d('Command executed successfully.')}`
      );
      if (stderr) {
        logger.ora.fail();
        logger.error(`Errors: ${stderr}`);
      }
    } catch (err: any) {
      logger.ora.fail();
      logger.error(
        `${t('dev_refresh_exec_fail').d('Command execution failed:')} ${err.error.message}`
      );
      if (err.stderr) {
        logger.error(`Errors: ${err.stderr}`);
      }
      logger.warn('Jumped it.');
    }
  } else {
    logger.error(
      t('dev_refresh_exec_unsafe').d(
        'Command execution failed: Invalid command'
      )
    );
  }
}

function selectToCreateConf(entry: string) {
  return new Promise((resolve, reject) => {
    logger.info('Configuration file not found');
    logger.log(
      t('dev_create_config').d(
        'Configuration file not found. Would you like to create one?'
      )
    );
    SelectItems({
      items: [
        { label: 'Yes', value: 'yes' },
        { label: 'No', value: 'no' }
      ],
      handleSelect: async (item: SelectItem) => {
        if (item.value === 'yes') {
          await generateConfigFile(undefined, {
            dev: {
              entry
            }
          });
          resolve(true);
        } else {
          reject(false);
        }
      }
    });
  });
}

export default dev;
