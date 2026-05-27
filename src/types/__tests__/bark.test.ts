import { describe, expect, it } from 'vitest';
import {
  sanitizeBarkHistoryRecords,
  sanitizeBarkKeys,
} from '../bark';

describe('bark type sanitizers', () => {
  it('keeps only structurally valid Bark keys', () => {
    expect(sanitizeBarkKeys([
      {
        id: 'bark_key_1',
        deviceKey: 'device-key',
        server: 'https://api.day.app',
        label: 'Phone',
        createdAt: 1,
        updatedAt: 2,
      },
      {
        id: 'bark_key_redacted',
        deviceKey: '',
        server: 'https://api.day.app',
        label: 'Redacted',
        createdAt: 1,
        updatedAt: 2,
      },
      { id: 'bad' },
    ])).toEqual([
      {
        id: 'bark_key_1',
        deviceKey: 'device-key',
        server: 'https://api.day.app',
        label: 'Phone',
        createdAt: 1,
        updatedAt: 2,
      },
    ]);
  });

  it('can keep redacted Bark keys for safe backup merge', () => {
    expect(sanitizeBarkKeys([
      {
        id: 'bark_key_redacted',
        deviceKey: '',
        server: 'https://api.day.app',
        label: 'Redacted',
        createdAt: 1,
        updatedAt: 2,
      },
    ], { allowEmptyDeviceKey: true })).toHaveLength(1);
  });

  it('filters damaged Bark notification history records', () => {
    expect(sanitizeBarkHistoryRecords([
      {
        id: 'history-1',
        title: 'Hello',
        body: 'World',
        timestamp: 100,
        status: 'success',
        options: {
          sound: 'bell',
          icon: 42,
        },
      },
      {
        id: 'history-2',
        title: 'Bad',
        body: 'Status',
        timestamp: 101,
        status: 'pending',
      },
      null,
    ])).toEqual([
      {
        id: 'history-1',
        title: 'Hello',
        body: 'World',
        timestamp: 100,
        status: 'success',
        options: {
          sound: 'bell',
        },
      },
    ]);
  });
});
