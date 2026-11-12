import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { get } from 'node:https';
import { isIPv4 } from 'node:net';
import { describe, it, expect } from 'vitest';
import { hasCredentials } from './credentials';
import { cli, cloudApi, withProject } from './helper';

function requestStaging(
  ip: string,
  domain: string,
  token: string
): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    // Connect to the staging POP while preserving Host, TLS SNI and certificate verification.
    const request = get(
      {
        hostname: ip,
        servername: domain,
        headers: { host: domain },
        path: `/?esa_er_token=${encodeURIComponent(token)}`,
        agent: false
      },
      (response) => {
        let body = '';
        response.on('data', (chunk) => {
          body += chunk;
        });
        response.on('end', () =>
          resolve({ status: response.statusCode ?? 0, body })
        );
        response.on('error', reject);
      }
    );
    request.setTimeout(10000, () =>
      request.destroy(new Error('Staging HTTP timeout'))
    );
    request.on('error', reject);
  });
}

const suite = hasCredentials() ? describe : describe.skip;
suite('real CLI deployment lifecycle', () => {
  it('commits code, deploys that version to staging and serves the unique response', async () => {
    await withProject(async (project) => {
      const marker = `esa-release-verification:${project.name}`;
      writeFileSync(
        join(project.cwd, 'index.js'),
        `export default { async fetch() { return new Response(${JSON.stringify(marker)}); } };\n`
      );
      const output = await cli(
        [
          'commit',
          '--description',
          'CLI release verification',
          '--environment',
          'staging'
        ],
        project,
        120000
      );
      const version = output.match(
        /Code version\s+(\S+)\s+generated successfully/
      )?.[1];
      expect(
        version,
        'commit must report the newly uploaded code version'
      ).toBeTruthy();
      await cli(
        ['deploy', '--version', version!, '--environment', 'staging'],
        project,
        360000
      );
      const routine = await cloudApi('GetRoutine', { Name: project.name });
      const staging = routine.Envs.find(
        (env: { Env: string }) => env.Env === 'staging'
      );
      expect(staging?.CodeDeploy?.CodeVersions).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ CodeVersion: version, Percentage: 100 })
        ])
      );
      const token = await cloudApi('GetRoutineAccessToken', {
        Name: project.name
      });
      const domain = token.DefaultRelatedRecord || routine.DefaultRelatedRecord;
      expect(typeof domain === 'string' && /^[a-z0-9.-]+$/i.test(domain)).toBe(
        true
      );
      expect(typeof token.Token === 'string' && token.Token.length > 0).toBe(
        true
      );
      const stagingIps = await cloudApi('GetRoutineStagingEnvIp');
      const ip = stagingIps.IPV4?.find((value: string) => isIPv4(value));
      expect(ip, 'API must return a staging IPv4 address').toBeTruthy();
      const deadline = Date.now() + 120000;
      let served = false;
      while (Date.now() < deadline) {
        try {
          const response = await requestStaging(ip, domain, token.Token);
          if (response.status === 200 && response.body === marker) {
            served = true;
            break;
          }
        } catch {
          /* Allow bounded propagation delay; never accept an unverified response. */
        }
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
      expect(
        served,
        'Staging must serve the exact response from this run'
      ).toBe(true);
    });
  }, 720000);
});
