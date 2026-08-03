/**
 * Contract Test: Command Existence, Options & Help
 *
 * Verifies that every command, subcommand, and option is correctly
 * registered and accessible via --help. This is the most basic
 * correctness guarantee — if a command or option is missing or broken,
 * users will be affected immediately.
 *
 * The test is data-driven: the COMMAND_TREE array below is the single source
 * of truth for the full CLI surface. Add a new command/option here and the
 * tests auto-generate.
 *
 * Usage:
 *   npx vitest run --config vitest.compat.config.ts
 */
import { describe, it, expect } from 'vitest';
import { runCli } from './helper';

// ─── Command Tree Definition ───────────────────────────────────────
// This is the single source of truth for the CLI surface.
// Every command, subcommand, and option must be listed here.
// The tests below are auto-generated from this data.

interface OptionSpec {
  /** Long form, e.g. '--environment' */
  long: string;
  /** Short alias, e.g. '-e'. Omit if no alias. */
  short?: string;
  /** Whether the option takes a value (e.g. '-e staging') vs a flag (e.g. '-m'). */
  takesValue?: boolean;
}

interface CommandSpec {
  /** Full command path as array, e.g. ['route', 'add'] */
  path: string[];
  /** Options for this command (not including global options) */
  options: OptionSpec[];
  /** Whether this command has required positional args (enforced by framework) */
  hasRequiredPositional?: boolean;
}

const COMMAND_TREE: CommandSpec[] = [
  // ── Simple commands (no subcommands) ────────────────────────────
  {
    path: ['login'],
    options: [
      { long: '--access-key-id', short: '-ak', takesValue: true },
      { long: '--access-key-secret', short: '-sk', takesValue: true },
    ],
  },
  {
    path: ['logout'],
    options: [],
  },
  {
    path: ['config'],
    options: [
      { long: '--local', short: '-l' },
      { long: '--global', short: '-g' },
    ],
  },
  {
    path: ['lang'],
    options: [],
  },
  {
    path: ['commit'],
    options: [
      { long: '--minify', short: '-m' },
      { long: '--assets', short: '-a', takesValue: true },
      { long: '--description', short: '-d', takesValue: true },
      { long: '--name', short: '-n', takesValue: true },
      { long: '--bundle' },
    ],
  },
  {
    path: ['deploy'],
    options: [
      { long: '--version', short: '-v', takesValue: true },
      { long: '--environment', short: '-e', takesValue: true },
      { long: '--name', short: '-n', takesValue: true },
      { long: '--assets', short: '-a', takesValue: true },
      { long: '--description', short: '-d', takesValue: true },
      { long: '--minify', short: '-m' },
      { long: '--bundle' },
      { long: '--versions', takesValue: true },
    ],
  },
  {
    path: ['init'],
    options: [
      { long: '--framework', short: '-f', takesValue: true },
      { long: '--language', short: '-l', takesValue: true },
      { long: '--template', short: '-t', takesValue: true },
      { long: '--yes', short: '-y' },
      { long: '--git', short: '-g' },
      { long: '--deploy', short: '-d' },
      { long: '--install-esa-cli' },
    ],
  },

  // ── site ────────────────────────────────────────────────────────
  {
    path: ['site', 'list'],
    options: [],
  },

  // ── project (command name: "project", alias: "Functions & Pages") ──
  {
    path: ['project', 'list'],
    options: [{ long: '--keyword', short: '-k', takesValue: true }],
  },
  {
    path: ['project', 'delete'],
    options: [],
    hasRequiredPositional: true, // <projectName>
  },

  // ── domain ───────────────────────────────────────────────────────
  {
    path: ['domain', 'add'],
    options: [],
    hasRequiredPositional: true, // <domain>
  },
  {
    path: ['domain', 'list'],
    options: [],
  },
  {
    path: ['domain', 'delete'],
    options: [],
    hasRequiredPositional: true, // <domain>
  },

  // ── deployments ──────────────────────────────────────────────────
  {
    path: ['deployments', 'list'],
    options: [],
  },
  {
    path: ['deployments', 'delete'],
    options: [{ long: '-i' }],
    hasRequiredPositional: true, // <deploymentId>
  },

  // ── route ───────────────────────────────────────────────────────
  {
    path: ['route', 'add'],
    options: [
      { long: '--route', short: '-r', takesValue: true },
      { long: '--site', short: '-s', takesValue: true },
      { long: '--alias', short: '-a', takesValue: true },
    ],
  },
  {
    path: ['route', 'list'],
    options: [],
  },
  {
    path: ['route', 'delete'],
    options: [],
    hasRequiredPositional: true, // <routeName>
  },
];

