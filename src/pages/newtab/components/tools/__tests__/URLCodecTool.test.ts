import { describe, expect, it } from 'vitest';
import { buildUrlWithQueryParams, parseUrlDetails } from '../URLCodecTool';

describe('URLCodecTool URL helpers', () => {
  it('parses URL parts and duplicate query params', () => {
    expect(parseUrlDetails('https://example.com/docs?q=my%20hub&q=tools&empty=#intro')).toEqual({
      success: true,
      protocol: 'https:',
      host: 'example.com',
      pathname: '/docs',
      hash: '#intro',
      queryParams: [
        { key: 'q', value: 'my hub', index: 0 },
        { key: 'q', value: 'tools', index: 1 },
        { key: 'empty', value: '', index: 2 },
      ],
      normalizedUrl: 'https://example.com/docs?q=my+hub&q=tools&empty=#intro',
    });
  });

  it('rebuilds a URL from edited query params while preserving the hash', () => {
    const url = buildUrlWithQueryParams('https://example.com/docs?q=old#intro', [
      { key: 'q', value: 'new value', index: 0 },
      { key: 'page', value: '1', index: 1 },
    ]);

    expect(url).toBe('https://example.com/docs?q=new+value&page=1#intro');
  });

  it('returns a stable error for invalid full URLs', () => {
    expect(parseUrlDetails('not a url')).toEqual({
      success: false,
      error: 'invalidUrl',
    });
  });
});
