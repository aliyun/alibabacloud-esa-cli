import esbuild from 'esbuild';
import { lessLoader } from 'esbuild-plugin-less';
import path from 'path';
import fs from 'fs';
import { getRoot } from '../../utils/fileUtils/base.js';
import { NODE_EXTERNALS } from '../common/constant.js';

const userRoot = getRoot();
const entry = path.resolve(userRoot, 'src/index.js');
const outfile = path.resolve(userRoot, '.dev/pub.js');

export default async function (
  minify = false,
  customEntry?: string,
  outputPath?: string
) {
  const entryPoint = customEntry
    ? path.isAbsolute(customEntry)
      ? customEntry
      : path.resolve(userRoot, customEntry)
    : entry;

  const outfile = path.resolve(outputPath ?? userRoot, '.dev/pub.js');
  const res = await esbuild.build({
    entryPoints: [entryPoint],
    outfile: outfile,
    bundle: true,
    // minifyWhitespace: true,
    // minifyIdentifiers: true,
    // minifySyntax: false,
    minify,
    splitting: false,
    format: 'esm',
    platform: 'browser',
    external: NODE_EXTERNALS,
    // @ts-ignore
    plugins: [lessLoader()],
    loader: {
      '.client.js': 'text'
    }
  });
  let contents = fs.readFileSync(outfile, 'utf-8');
  contents = contents.replace(/\/\*![\s\S]*?\*\//g, '');
  fs.writeFileSync(outfile, contents);
  return res;
}
