import fs from 'fs';
import path from 'path';

import _generator from '@babel/generator';
import parser from '@babel/parser';
import _traverse from '@babel/traverse';
import esbuild from 'esbuild';
import { lessLoader } from 'esbuild-plugin-less';

import { getRoot } from '../../utils/fileUtils/base.js';
import { NODE_EXTERNALS } from '../common/constant.js';

interface BuildOptions {
  minify?: boolean;
  isNode?: boolean;
}
type ReplacementKeys = 'cache' | 'EdgeKV';
const replacements = { cache: 'mockCache', EdgeKV: 'mockKV' };

const traverse = _traverse.default;
const generator = _generator.default;

const renameMock = {
  name: 'rename-mock',
  setup(build: esbuild.PluginBuild) {
    build.onEnd(() => {
      if (build.initialOptions.outfile) {
        const outFile = fs.readFileSync(build.initialOptions.outfile, 'utf-8');
        const ast: any = parser.parse(outFile, {
          sourceType: 'module'
        });

        traverse(ast, {
          Identifier(path) {
            const name = path.node.name;
            if (!replacements.hasOwnProperty(name)) {
              return;
            }
            if (
              path.parentPath?.type === 'MemberExpression' &&
              path.key === 'object'
            ) {
              path.node.name = replacements[name as ReplacementKeys];
            }
          }
        });
        const { code } = generator(ast);
        fs.writeFileSync(build.initialOptions.outfile, code);
      }
    });
  }
};

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
    platform: options.isNode ? 'node' : 'browser',
    // EW2 support node externals
    external: NODE_EXTERNALS,
    // @ts-ignore
    plugins: [lessLoader(), renameMock],
    loader: {
      '.client.js': 'text'
    }
  });
}
