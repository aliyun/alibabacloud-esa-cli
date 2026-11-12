import { describe, it, expect } from 'vitest';
import { CREDENTIALS, hasCredentials } from './credentials';
import { cli, cloudApi, withProject } from './helper';

const suite = hasCredentials() ? describe : describe.skip;
suite('real API read operations', () => {
  it('site list contains the configured active test site on both calls', async () => {
    await withProject(async (project) => {
      const sites = await cloudApi('ListSites', {
        SiteName: CREDENTIALS!.siteName,
        SiteSearchType: 'exact',
        Status: 'active',
        PageSize: 500
      });
      expect(
        sites.Sites.some(
          (site: { SiteId: number; SiteName: string }) =>
            String(site.SiteId) === CREDENTIALS!.siteId &&
            site.SiteName === CREDENTIALS!.siteName
        )
      ).toBe(true);
      for (let i = 0; i < 2; i++)
        expect(await cli(['site', 'list'], project)).toContain(
          CREDENTIALS!.siteName
        );
    });
  });

  it('project list includes the newly created project', async () => {
    await withProject(async (project) => {
      expect(await cli(['project', 'list'], project)).toContain(project.name);
    });
  });

  it('deployments list includes the actual project domain', async () => {
    await withProject(async (project) => {
      const routine = await cloudApi('GetRoutine', { Name: project.name });
      expect(routine.DefaultRelatedRecord).toBeTruthy();
      expect(await cli(['deployments', 'list'], project)).toContain(
        routine.DefaultRelatedRecord
      );
    });
  });
});
