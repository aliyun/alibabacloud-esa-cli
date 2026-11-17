import { describe, expect, it } from 'vitest';
import { runCli } from './helper';

describe('deploy JSON argument contract', () => {
  it.each([
    { args: ['--output=xml'], diagnostic: 'Invalid values' },
    {
      args: ['--output=json', '--environment=invalid'],
      diagnostic: 'Invalid values'
    },
    {
      args: ['--versions', '--output=json'],
      diagnostic: 'Not enough arguments'
    }
  ])(
    'rejects $args without writing diagnostics to stdout',
    async ({ args, diagnostic }) => {
      const result = await runCli(['deploy', ...args, '--skip-update-check']);
      expect(result.exitCode).toBe(1);
      expect(result.stdout).toBe('');
      expect(result.stderr).toContain(diagnostic);
    }
  );
  it('accepts the backend arguments and reports missing credentials as JSON', async () => {
    const result = await runCli([
      'deploy',
      '--name=backend-app',
      '--assets=./dist',
      '--output=json',
      '--skip-update-check'
    ]);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).not.toContain('Unknown argument');
    expect(JSON.parse(result.stdout)).toEqual({
      schemaVersion: 1,
      app: 'backend-app',
      url: null,
      deployments: []
    });
  });
});
