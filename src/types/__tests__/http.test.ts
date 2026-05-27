import { describe, expect, it } from 'vitest';
import {
  isHttpMethodValue,
  isSensitiveHttpHeaderName,
  redactSensitiveHeaderEntriesForHistory,
  sanitizeHeaderEntries,
  sanitizeHttpHistoryEntries,
  sanitizeHttpHistoryEntry,
} from '../http';

describe('http type sanitizers', () => {
  it('recognizes supported HTTP methods only', () => {
    expect(isHttpMethodValue('GET')).toBe(true);
    expect(isHttpMethodValue('OPTIONS')).toBe(false);
    expect(isHttpMethodValue(123)).toBe(false);
  });

  it('filters malformed header entries', () => {
    expect(sanitizeHeaderEntries([
      { key: 'Accept', value: 'application/json', enabled: true },
      { key: '', value: '', enabled: false },
      { key: 'Bad', value: 42, enabled: true },
      null,
    ])).toEqual([
      { key: 'Accept', value: 'application/json', enabled: true },
      { key: '', value: '', enabled: false },
    ]);
  });

  it('redacts sensitive headers before storing HTTP history', () => {
    expect(isSensitiveHttpHeaderName(' Authorization ')).toBe(true);
    expect(isSensitiveHttpHeaderName('X-API-Key')).toBe(true);
    expect(isSensitiveHttpHeaderName('Accept')).toBe(false);

    expect(redactSensitiveHeaderEntriesForHistory([
      { key: 'Authorization', value: 'Bearer secret-token', enabled: true },
      { key: 'Cookie', value: 'sid=secret', enabled: true },
      { key: 'Accept', value: 'application/json', enabled: true },
    ])).toEqual([
      { key: 'Authorization', value: '', enabled: false },
      { key: 'Cookie', value: '', enabled: false },
      { key: 'Accept', value: 'application/json', enabled: true },
    ]);
  });

  it('sanitizes a single HTTP history entry', () => {
    expect(sanitizeHttpHistoryEntry({
      id: 'req-1',
      timestamp: 100,
      request: {
        url: 'https://example.com',
        method: 'POST',
        headers: [
          { key: 'Content-Type', value: 'application/json', enabled: true },
          { key: 'Authorization', value: 'Bearer secret-token', enabled: true },
        ],
        body: '{"ok":true}',
      },
      response: {
        status: 200,
        statusText: 'OK',
        time: 50,
        headers: { ignored: 'field' },
      },
    })).toEqual({
      id: 'req-1',
      timestamp: 100,
      request: {
        url: 'https://example.com',
        method: 'POST',
        headers: [
          { key: 'Content-Type', value: 'application/json', enabled: true },
          { key: 'Authorization', value: '', enabled: false },
        ],
        body: '{"ok":true}',
      },
      response: {
        status: 200,
        statusText: 'OK',
        time: 50,
      },
    });
  });

  it('sorts, deduplicates, limits, and drops malformed HTTP history entries', () => {
    expect(sanitizeHttpHistoryEntries([
      {
        id: 'old',
        timestamp: 1,
        request: { url: 'https://old.example', method: 'GET', headers: [], body: '' },
      },
      {
        id: 'new',
        timestamp: 3,
        request: { url: 'https://new.example', method: 'PATCH', headers: [], body: '{}' },
      },
      {
        id: 'new',
        timestamp: 4,
        request: { url: 'https://duplicate.example', method: 'GET', headers: [], body: '' },
      },
      {
        id: 'bad-method',
        timestamp: 5,
        request: { url: 'https://bad.example', method: 'OPTIONS', headers: [], body: '' },
      },
      null,
    ], 2)).toEqual([
      {
        id: 'new',
        timestamp: 3,
        request: { url: 'https://new.example', method: 'PATCH', headers: [], body: '{}' },
      },
      {
        id: 'old',
        timestamp: 1,
        request: { url: 'https://old.example', method: 'GET', headers: [], body: '' },
      },
    ]);
  });
});
