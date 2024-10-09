import path from 'path';
import fs from 'fs';
import logger from '../../libs/logger.js';
import devBuild from './config/devBuild.js';
import t from '../../i18n/index.js';
import {
  getDevConf,
  getRoot,
  getDirName
} from '../../utils/fileUtils/index.js';
import { checkPort } from '../../utils/checkDevPort.js';

const generateEntry = async (
  id: string,
  projectEntry: string,
  userRoot: string
) => {
  const __dirname = getDirName(import.meta.url);

  const devDir = path.resolve(userRoot, '.dev');
  const devEntry = path.resolve(devDir, `devEntry-${id}.js`);
  const devEntryTemp = path.resolve(__dirname, './config/devEntry.js');
  const devEntryTempFile = fs.readFileSync(devEntryTemp, 'utf-8');

  const mockDevDir = path.resolve(userRoot, '.dev/mock');
  const mockDir = path.resolve(__dirname, './config/mock');

  if (!fs.existsSync(devDir)) {
    await fs.promises.mkdir(devDir);
  }

  if (!fs.existsSync(mockDevDir)) {
    await fs.promises.mkdir(mockDevDir);
  }

  const entries = await fs.promises.readdir(mockDir);

  for (const file of entries) {
    const srcPath = path.resolve(mockDir, file);
    const destPath = path.resolve(mockDevDir, file);
    await fs.promises.copyFile(srcPath, destPath);
  }

  return fs.promises.writeFile(
    devEntry,
    devEntryTempFile.replace(/'\$userPath'/g, `'${projectEntry}'`)
  );
};

const prepare = async (
  configPath: string,
  entry: string,
  port: number,
  localUpstream: string,
  userRoot: string
) => {
  const options: Record<string, any> = {};
  const currentOptions = { entry, port, localUpstream };
  const id = new Date().getTime().toString();
  // @ts-ignore
  global.id = id;
  await generateEntry(id, entry, userRoot);
  if (fs.existsSync(configPath)) {
    const currentConfig = fs
      .readFileSync(configPath, 'utf-8')
      .replace('export default ', '');
    const currentConfigObj = JSON.parse(currentConfig);
    const cIds = Object.keys(currentConfigObj);
    if (cIds[0] && /^\d+$/.test(cIds[0])) {
      for (let cid of cIds) {
        const useful = await checkPort(currentConfigObj[cid].port);
        if (useful) {
          const unusedEntry = path.resolve(userRoot, `.dev/index-${cid}.js`);
          const unusedTemp = path.resolve(userRoot, `.dev/devEntry-${cid}.js`);
          if (fs.existsSync(unusedEntry)) {
            fs.rmSync(unusedEntry);
          }
          if (fs.existsSync(unusedTemp)) {
            fs.rmSync(unusedTemp);
          }
        } else {
          options[cid] = currentConfigObj[cid];
        }
      }
    }
  }
  return fs.promises.writeFile(
    configPath,
    `export default ${JSON.stringify(Object.assign(options, { [id]: currentOptions }))}`
  );
};

const devPack = async () => {
  logger.ora.start('Processing...\n');

  const userRoot = getRoot();
  const configPath = path.resolve(userRoot, 'esa.toml');

  let port: number, minify: boolean, localUpstream: string, entry: string;
  let projectEntry = path.resolve(userRoot, 'src/index.js');

  if (fs.existsSync(configPath)) {
    port = getDevConf('port', 'dev', 18080);
    minify = getDevConf('minify', 'dev', false);
    localUpstream = getDevConf('localUpstream', 'dev', '');
    entry = getDevConf('entry', '', '');

    if (entry) {
      projectEntry = path.resolve(userRoot, entry);
    }
  } else {
    logger.notInProject();
    process.exit(0);
  }
  return prepare(
    path.resolve(userRoot, '.dev/devConfig.js'),
    projectEntry,
    port,
    localUpstream,
    userRoot
  )
    .then(() => {
      logger.ora.succeed(
        t('dev_pack_config_success').d('Config created successfully')
      );
      return devBuild({
        minify
      });
    })
    .then(() => {
      logger.ora.succeed(
        t('dev_pack_success').d('Build finished successfully')
      );
      logger.ora.stop();
      logger.block();
    })
    .catch((err) => {
      logger.ora.fail('Build Failed');
      logger.error(
        `${t('common_error_occurred').d('An error occurred')}: ${err}`
      );
      if (err.toString().includes('EACCES')) {
        logger.pathEacces(getDirName(import.meta.url));
      }
      process.exit(1);
    });
};

export default devPack;
