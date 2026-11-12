import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';

export const fixtureKey = 'fixture-access-key';
export const fixtureSecret = 'fixture-access-secret';
export const fixtureToken = 'fixture-security-token';

type FixtureEnvironment = 'staging' | 'production';
interface FixtureVariable {
  Type: 'plain_text' | 'secret_text';
  Value: string;
}

export async function startCloudFixture({
  project,
  purchased = true
}: {
  project?: { name: string; domain: string };
  purchased?: boolean;
} = {}) {
  const calls: string[] = [];
  const requests: { action: string; projectName: string | null }[] = [];
  const requestDetails: {
    action: string;
    projectName: string | null;
    environment: string | null;
    method: string | undefined;
    body: Record<string, string>;
    securityToken: string | null;
  }[] = [];
  const projects = new Map(project ? [[project.name, project.domain]] : []);
  const state = new Map<string, Map<string, FixtureVariable>>();
  const rejectedActions = new Set<string>();
  const variables = (name: string, environment: FixtureEnvironment) => {
    const key = `${name}:${environment}`;
    if (!state.has(key)) state.set(key, new Map());
    return state.get(key)!;
  };
  const server = createServer(async (req, res) => {
    res.setHeader('content-type', 'application/json');
    const send = (body: unknown, status = 200) => {
      res.statusCode = status;
      res.end(JSON.stringify(body));
    };
    const fail = (message: string, status = 400) =>
      send(
        { Code: 'FixtureFailure', Message: message, RequestId: 'fixture' },
        status
      );
    try {
      req.setEncoding('utf8');
      let rawBody = '';
      for await (const chunk of req) rawBody += chunk;
      const url = new URL(req.url ?? '/', 'http://fixture');
      const body = new URLSearchParams(rawBody);
      const fields = new URLSearchParams(url.searchParams);
      for (const [key, value] of body) fields.set(key, value);
      const action = String(
        req.headers['x-acs-action'] || fields.get('Action') || ''
      );
      const environmentAction = [
        'ListRoutineEnvironmentVariables',
        'SetRoutineEnvironmentVariables',
        'DeleteRoutineEnvironmentVariables'
      ].includes(action);
      const parameters = environmentAction ? body : fields;
      const projectName = parameters.get('Name');
      const environment = parameters.get('Env');
      const securityToken =
        String(
          req.headers['x-acs-security-token'] ||
            fields.get('SecurityToken') ||
            ''
        ) || null;
      calls.push(action);
      requests.push({ action, projectName });
      requestDetails.push({
        action,
        projectName,
        environment,
        method: req.method,
        body: Object.fromEntries(body),
        securityToken
      });
      const authorization = String(req.headers.authorization ?? '');
      const valid =
        (authorization.includes(fixtureKey) ||
          fields.get('AccessKeyId') === fixtureKey) &&
        (!securityToken || securityToken === fixtureToken);
      if (!valid) {
        send(
          {
            Code: 'InvalidAccessKeyId.NotFound',
            Message: 'Fixture rejected credentials',
            RequestId: 'fixture'
          },
          403
        );
        return;
      }
      if (action === 'GetSubscriptionPlan') {
        send({ Purchased: purchased, RequestId: 'fixture' });
        return;
      }
      if (action === 'GetErService') {
        send({ Status: 'Running', RequestId: 'fixture' });
        return;
      }
      if (environmentAction) {
        if (
          req.method !== 'POST' ||
          !String(req.headers['content-type']).startsWith(
            'application/x-www-form-urlencoded'
          ) ||
          !body.has('Name') ||
          !body.has('Env') ||
          [
            'Name',
            'Env',
            'KeyWord',
            'PageNumber',
            'PageSize',
            'EnvironmentVariables',
            'EnvironmentVariableKeys'
          ].some((key) => url.searchParams.has(key))
        )
          throw new Error(
            'Expected business parameters only in POST form data'
          );
      }
      if (rejectedActions.has(action)) {
        fail(`Fixture rejected ${action}`, 403);
        return;
      }
      const domain = projectName && projects.get(projectName);
      if (!projectName || !domain) {
        fail('Fixture project does not exist', 404);
        return;
      }
      if (action === 'GetRoutine') {
        send({ Name: projectName, DefaultRelatedRecord: domain });
        return;
      }
      if (action === 'ListRoutineRelatedRecords') {
        send({ RelatedRecords: [{ RecordName: domain }], TotalCount: 1 });
        return;
      }
      if (!environmentAction) {
        fail(`Unconfigured action: ${action}`, 500);
        return;
      }
      if (environment !== 'staging' && environment !== 'production')
        throw new Error('Expected an explicit environment');
      const current = variables(projectName, environment);
      if (action === 'ListRoutineEnvironmentVariables') {
        const pageNumber = Number(body.get('PageNumber') || 1);
        const pageSize = Number(body.get('PageSize') || 50);
        if (
          !Number.isInteger(pageNumber) ||
          pageNumber < 1 ||
          !Number.isInteger(pageSize) ||
          pageSize < 1
        )
          throw new Error('Invalid pagination');
        const entries = [...current].filter(([key]) =>
          key.includes(body.get('KeyWord') || '')
        );
        const page = entries.slice(
          (pageNumber - 1) * pageSize,
          pageNumber * pageSize
        );
        // Include fixture secret values to prove that the CLI masks them itself.
        send({
          EnvironmentVariables: Object.fromEntries(page),
          Count: page.length,
          TotalCount: entries.length,
          PageNumber: pageNumber,
          PageSize: pageSize
        });
      } else if (action === 'SetRoutineEnvironmentVariables') {
        const values: unknown = JSON.parse(
          body.get('EnvironmentVariables') || 'null'
        );
        if (!values || typeof values !== 'object' || Array.isArray(values))
          throw new Error('Expected JSON environment variables');
        for (const variable of Object.values(values))
          if (
            !variable ||
            !['plain_text', 'secret_text'].includes(variable.Type) ||
            typeof variable.Value !== 'string'
          )
            throw new Error('Invalid environment variable');
        for (const [key, variable] of Object.entries(values))
          current.set(key, { ...variable });
        send({ SetKeys: Object.keys(values), RequestId: 'fixture' });
      } else {
        const keys: unknown = JSON.parse(
          body.get('EnvironmentVariableKeys') || 'null'
        );
        if (!Array.isArray(keys) || keys.some((key) => typeof key !== 'string'))
          throw new Error('Expected JSON environment variable keys');
        const deleted = keys.filter((key) => current.delete(key));
        send({
          DeletedKeys: deleted,
          FailedKeys: keys.filter((key) => !deleted.includes(key)),
          RequestId: 'fixture'
        });
      }
    } catch {
      fail('Malformed fixture request');
    }
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  return {
    calls,
    requests,
    requestDetails,
    addProject: (name: string, domain = `${name}.fixture.test`) =>
      projects.set(name, domain),
    removeProject: (name: string) => {
      projects.delete(name);
      state.delete(`${name}:staging`);
      state.delete(`${name}:production`);
    },
    variables: (name: string, environment: FixtureEnvironment) =>
      Object.fromEntries(
        [...variables(name, environment)].map(([key, value]) => [
          key,
          { ...value }
        ])
      ),
    rejectAction: (action: string, enabled = true) => {
      if (enabled) rejectedActions.add(action);
      else rejectedActions.delete(action);
    },
    port: String((server.address() as AddressInfo).port),
    close: () =>
      new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve()))
      )
  };
}
