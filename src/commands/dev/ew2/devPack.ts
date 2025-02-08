import path from 'path';
import fs from 'fs';
import logger from '../../../libs/logger.js';
import devBuild from '../build.js';
import t from '../../../i18n/index.js';
import { getDevConf } from '../../../utils/fileUtils/index.js';
import { getRoot, getDirName } from '../../../utils/fileUtils/base.js';
import { checkPort } from '../../../utils/checkDevPort.js';
import { EW2Path } from '../../../utils/installEw2.js';

// 生成可用的Ew2端口
const generateEw2Port = async () => {
  let ew2port = 3322;
  let portAvailable = await checkPort(ew2port);
  while (!portAvailable) {
    ew2port += 1;
    portAvailable = await checkPort(ew2port);
  }
  // @ts-ignore
  global.ew2Port = ew2port;
  return ew2port;
};

const writeEw2config = (id: string, port: number, userRoot: string) => {
  const devDir = path.resolve(userRoot, '.dev');
  const devIndex = path.resolve(devDir, `index-${id}.js`);
  const devConfPath = path.resolve(devDir, `config-${id}.toml`);
  const erConfPath = path.resolve(EW2Path, `er.conf`);
  const config = `
port = ${port}
[debugger_cli_options]
enable = true
code_path = "${devIndex}"
conf_path = "${erConfPath}"
`;
  const erConf = JSON.stringify({
    Ttl: 301,
    ServiceOptions: {
      service_status: 'active'
    },
    InstanceOptions: {
      allow_node_module: true
    },
    ContextOptions: {
      vm_max_cpu_time: 100
    },
    ServiceOptionsMd5: '1',
    InstanceOptionsMd5: '2',
    ContextOptionsMd5: '3'
  });
  return Promise.all([
    fs.promises.writeFile(devConfPath, config),
    fs.promises.writeFile(erConfPath, erConf)
  ]);
};

// 生成入口文件
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

// 前期准备
const prepare = async (
  configPath: string,
  entry: string,
  port: number,
  localUpstream: string,
  userRoot: string
) => {
  const options: Record<string, any> = {};
  const currentOptions = { entry, port, localUpstream };
  // 支持同时跑多个 worker
  const id = new Date().getTime().toString();
  // @ts-ignore
  global.id = id;
  // 生成入口文件
  await generateEntry(id, entry, userRoot);
  // 生成 Ew2 配置
  const ew2port = await generateEw2Port();
  await writeEw2config(id, ew2port, userRoot);
  // 给每一次 dev 的配置项，在一个文件中通过 id 区分
  if (fs.existsSync(configPath)) {
    const currentConfig = fs
      .readFileSync(configPath, 'utf-8')
      .replace('export default ', '');
    const currentConfigObj = JSON.parse(currentConfig);
    const currentIds = Object.keys(currentConfigObj);
    if (currentIds[0] && /^\d+$/.test(currentIds[0])) {
      // 删除没有用到的入口
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

const devPack = async (restarting = false) => {
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
