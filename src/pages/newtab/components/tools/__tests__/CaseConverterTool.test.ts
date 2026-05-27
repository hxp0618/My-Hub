import { describe, expect, it } from 'vitest';
import { convertCase, splitIntoWords } from '../CaseConverterTool';

describe('CaseConverterTool conversion helpers', () => {
  it('splits acronyms before PascalCase words', () => {
    expect(splitIntoWords('XMLHttpRequest')).toEqual(['XML', 'Http', 'Request']);
    expect(convertCase('XMLHttpRequest', 'snakeCase')).toBe('xml_http_request');
  });

  it('splits letter and number boundaries without losing acronyms', () => {
    expect(splitIntoWords('APIResponse2xx')).toEqual(['API', 'Response', '2', 'xx']);
    expect(convertCase('APIResponse2xx', 'kebabCase')).toBe('api-response-2-xx');
  });

  it('keeps existing separators compatible with all common output cases', () => {
    const input = 'user.profile/id_value';

    expect(convertCase(input, 'camelCase')).toBe('userProfileIdValue');
    expect(convertCase(input, 'pascalCase')).toBe('UserProfileIdValue');
    expect(convertCase(input, 'constantCase')).toBe('USER_PROFILE_ID_VALUE');
    expect(convertCase(input, 'pathCase')).toBe('user/profile/id/value');
    expect(convertCase(input, 'titleCase')).toBe('User Profile Id Value');
  });
});
