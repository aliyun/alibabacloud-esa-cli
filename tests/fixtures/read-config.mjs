// Exercise the shipped config readers in a fresh process, with the test's cwd/HOME.
import { resolve, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';

const cliRoot = resolve(dirname(process.argv[2]), '..');
const config = await import(
  pathToFileURL(resolve(cliRoot, 'dist/utils/fileUtils/index.js')).href
);
process.stdout.write(
  JSON.stringify({
    project: config.getProjectConfig(),
    projectPath: config.getProjectConfigPath(),
    cli: config.getCliConfig(),
    api: config.getApiConfig(),
    devUrl: config.getDevOpenBrowserUrl()
  })
);
