import { describe, expect, it } from 'vitest';
import { decodeHtmlEntities, encodeHtmlEntities } from '../HTMLEntityTool';

describe('HTMLEntityTool codec', () => {
  it('encodes only special HTML characters in special mode', () => {
    expect(encodeHtmlEntities('<span title="x&y">Hi</span>', 'special'))
      .toBe('&lt;span title=&quot;x&amp;y&quot;&gt;Hi&lt;/span&gt;');
  });

  it('encodes non-ASCII characters by Unicode code point in all mode', () => {
    const encoded = encodeHtmlEntities('你好 😀 ✓', 'all');

    expect(encoded).toBe('&#20320;&#22909; &#128512; &#10003;');
    expect(encoded).not.toContain('&#55357;');
    expect(encoded).not.toContain('&#56832;');
  });

  it('decodes named, decimal, and hexadecimal entities', () => {
    expect(decodeHtmlEntities('&lt;b&gt;&#20320;&#x597D; &#128512;&lt;/b&gt;'))
      .toBe('<b>你好 😀</b>');
  });
});
