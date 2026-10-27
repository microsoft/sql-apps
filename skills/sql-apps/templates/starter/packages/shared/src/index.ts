export interface Item {
  Id: string;
  Label: string;
  CreatedAt: string;
}

export interface PublicConfig {
  authority: string;
  clientId: string;
  scope: string;
  redirectUri: string;
}

export function isItem(value: unknown): value is Item {
  return typeof value === 'object' && value !== null &&
    'Id' in value && typeof value.Id === 'string' &&
    'Label' in value && typeof value.Label === 'string' &&
    'CreatedAt' in value && typeof value.CreatedAt === 'string';
}

export function isPublicConfig(value: unknown): value is PublicConfig {
  return typeof value === 'object' && value !== null &&
    'authority' in value && typeof value.authority === 'string' &&
    'clientId' in value && typeof value.clientId === 'string' &&
    'scope' in value && typeof value.scope === 'string' &&
    'redirectUri' in value && typeof value.redirectUri === 'string';
}
