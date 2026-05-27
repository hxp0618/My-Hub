import { describe, expect, it } from 'vitest';
import { parseGeneratedTags, sanitizeTagList } from '../bookmarkTags';

describe('bookmark tag parsing', () => {
  it('parses generated comma-separated tags with code fences', () => {
    expect(parseGeneratedTags('```text\nai, chrome, ai, , devtools\n```')).toEqual([
      'ai',
      'chrome',
      'devtools',
    ]);
  });

  it('keeps only unique non-empty string tags', () => {
    expect(sanitizeTagList([' docs ', 'docs', '', 42, 'tools'])).toEqual(['docs', 'tools']);
    expect(sanitizeTagList('docs,tools')).toEqual([]);
  });
});
