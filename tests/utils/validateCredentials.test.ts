import { describe, expect, it, vi } from 'vitest';

import { checkComputePlan } from '../../src/utils/validateCredentials.js';

describe('compute plan access', () => {
  it('accepts a purchased subscription without a plan name or legacy ER lookup', async () => {
    const callApi = vi.fn().mockResolvedValue({
      statusCode: 200,
      body: { Purchased: true }
    });

    await expect(checkComputePlan({ callApi })).resolves.toEqual({
      valid: true
    });
    expect(callApi.mock.calls.map(([params]) => params.action)).toEqual([
      'GetSubscriptionPlan'
    ]);
  });

  it.each([
    ['Running', { valid: true }],
    [
      'Creating',
      { valid: false, message: expect.stringContaining('being activated') }
    ],
    [
      'NotOpened',
      { valid: false, message: expect.stringContaining('not active') }
    ],
    [
      'Discarded',
      { valid: false, message: expect.stringContaining('not active') }
    ],
    [
      'unexpected',
      {
        valid: false,
        message: expect.stringContaining('unknown service status')
      }
    ]
  ])(
    'checks legacy ER status %s when no subscription was purchased',
    async (Status, expected) => {
      const callApi = vi
        .fn()
        .mockResolvedValueOnce({ statusCode: 200, body: { Purchased: false } })
        .mockResolvedValueOnce({ statusCode: 200, body: { Status } });

      await expect(checkComputePlan({ callApi })).resolves.toEqual(expected);
      expect(callApi.mock.calls.map(([params]) => params.action)).toEqual([
        'GetSubscriptionPlan',
        'GetErService'
      ]);
    }
  );

  it.each([{}, { Purchased: 'false' }, { Purchased: 'true' }])(
    'rejects a malformed subscription response without querying ER',
    async (body) => {
      const callApi = vi.fn().mockResolvedValue({ statusCode: 200, body });
      await expect(checkComputePlan({ callApi })).resolves.toEqual({
        valid: false,
        message: expect.stringContaining('invalid Purchased')
      });
      expect(callApi).toHaveBeenCalledTimes(1);
    }
  );

  it('reports a denied subscription query without treating the account as inactive', async () => {
    const callApi = vi.fn().mockRejectedValue(new Error('Forbidden.RAM'));
    await expect(checkComputePlan({ callApi })).resolves.toEqual({
      valid: false,
      message: 'GetSubscriptionPlan failed: Forbidden.RAM'
    });
    expect(callApi).toHaveBeenCalledTimes(1);
  });

  it('reports a failure in the legacy lookup', async () => {
    const callApi = vi
      .fn()
      .mockResolvedValueOnce({ statusCode: 200, body: { Purchased: false } })
      .mockResolvedValueOnce({ statusCode: 503 });
    await expect(checkComputePlan({ callApi })).resolves.toEqual({
      valid: false,
      message: 'GetErService failed: HTTP 503'
    });
  });
});
