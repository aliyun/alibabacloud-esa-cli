import type { AuthConfig } from './fileUtils/interface.js';

export type CredentialSource =
  'environment-esa' | 'environment-alibaba-cloud' | 'saved-config';

export interface ResolvedCredentials {
  source: CredentialSource;
  auth: AuthConfig;
}

export type CredentialResolution =
  | ({ status: 'resolved' } & ResolvedCredentials)
  | {
      status: 'incomplete';
      source: CredentialSource;
    }
  | {
      status: 'none';
    };

interface CredentialCandidate {
  accessKeyId?: string;
  accessKeySecret?: string;
  securityToken?: string;
}

function hasAnyCredentialValue(candidate: CredentialCandidate): boolean {
  return Boolean(
    candidate.accessKeyId ||
    candidate.accessKeySecret ||
    candidate.securityToken
  );
}

function resolveCandidate(
  source: CredentialSource,
  candidate: CredentialCandidate
): CredentialResolution | null {
  if (!hasAnyCredentialValue(candidate)) return null;

  if (!candidate.accessKeyId || !candidate.accessKeySecret) {
    return { status: 'incomplete', source };
  }

  return {
    status: 'resolved',
    source,
    auth: {
      accessKeyId: candidate.accessKeyId,
      accessKeySecret: candidate.accessKeySecret,
      ...(candidate.securityToken
        ? { securityToken: candidate.securityToken }
        : {})
    }
  };
}

/**
 * Resolve credentials as complete, atomic groups. A partially configured
 * higher-priority source blocks fallback so credentials are never assembled
 * from different prefixes.
 */
export function resolveCredentials(
  savedConfig?: AuthConfig | null,
  environment: NodeJS.ProcessEnv = process.env
): CredentialResolution {
  const candidates: Array<{
    source: CredentialSource;
    credentials: CredentialCandidate;
  }> = [
    {
      source: 'environment-esa',
      credentials: {
        accessKeyId: environment.ESA_ACCESS_KEY_ID,
        accessKeySecret: environment.ESA_ACCESS_KEY_SECRET,
        securityToken: environment.ESA_SECURITY_TOKEN
      }
    },
    {
      source: 'environment-alibaba-cloud',
      credentials: {
        accessKeyId: environment.ALIBABA_CLOUD_ACCESS_KEY_ID,
        accessKeySecret: environment.ALIBABA_CLOUD_ACCESS_KEY_SECRET,
        securityToken: environment.ALIBABA_CLOUD_SECURITY_TOKEN
      }
    },
    {
      source: 'saved-config',
      credentials: savedConfig ?? {}
    }
  ];

  for (const candidate of candidates) {
    const resolution = resolveCandidate(
      candidate.source,
      candidate.credentials
    );
    if (resolution) return resolution;
  }

  return { status: 'none' };
}

export function resolveEnvironmentCredentials(
  environment: NodeJS.ProcessEnv = process.env
): CredentialResolution {
  return resolveCredentials(undefined, environment);
}
