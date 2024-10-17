import esbuild from 'esbuild';
import { lessLoader } from 'esbuild-plugin-less';
import path from 'path';
import { getRoot } from '../../../utils/fileUtils/base.js';
import { NODE_EXTERNALS } from '../../common/constant.js';

interface BuildOptions {
  minify?: boolean;
}

export default function (options: BuildOptions) {
  const userRoot = getRoot();
  // @ts-ignore
  const id = global.id;
  const devEntry = path.resolve(userRoot, `.dev/devEntry-${id}.js`);
  return esbuild.build({
    entryPoints: [devEntry],
    outfile: path.resolve(userRoot, `.dev/index-${id}.js`),
    bundle: true,
    minify: !!options.minify,
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
}
