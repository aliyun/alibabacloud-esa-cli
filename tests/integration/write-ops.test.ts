import { randomBytes } from 'node:crypto';
import { describe, it, expect } from 'vitest';
import { CREDENTIALS, hasCredentials } from './credentials';
import { cli, cloudApi, withProject } from './helper';

const suite = hasCredentials() ? describe : describe.skip;
suite('real API resource lifecycle', () => {
  it('binds a domain, reads it back, deletes it and verifies removal', async () => {
    await withProject(async (project) => {
      const domain = `${project.name}.${CREDENTIALS!.domainSuffix}`;
      const records = async () =>
        (await cloudApi('ListRoutineRelatedRecords', { Name: project.name }))
          .RelatedRecords;
      try {
        expect(await cli(['domain', 'add', domain], project)).toContain(
          'successfully'
        );
        expect(
          (await records()).some(
            (record: { RecordName: string }) => record.RecordName === domain
          )
        ).toBe(true);
        expect(await cli(['domain', 'list'], project)).toContain(domain);
      } finally {
        expect(await cli(['domain', 'delete', domain], project)).toContain(
          'Delete domain success'
        );
        expect(
          (await records()).some(
            (record: { RecordName: string }) => record.RecordName === domain
          )
        ).toBe(false);
      }
    });
  });

  it('adds a route with the supported flags and deletes it by positional name', async () => {
    await withProject(async (project) => {
      const name = `ci-${randomBytes(4).toString('hex')}`;
      const pattern = `${project.name}.${CREDENTIALS!.domainSuffix}/*`;
      const routes = async () =>
        (await cloudApi('ListRoutineRoutes', { RoutineName: project.name }))
          .Configs;
      try {
        expect(
          await cli(
            [
              'route',
              'add',
              '--alias',
              name,
              '--site',
              CREDENTIALS!.siteName,
              '--route',
              pattern
            ],
            project
          )
        ).toContain('Add route success');
        expect(
          (await routes()).some(
            (route: { RouteName: string }) => route.RouteName === name
          )
        ).toBe(true);
        expect(await cli(['route', 'list'], project)).toContain(name);
      } finally {
        expect(await cli(['route', 'delete', name], project)).toContain(
          'Delete route success'
        );
        expect(
          (await routes()).some(
            (route: { RouteName: string }) => route.RouteName === name
          )
        ).toBe(false);
      }
    });
  });
});