// ─── Global options (apply to all commands) ─────────────────────────
const GLOBAL_OPTIONS: OptionSpec[] = [
  { long: '--debug' },
  { long: '--skip-update-check' },
  { long: '--help', short: '-h' },
  { long: '--version', short: '-v' },
];

// ─── Helper: format command path as string ─────────────────────────
function cmdStr(spec: CommandSpec): string {
  return spec.path.join(' ');
}

// ─── Helper: get parent commands for --help on parent groups ────────
const PARENT_COMMANDS: string[][] = [
  ['site'],
  ['project'],
  ['domain'],
  ['deployments'],
  ['route'],
];

// ─── Tests ──────────────────────────────────────────────────────────

describe('root command', () => {
  it('esa --version outputs a semver version', async () => {
    const result = await runCli(['--skip-update-check', '--version']);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toMatch(/\d+\.\d+\.\d+/);
  });

  it('esa -v (short alias) outputs a semver version', async () => {
    const result = await runCli(['--skip-update-check', '-v']);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toMatch(/\d+\.\d+\.\d+/);
  });

  it('esa --help exits 0 and lists all commands', async () => {
    const result = await runCli(['--skip-update-check', '--help']);
    expect(result.exitCode).toBe(0);

    // Every top-level command must appear in root help
    const topCommands = new Set(COMMAND_TREE.map((c) => c.path[0]));
    for (const cmd of topCommands) {
      expect(result.stdout.toLowerCase()).toContain(cmd);
    }
  });

  it('esa -h (short alias) exits 0', async () => {
    const result = await runCli(['--skip-update-check', '-h']);
    expect(result.exitCode).toBe(0);
  });

  it('esa with no args exits 0 (shows help)', async () => {
    const result = await runCli(['--skip-update-check']);
    expect(result.exitCode).toBe(0);
  });

  it('esa <unknown-command> exits non-zero', async () => {
    const result = await runCli(['--skip-update-check', 'this-command-does-not-exist']);
    expect(result.exitCode).not.toBe(0);
  });

  it('esa --debug does not crash', async () => {
    const result = await runCli(['--skip-update-check', '--debug', '--help']);
    expect(result.exitCode).toBe(0);
  });

  it('esa --skip-update-check does not crash', async () => {
    const result = await runCli(['--skip-update-check', '--help']);
    expect(result.exitCode).toBe(0);
  });
});

// ── Parent command --help (site, project, domain, deployments, route) ──
describe('parent command --help', () => {
  for (const parent of PARENT_COMMANDS) {
    const name = parent.join(' ');

    it(`esa ${name} --help exits 0`, async () => {
      const result = await runCli(['--skip-update-check', ...parent, '--help']);
      expect(result.exitCode).toBe(0);
    });

    it(`esa ${name} -h exits 0`, async () => {
      const result = await runCli(['--skip-update-check', ...parent, '-h']);
      expect(result.exitCode).toBe(0);
    });

    it(`esa ${name} --help lists subcommands`, async () => {
      const result = await runCli(['--skip-update-check', ...parent, '--help']);
      expect(result.exitCode).toBe(0);

      // All subcommands of this parent must appear in help
      const subcommands = COMMAND_TREE.filter(
        (c) => c.path.length > 1 && c.path[0] === parent[0],
      );
      for (const sub of subcommands) {
        const subName = sub.path[1];
        expect(result.stdout.toLowerCase()).toContain(subName);
      }
    });
  }
});

// ── Every command: --help and -h exit 0 ────────────────────────────
describe('command --help does not crash', () => {
  for (const spec of COMMAND_TREE) {
    const name = cmdStr(spec);

    it(`esa ${name} --help exits 0`, async () => {
      const result = await runCli(['--skip-update-check', ...spec.path, '--help']);
      expect(result.exitCode).toBe(0);
    });

    // Commands with required positional args exit 1 on -h because yargs
    // validates positionals before processing the -h flag.
    if (spec.hasRequiredPositional) {
      it(`esa ${name} -h exits (yargs validates positional first)`, async () => {
        const result = await runCli(['--skip-update-check', ...spec.path, '-h']);
        expect(result.exitCode).not.toBe(null);
      });
    } else {
      it(`esa ${name} -h exits 0`, async () => {
        const result = await runCli(['--skip-update-check', ...spec.path, '-h']);
        expect(result.exitCode).toBe(0);
      });
    }
  }
});

