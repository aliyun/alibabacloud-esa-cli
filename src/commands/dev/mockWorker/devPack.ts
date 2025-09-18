import fs from 'fs';
import path from 'path';

import t from '../../../i18n/index.js';
import logger from '../../../libs/logger.js';
import { checkPort } from '../../../utils/checkDevPort.js';
import { getRoot, getDirName } from '../../../utils/fileUtils/base.js';
import { getDevConf } from '../../../utils/fileUtils/index.js';
import devBuild from '../build.js';

const generateEntry = async (
  id: string,
  projectEntry: string,
  userRoot: string
) => {
  const __dirname = getDirName(import.meta.url);

  const devDir = path.resolve(userRoot, '.dev');
  const devEntry = path.resolve(devDir, `devEntry-${id}.js`);
  const devEntryTemp = path.resolve(__dirname, './devEntry.js');
  const devEntryTempFile = fs.readFileSync(devEntryTemp, 'utf-8');

  const mockDevDir = path.resolve(userRoot, '.dev/mock');
  const mockDir = path.resolve(__dirname, './mock');

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
    devEntryTempFile.replace(
      /'\$userPath'/g,
      `'${projectEntry.replace(/\\/g, '/')}'`
    )
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
  // Support running multiple deno instances simultaneously
  const id = new Date().getTime().toString();
  // @ts-ignore
  global.id = id;
  await generateEntry(id, entry, userRoot);
  // Configuration items for each dev session, distinguished by id in one file
  if (fs.existsSync(configPath)) {
    const currentConfig = fs
      .readFileSync(configPath, 'utf-8')
      .replace('export default ', '');
    const currentConfigObj = JSON.parse(currentConfig);
    const currentIds = Object.keys(currentConfigObj);
    if (currentIds[0] && /^\d+$/.test(currentIds[0])) {
      for (let currentId of currentIds) {
        const unused = await checkPort(currentConfigObj[currentId].port);
        if (unused) {
          const devDir = path.resolve(userRoot, '.dev');
          const files = fs.readdirSync(devDir);
          const filesToDelete = files.filter((file) =>
            file.includes(currentId)
          );
          for (const file of filesToDelete) {
            fs.rmSync(path.resolve(devDir, file), {
              force: true,
              recursive: true,
              maxRetries: 5
            });
          }
        } else {
          options[currentId] = currentConfigObj[currentId];
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
  // Try to find config file in order of preference: .jsonc, .toml
  const configFormats = ['esa.jsonc', 'esa.toml'];
  let configPath: string | null = null;

  for (const format of configFormats) {
    const testPath = path.resolve(userRoot, format);
    if (fs.existsSync(testPath)) {
      configPath = testPath;
      break;
    }
  }

  let port: number, minify: boolean, localUpstream: string, entry: string;
  let projectEntry = path.resolve(userRoot, 'src/index.js');

  if (configPath) {
    port = getDevConf('port', 'dev', 18080);
    minify = getDevConf('minify', 'dev', false);
    localUpstream = getDevConf('localUpstream', 'dev', '');
    entry = getDevConf('entry', '', '');

    if (entry) {
      projectEntry = path.resolve(userRoot, entry);
    }
  } else {
    logger.notInProject();
    process.exit(1);
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
