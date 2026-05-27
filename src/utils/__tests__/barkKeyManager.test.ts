import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '../../i18n';
import { generateDefaultLabel, loadKeys, migrateOldConfig, saveKeys } from '../barkKeyManager';
import { BarkKeyManager } from '../../services/BarkKeyManager';
import { BarkKeyConfig } from '../../types/bark';

const existingKey = (id: string): BarkKeyConfig => ({
  id,
  deviceKey: `key-${id}`,
  server: 'https://api.day.app',
  label: `Label ${id}`,
  createdAt: 1,
  updatedAt: 1,
});

describe('barkKeyManager labels', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'debug').mockImplementation(() => {});
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    localStorage.clear();
    await i18n.changeLanguage('zh-CN');
  });

  it('generates the default key label with the active locale', async () => {
    await i18n.changeLanguage('en');

    expect(generateDefaultLabel([existingKey('1'), existingKey('2')])).toBe('Device 3');

    await i18n.changeLanguage('zh-CN');

    expect(generateDefaultLabel([])).toBe('设备 1');
  });

  it('uses localized labels when migrating old Bark configuration', async () => {
    await i18n.changeLanguage('en');
    localStorage.setItem('bark_config', JSON.stringify({
      server: 'https://api.day.app',
      deviceKey: 'legacy-key',
    }));

    migrateOldConfig();

    const migratedKeys = JSON.parse(localStorage.getItem('bark_keys') ?? '[]') as BarkKeyConfig[];
    expect(migratedKeys).toHaveLength(1);
    expect(migratedKeys[0].label).toBe('Default Device');
  });

  it('throws a stable error code when saving keys fails', () => {
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new Error('storage unavailable');
    });
    vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => saveKeys([])).toThrow('saveFailed');
  });

  it('filters invalid stored key records and persists the sanitized list', () => {
    localStorage.setItem('bark_keys', JSON.stringify([
      existingKey('valid'),
      { id: 'missing-device-key', server: 'https://api.day.app', label: 'bad', createdAt: 1, updatedAt: 1 },
      null,
    ]));

    const keys = loadKeys();

    expect(keys).toEqual([existingKey('valid')]);
    expect(JSON.parse(localStorage.getItem('bark_keys') ?? '[]')).toEqual([existingKey('valid')]);
  });

  it('does not migrate malformed legacy Bark configuration', () => {
    localStorage.setItem('bark_config', JSON.stringify({ server: 'https://api.day.app' }));

    migrateOldConfig();

    expect(localStorage.getItem('bark_keys')).toBeNull();
    expect(localStorage.getItem('bark_selected_key_id')).toBeNull();
  });

  it('recovers a stale selected key id after invalid keys are filtered', () => {
    localStorage.setItem('bark_keys', JSON.stringify([
      existingKey('valid'),
      { id: 'invalid', deviceKey: '', server: 'https://api.day.app', label: 'bad', createdAt: 1, updatedAt: 1 },
    ]));
    localStorage.setItem('bark_selected_key_id', 'invalid');

    const manager = new BarkKeyManager();

    expect(manager.getSelectedKey()).toEqual(existingKey('valid'));
    expect(localStorage.getItem('bark_selected_key_id')).toBe('valid');
  });
});
