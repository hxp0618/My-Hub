import { createLogger } from './logger';

const logger = createLogger('[Extension Permissions]');

export class HostPermissionDeniedError extends Error {
  constructor(public readonly url: string) {
    super('hostPermissionDenied');
    this.name = 'HostPermissionDeniedError';
  }
}

const hasPermissionsApi = (): boolean => (
  typeof chrome !== 'undefined' &&
  typeof chrome.permissions?.contains === 'function' &&
  typeof chrome.permissions?.request === 'function'
);

const ensurePermissions = async (permissions: chrome.permissions.Permissions): Promise<boolean> => {
  if (!hasPermissionsApi()) return true;

  try {
    if (await chrome.permissions.contains(permissions)) return true;
    return await chrome.permissions.request(permissions);
  } catch (error) {
    logger.warn('Optional permission request failed', error);
    return false;
  }
};

export const ensureClipboardReadPermission = (): Promise<boolean> => (
  ensurePermissions({ permissions: ['clipboardRead'] })
);

export const getHostPermissionPattern = (value: string): string | null => {
  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return `${url.origin}/*`;
  } catch {
    return null;
  }
};

export const ensureHostPermission = async (value: string): Promise<boolean> => {
  const origin = getHostPermissionPattern(value);
  if (!origin) return false;
  return ensurePermissions({ origins: [origin] });
};

export const requireHostPermission = async (value: string): Promise<void> => {
  if (!(await ensureHostPermission(value))) {
    throw new HostPermissionDeniedError(value);
  }
};

export const hasHostPermission = async (value: string): Promise<boolean> => {
  const origin = getHostPermissionPattern(value);
  if (!origin) return false;
  if (!hasPermissionsApi()) return true;
  try {
    return await chrome.permissions.contains({ origins: [origin] });
  } catch {
    return false;
  }
};
