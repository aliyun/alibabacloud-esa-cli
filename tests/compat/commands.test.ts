/**
 * Command contracts drive the built CLI without source mocks. Help covers the
 * advertised surface; parser failures must exit 1 with the expected diagnostic
 * before prompts, local runtime startup, or cloud requests can run.
 */
import { beforeAll, describe, it, expect } from 'vitest';

import { runCli, type CliResult } from './helper';

interface OptionSpec {
  long: string;
  alias?: string;
}

interface CommandSpec {
  path: string[];
  options: OptionSpec[];
  requiredPositional?: string;
  positionalExample?: string;
  requiresEnvironment?: boolean;
}

const ENVIRONMENT_OPTIONS: OptionSpec[] = [
  { long: '--environment', alias: '-e' },
  { long: '--name', alias: '-n' }
];

const COMMAND_TREE: CommandSpec[] = [
  {
    path: ['login'],
    options: [
      { long: '--access-key-id', alias: '--ak' },
      { long: '--access-key-secret', alias: '--sk' },
      { long: '--sts-token' }
    ]
  },
  { path: ['logout'], options: [] },
  {
    path: ['config'],
    options: [
      { long: '--local', alias: '-l' },
      { long: '--global', alias: '-g' }
    ]
  },
  { path: ['lang'], options: [] },
  {
    path: ['dev'],
    options: [
      { long: '--port', alias: '-p' },
      { long: '--minify', alias: '-m' },
      { long: '--refresh-command' },
      { long: '--local-upstream' }
    ]
  },
  {
    path: ['commit'],
    options: [
      { long: '--minify', alias: '-m' },
      { long: '--assets', alias: '-a' },
      { long: '--description', alias: '-d' },
      { long: '--name', alias: '-n' },
      { long: '--environment', alias: '-e' },
      { long: '--bundle' },
      { long: '--no-bundle' }
    ]
  },
  {
    path: ['deploy'],
    options: [
      { long: '--version', alias: '-v' },
      { long: '--environment', alias: '-e' },
      { long: '--name', alias: '-n' },
      { long: '--assets', alias: '-a' },
      { long: '--description', alias: '-d' },
      { long: '--minify', alias: '-m' },
      { long: '--bundle' },
      { long: '--no-bundle' },
      { long: '--preview' },
      { long: '--no-preview' },
      { long: '--versions' }
    ]
  },
  {
    path: ['init'],
    options: [
      { long: '--framework', alias: '-f' },
      { long: '--language', alias: '-l' },
      { long: '--template', alias: '-t' },
      { long: '--yes', alias: '-y' },
      { long: '--git', alias: '-g' },
      { long: '--deploy', alias: '-d' },
      { long: '--install-esa-cli' }
    ]
  },
  { path: ['site', 'list'], options: [] },
  {
    path: ['project', 'list'],
    options: [{ long: '--keyword', alias: '-k' }]
  },
  {
    path: ['project', 'delete'],
    options: [],
    requiredPositional: 'projectName',
    positionalExample: 'contract-project'
  },
  {
    path: ['domain', 'add'],
    options: [],
    requiredPositional: 'domain',
    positionalExample: 'contract.example.invalid'
  },
  { path: ['domain', 'list'], options: [] },
  {
    path: ['domain', 'delete'],
    options: [],
    requiredPositional: 'domain',
    positionalExample: 'contract.example.invalid'
  },
  { path: ['deployments', 'list'], options: [] },
  {
    path: ['deployments', 'delete'],
    options: [{ long: '-i' }]
    // [deploymentId..] is optional because -i selects IDs interactively.
  },
  {
    path: ['route', 'add'],
    options: [
      { long: '--route', alias: '-r' },
      { long: '--site', alias: '-s' },
      { long: '--alias', alias: '-a' }
    ]
  },
  { path: ['route', 'list'], options: [] },
  {
    path: ['route', 'delete'],
    options: [],
    requiredPositional: 'routeName',
    positionalExample: 'contract-route'
  },
  {
    path: ['env', 'list'],
    options: ENVIRONMENT_OPTIONS,
    requiresEnvironment: true
  },
  {
    path: ['env', 'set'],
    options: ENVIRONMENT_OPTIONS,
    requiredPositional: 'assignment',
    positionalExample: 'CONTRACT_KEY=value',
    requiresEnvironment: true
  },
  {
    path: ['env', 'delete'],
    options: ENVIRONMENT_OPTIONS,
    requiredPositional: 'key',
    positionalExample: 'CONTRACT_KEY',
    requiresEnvironment: true
  },
  {
    path: ['secret', 'put'],
    options: [...ENVIRONMENT_OPTIONS, { long: '--stdin' }],
    requiredPositional: 'key',
    positionalExample: 'CONTRACT_SECRET',
    requiresEnvironment: true
  },
  {
    path: ['secret', 'bulk'],
    options: ENVIRONMENT_OPTIONS,
    requiredPositional: 'file',
    positionalExample: 'contract-secrets.env',
    requiresEnvironment: true
  }
];

