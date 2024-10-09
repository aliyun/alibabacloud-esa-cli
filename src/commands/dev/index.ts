import { CommandModule, ArgumentsCamelCase, Argv } from 'yargs';
import { exec } from 'child_process';
import chokidar from 'chokidar';
import doProcess from './doProcess.js';
import {
  getProjectConfig,
  getRoot,
  generateConfigFile,
  getDevConf
} from '../../utils/fileUtils/index.js';
import SelectItems, { SelectItem } from '../../components/selectInput.js';
import logger from '../../libs/logger.js';
import devPack from './devPack.js';
import WorkerServer from './server.js';
import { preCheckRuntime } from '../../utils/installRuntime.js';
import debounce from '../../utils/debounce.js';
import t from '../../i18n/index.js';
import checkAndInputPort from '../../utils/checkDevPort.js';

let yargsIns: Argv;
const dev: CommandModule = {
  command: 'dev [entry]',
  describe: `💻 ${t('dev_describe').d('Start a local server for developing your routine')}`,
  builder: (yargs: Argv) => {
    yargsIns = yargs;
    return yargs
      .positional('entry', {
        describe: t('dev_entry_describe').d('Entry file of the Routine'),
        type: 'string',
        demandOption: false
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
      .option('m', {
        alias: 'minify',
        describe: t('dev_option_minify').d('Minify code during development'),
        type: 'boolean',
        default: false
      })
      .option('inspect-port', {
        describe: t('dev_inspect_port_describe').d(
          'Chrome inspect devTool port'
        ),
        type: 'number'
      })
      .option('p', {
        alias: 'port',
        describe: t('dev_port_describe').d('Port to listen on'),
        type: 'number'
      });
  },
  handler: async (argv: ArgumentsCamelCase) => {
    let { port, inspectPort } = argv;
    let userFileRepacking = false; // flag of user code repack not .dev file change
    const { entry, minify, refreshCommand, localUpstream, help } = argv;

    if (yargsIns && help) {
      yargsIns.showHelp('log');
      return;
    }

    const projectConfig = getProjectConfig();
    if (!projectConfig) {
      if (entry) {
        try {
          await selectToCreateConf(entry as string);
        } catch (_) {
          logger.notInProject();
          process.exit(1);
        }
      } else {
        return logger.notInProject();
      }
    } else if (entry) {
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
    }

    if (inspectPort) {
      inspectPort = Number(inspectPort);
      // @ts-ignore
      global.inspectPort = inspectPort;
    }

    if (minify) {
      // @ts-ignore
      global.minify = minify;
    }

    if (minify) {
      // @ts-ignore
      global.minify = minify;
    }

    if (localUpstream) {
      // @ts-ignore
      global.localUpstream = localUpstream;
    }
    const runtimeCommand = await preCheckRuntime();
    if (!runtimeCommand) {
      return;
    }
    const speDenoPort = getDevConf('port', 'dev', 18080);
    const speInspectPort = getDevConf('inspectPort', 'dev', 9229);
    try {
      const result = await checkAndInputPort(speDenoPort, speInspectPort);
      // @ts-ignore
      global.port = result.denoPort;
      // @ts-ignore
      global.inspectPort = result.inspectPort;
    } catch (err) {
      process.exit(1);
    }

    logger.info(`${t('dev_build_start').d('Starting build process')}...`);
    await devPack();
    const worker = new WorkerServer({ command: runtimeCommand });
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
          worker.restart();
          return;
        }
        logger.info(
          `${t('dev_repacking').d('Detected local file changes, re-packaging')}...`
        );
        if (refreshCommand) {
          try {
            await execRefreshCommand(refreshCommand as string);
          } catch (err) {}
        }
        userFileRepacking = true;
        await devPack();
        await worker.restart();
      }, 500)
    );
    const { devElement } = doProcess(worker);
    const { waitUntilExit } = devElement;
    await waitUntilExit();
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
    logger.info(
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
