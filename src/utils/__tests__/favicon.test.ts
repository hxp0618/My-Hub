import { describe, expect, it } from 'vitest';
import { getFaviconUrl, getUrlHostname } from '../favicon';

describe('favicon utils', () => {
  it('extracts hostname from standard web URLs', () => {
    expect(getUrlHostname('https://example.com/docs?q=1')).toBe('example.com');
  });

  it('builds a Google favicon URL for web URLs', () => {
    expect(getFaviconUrl('https://example.com/docs')).toBe(
      'https://www.google.com/s2/favicons?domain=example.com&sz=32',
    );
  });

  it('returns a local fallback for invalid or internal URLs', () => {
    expect(getUrlHostname('not a url')).toBe('');
    expect(getFaviconUrl('not a url')).toContain('data:image/svg+xml');
    expect(getFaviconUrl('about:blank')).toContain('data:image/svg+xml');
  });
});