const GLOBAL_OPTIONS: OptionSpec[] = [
  { long: '--debug' },
  { long: '--skip-update-check' },
  { long: '--help', alias: '-h' },
  { long: '--version', alias: '-v' }
];

const PARENT_COMMANDS = [
  'site',
  'project',
  'domain',
  'deployments',
  'route',
  'env',
  'secret'
];

function output(result: CliResult): string {
  return result.stdout + result.stderr;
}

function expectHelp(result: CliResult): void {
  expect(result.exitCode).toBe(0);
  expect(output(result)).toContain('Options:');
  expect(output(result)).toContain('--help');
}

function expectFailure(result: CliResult, diagnostic: string | RegExp): void {
  expect(result.exitCode).toBe(1);
  if (typeof diagnostic === 'string')
    expect(output(result)).toContain(diagnostic);
  else expect(output(result)).toMatch(diagnostic);
  expect(output(result)).not.toMatch(
    /Offline CLI attempted network access|TypeError:|ReferenceError:/
  );
}

function positionalArgs(spec: CommandSpec): string[] {
  return spec.positionalExample ? [spec.positionalExample] : [];
}

function requiredOptions(spec: CommandSpec): string[] {
  return spec.requiresEnvironment ? ['--environment', 'staging'] : [];
}

describe('root command', () => {
  for (const option of ['--version', '-v']) {
    it(`esa ${option} outputs only the package semver`, async () => {
      const result = await runCli([option, '--skip-update-check']);
      expect(result.exitCode).toBe(0);
      expect(result.stdout.trim()).toMatch(
        /^v?\d+\.\d+\.\d+(?:-[\da-zA-Z.-]+)?(?:\+[\da-zA-Z.-]+)?$/
      );
    });
  }

  it('root help exactly matches the command inventory', async () => {
    const result = await runCli(['--help', '--skip-update-check']);
    expectHelp(result);
    const advertised = [...result.stdout.matchAll(/^\s+esa-cli ([a-z-]+)\b/gm)]
      .map((match) => match[1])
      .sort();
    expect(advertised).toEqual(
      [...new Set(COMMAND_TREE.map((spec) => spec.path[0]))].sort()
    );
  });

  for (const args of [[], ['-h'], ['--debug', '--help']]) {
    it(`esa ${args.join(' ') || '(no args)'} displays help`, async () => {
      expectHelp(await runCli([...args, '--skip-update-check']));
    });
  }

  it('an unknown command exits 1 with the parser diagnostic', async () => {
    expectFailure(
      await runCli(['this-command-does-not-exist', '--skip-update-check']),
      'Unknown argument: this-command-does-not-exist'
    );
  });
});