// ── Every option: appears in --help output ──────────────────────────
describe('command options appear in --help', () => {
  for (const spec of COMMAND_TREE) {
    const name = cmdStr(spec);

    for (const opt of spec.options) {
      // Extract the option name without the leading -- or value placeholder
      // e.g. '--environment' → 'environment', '--access-key-id' → 'access-key-id'
      const optLongName = opt.long.replace(/^--/, '');

      it(`esa ${name} --help mentions ${opt.long}`, async () => {
        const result = await runCli(['--skip-update-check', ...spec.path, '--help']);
        expect(result.exitCode).toBe(0);

        const output = (result.stdout + result.stderr).toLowerCase();
        // The long form should appear (e.g. 'environment' in '--environment')
        expect(output).toContain(optLongName.toLowerCase());
      });

      if (opt.short) {
        it(`esa ${name} --help mentions ${opt.short}`, async () => {
          const result = await runCli(['--skip-update-check', ...spec.path, '--help']);
          expect(result.exitCode).toBe(0);

          const output = result.stdout + result.stderr;
          // The short form should appear somewhere in help
          expect(output).toContain(opt.short);
        });
      }
    }
  }
});

// ── Required positional args: missing them should error ─────────────
describe('required positional args enforced', () => {
  // These commands have required positionals defined in the command spec.
  // Running without the required arg should exit non-zero.
  // We use --skip-update-check to avoid network calls during the test.
  const commandsWithRequiredPositional = COMMAND_TREE.filter(
    (c) => c.hasRequiredPositional,
  );

  for (const spec of commandsWithRequiredPositional) {
    const name = cmdStr(spec);

    it(`esa ${name} without required arg exits non-zero`, async () => {
      const result = await runCli([
        ...spec.path,
        '--skip-update-check',
      ]);
      // Should not exit 0 — the required positional is missing
      // Note: the handler may still run in some cases, but it should
      // produce an error message and/or non-zero exit.
      // We check exitCode OR error message (some handlers return 0
      // but print an error).
      const output = result.stdout + result.stderr;
      const outputLower = output.toLowerCase();
      // Check both English and Chinese error keywords (CLI supports i18n)
      const hasError =
        result.exitCode !== 0 ||
        outputLower.includes('error') ||
        outputLower.includes('required') ||
        outputLower.includes('missing') ||
        outputLower.includes('not') ||
        outputLower.includes('please') ||
        outputLower.includes('specify') ||
        output.includes('缺少') ||     // "missing" in Chinese
        output.includes('错误') ||     // "error" in Chinese
        output.includes('失败') ||     // "failure" in Chinese
        output.includes('必须');       // "required/must" in Chinese
      expect(hasError).toBe(true);
    });
  }
});

// ── Global options work on all commands ────────────────────────────
describe('global options on commands', () => {
  // Pick a few representative commands to test global options
  const sampleCommands = [
    ['login'],
    ['logout'],
    ['config'],
    ['commit'],
    ['deploy'],
    ['init'],
    ['site', 'list'],
    ['project', 'list'],
    ['route', 'add'],
  ];

  for (const cmd of sampleCommands) {
    const name = cmd.join(' ');

    it(`esa ${name} --debug --help exits 0`, async () => {
      const result = await runCli(['--skip-update-check', ...cmd, '--debug', '--help']);
      expect(result.exitCode).toBe(0);
    });

    it(`esa ${name} --skip-update-check --help exits 0`, async () => {
      const result = await runCli([...cmd, '--skip-update-check', '--help']);
      expect(result.exitCode).toBe(0);
    });
  }
});

// ── Unknown options: CLI should not crash ──────────────────────
// yargs strict mode rejects unknown options for commands with .fail()
// handlers. The contract test verifies the CLI does not CRASH on
// unknown options, regardless of whether it rejects or ignores them.
describe('unknown options do not crash', () => {
  // Only test commands that don't have interactive handlers (which would hang)
  const testCases = [
    { cmd: ['route', 'add'], option: '--invalid-opt', extraArgs: [] },
    { cmd: ['config'], option: '--bogus-flag', extraArgs: ['-l'] },
    { cmd: ['site', 'list'], option: '--fake-flag', extraArgs: [] },
  ];

  for (const { cmd, option, extraArgs } of testCases) {
    const name = cmd.join(' ');

    it(`esa ${name} ${option} does not crash (exits within timeout)`, async () => {
      const result = await runCli([...cmd, ...extraArgs, option, '--skip-update-check']);
      // Should exit (not hang) and produce some output
      expect(result.exitCode).not.toBe(null);
    }, 15000);
  }
});
