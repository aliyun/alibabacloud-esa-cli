import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';

export const fixtureKey = 'fixture-access-key';
export const fixtureSecret = 'fixture-access-secret';

export async function startCloudFixture(project?: {
  name: string;
  domain: string;
}) {
  const calls: string[] = [];
  const requests: { action: string; projectName: string | null }[] = [];
  const server = createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://fixture');
    const action = String(
      req.headers['x-acs-action'] || url.searchParams.get('Action') || ''
    );
    calls.push(action);
    const projectName = url.searchParams.get('Name');
    requests.push({ action, projectName });
    const authorization = String(req.headers.authorization ?? '');
    const valid =
      authorization.includes(fixtureKey) ||
      url.searchParams.get('AccessKeyId') === fixtureKey;
    res.setHeader('content-type', 'application/json');
    if (action === 'GetErService') {
      res.statusCode = valid ? 200 : 403;
      res.end(
        JSON.stringify(
          valid
            ? { Status: 'Running', RequestId: 'fixture' }
            : {
                Code: 'InvalidAccessKeyId.NotFound',
                Message: 'Fixture rejected credentials',
                RequestId: 'fixture'
              }
        )
      );
    } else if (
      project &&
      valid &&
      projectName === project.name &&
      ['GetRoutine', 'ListRoutineRelatedRecords'].includes(action)
    ) {
      res.end(
        JSON.stringify(
          action === 'GetRoutine'
            ? { Name: project.name, DefaultRelatedRecord: project.domain }
            : {
                RelatedRecords: [{ RecordName: project.domain }],
                TotalCount: 1
              }
        )
      );
    } else {
      res.statusCode = 500;
      res.end(
        JSON.stringify({
          Code: 'UnexpectedFixtureRequest',
          Message: `Unconfigured action: ${action}`
        })
      );
    }
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  return {
    calls,
    requests,
    port: String((server.address() as AddressInfo).port),
    close: () =>
      new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve()))
      )
  };
}