describe('parent command help', () => {
  for (const parent of PARENT_COMMANDS) {
    for (const flag of ['--help', '-h']) {
      it(`esa ${parent} ${flag} lists every registered subcommand`, async () => {
        const result = await runCli([parent, flag, '--skip-update-check']);
        expectHelp(result);
        const advertised = [
          ...output(result).matchAll(
            new RegExp(`^\\s+esa-cli ${parent} ([a-z-]+)\\b`, 'gm')
          )
        ]
          .map((match) => match[1])
          .sort();
        expect(advertised).toEqual(
          COMMAND_TREE.filter((spec) => spec.path[0] === parent)
            .map((spec) => spec.path[1])
            .sort()
        );
      });
    }
  }
});

describe('command help and option inventory', () => {
  for (const spec of COMMAND_TREE) {
    const name = spec.path.join(' ');
    describe(`esa ${name}`, () => {
      let help: CliResult;
      beforeAll(async () => {
        help = await runCli([...spec.path, '--help', '--skip-update-check']);
      });

      it('--help exits 0 and displays help', () => {
        expectHelp(help);
        expect(output(help)).toContain(`esa-cli ${name}`);
      });

      it('-h independently exits 0 and displays help', async () => {
        const result = await runCli([
          ...spec.path,
          '-h',
          '--skip-update-check'
        ]);
        expectHelp(result);
        expect(output(result)).toContain(`esa-cli ${name}`);
      });

      for (const option of spec.options) {
        for (const flag of [
          option.long,
          ...(option.alias ? [option.alias] : [])
        ]) {
          it(`--help documents ${flag}`, () => {
            expectHelp(help);
            expect(output(help)).toMatch(
              new RegExp(`(?:^|[\\s,])${flag}(?=[\\s,]|$)`, 'm')
            );
          });
        }
      }
    });
  }

  it('dev documents inspect-port exactly on platforms using the mock runtime', async () => {
    const result = await runCli(['dev', '--help', '--skip-update-check']);
    expectHelp(result);
    const usesEw2 =
      process.platform === 'darwin' ||
      (process.platform === 'linux' && process.arch === 'x64');
    expect(output(result).includes('--inspect-port')).toBe(!usesEw2);
  });
});

describe('required arguments are rejected before executing commands', () => {
  for (const spec of COMMAND_TREE.filter(
    (command) => command.requiredPositional
  )) {
    it(`esa ${spec.path.join(' ')} requires <${spec.requiredPositional}>`, async () => {
      expectFailure(
        await runCli([
          ...spec.path,
          ...requiredOptions(spec),
          '--skip-update-check'
        ]),
        'Not enough non-option arguments: got 0, need at least 1'
      );
    });
  }

  for (const parent of ['env', 'secret']) {
    it(`esa ${parent} requires a subcommand`, async () => {
      expectFailure(
        await runCli([parent, '--skip-update-check']),
        'Not enough non-option arguments: got 0, need at least 1'
      );
    });
  }

  for (const spec of COMMAND_TREE.filter(
    (command) => command.requiresEnvironment
  )) {
    it(`esa ${spec.path.join(' ')} requires --environment`, async () => {
      expectFailure(
        await runCli([
          ...spec.path,
          ...positionalArgs(spec),
          '--skip-update-check'
        ]),
        'Missing required argument: environment'
      );
    });
  }
});

describe('invalid values are rejected without --help bypassing validation', () => {
  const environmentCommands = COMMAND_TREE.filter((spec) =>
    spec.options.some((option) => option.long === '--environment')
  );
  for (const spec of environmentCommands) {
    for (const flag of ['--environment', '-e']) {
      it(`esa ${spec.path.join(' ')} rejects ${flag} development`, async () => {
        const result = await runCli([
          ...spec.path,
          ...positionalArgs(spec),
          flag,
          'development',
          '--skip-update-check'
        ]);
        expectFailure(result, 'Invalid values:');
        expect(output(result)).toContain('Argument: environment');
        expect(output(result)).toContain('Given: "development"');
        expect(output(result)).toContain('Choices: "staging", "production"');
      });
    }
  }

  for (const flag of ['--language', '-l']) {
    it(`esa init rejects ${flag} coffeescript before installation`, async () => {
      const result = await runCli([
        'init',
        flag,
        'coffeescript',
        '--skip-update-check'
      ]);
      expectFailure(result, 'Invalid values:');
      expect(output(result)).toContain('Argument: language');
      expect(output(result)).toContain('Given: "coffeescript"');
      expect(output(result)).toContain('Choices: "typescript", "javascript"');
    });
  }

  it('env set rejects an assignment without = before resolving credentials', async () => {
    expectFailure(
      await runCli([
        'env',
        'set',
        'CONTRACT_KEY',
        '--environment',
        'staging',
        '--skip-update-check'
      ]),
      'Expected an environment variable in KEY=VALUE format.'
    );
  });

  it('secret put rejects an invalid key before requesting a secret value', async () => {
    expectFailure(
      await runCli([
        'secret',
        'put',
        'INVALID-KEY',
        '--environment',
        'staging',
        '--stdin',
        '--skip-update-check'
      ]),
      'Environment variable key INVALID-KEY may contain only letters, numbers, and underscores.'
    );
  });
});

describe('deploy parser validates weighted versions before accessing a project', () => {
  const cases = [
    {
      args: ['--versions', 'v1:not-a-number'],
      diagnostic: 'invalid --versions format. Use v1:80,v2:20'
    },
    {
      args: ['--versions', 'v1:90'],
      diagnostic: 'single version must be 100%'
    },
    {
      args: ['--versions', 'v1:80', '--versions', 'v2:10'],
      diagnostic: 'percentages must sum to 100'
    },
    {
      args: ['--versions', 'v1:50,v2:25,v3:25'],
      diagnostic: 'at most two versions are supported'
    }
  ];
  for (const { args, diagnostic } of cases) {
    it(`rejects ${args.join(' ')}`, async () => {
      expectFailure(
        await runCli(['deploy', ...args, '--skip-update-check']),
        `Deploy failed: ${diagnostic}`
      );
    });
  }

  // These cases prove flag registration through the real parser. Preview URL
  // display and bundle output require successful deployments and are not tested here.
  for (const flag of ['--preview', '--no-preview', '--bundle', '--no-bundle']) {
    it(`accepts ${flag} and still rejects invalid version percentages`, async () => {
      expectFailure(
        await runCli([
          'deploy',
          flag,
          '--versions',
          'v1:not-a-number',
          '--skip-update-check'
        ]),
        'Deploy failed: invalid --versions format. Use v1:80,v2:20'
      );
    });
  }
});

describe('global options', () => {
  for (const option of GLOBAL_OPTIONS) {
    for (const flag of [option.long, ...(option.alias ? [option.alias] : [])]) {
      it(`root help documents ${flag}`, async () => {
        const result = await runCli(['--help', '--skip-update-check']);
        expectHelp(result);
        expect(output(result)).toMatch(
          new RegExp(`(?:^|[\\s,])${flag}(?=[\\s,]|$)`, 'm')
        );
      });
    }
  }

  for (const spec of COMMAND_TREE) {
    it(`esa ${spec.path.join(' ')} accepts --debug and --skip-update-check`, async () => {
      expectHelp(
        await runCli([...spec.path, '--debug', '--skip-update-check', '--help'])
      );
    });
  }
});

describe('strict unknown-option handling', () => {
  for (const spec of [{ path: [], options: [] }, ...COMMAND_TREE]) {
    it(`esa ${spec.path.join(' ') || '(root)'} rejects unknown options`, async () => {
      expectFailure(
        await runCli([
          ...spec.path,
          ...positionalArgs(spec),
          ...requiredOptions(spec),
          '--unexpected-contract-option',
          '--skip-update-check'
        ]),
        /Unknown arguments?:.*unexpected-contract-option/
      );
    });
  }
});
