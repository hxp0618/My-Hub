/**
 * 随机生成器属性测试
 * 使用 fast-check 进行属性测试
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  generateUUID,
  generateNanoID,
  generateULID,
  parseULIDTimestamp,
  generateObjectId,
  parseObjectIdTimestamp,
  generateSnowflakeId,
  parseSnowflakeTimestamp,
  generateRandomString,
  generateRandomNumber,
  calculateMD5,
  generateBatch,
} from '../randomGenerators';

// UUID 格式正则
const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const UUID_V1_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-1[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const UUID_NO_HYPHEN_REGEX = /^[0-9a-f]{32}$/i;

// NanoID 字符集
const NANOID_CHARSET = /^[A-Za-z0-9_-]+$/;

// ULID Crockford Base32 字符集
const ULID_CHARSET = /^[0-9ABCDEFGHJKMNPQRSTVWXYZ]+$/;

// ObjectId 十六进制字符集
const OBJECTID_CHARSET = /^[0-9a-f]+$/i;

describe('UUID Generator Properties', () => {
  /**
   * **Feature: random-generator-tool, Property 1: UUID 格式有效性**
   * **Validates: Requirements 1.1, 1.2**
   */
  it('Property 1: UUID v4 should match RFC 4122 format', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const uuid = generateUUID({ version: 'v4', withHyphens: true });
        expect(uuid).toMatch(UUID_V4_REGEX);
        expect(uuid.length).toBe(36);
      }),
      { numRuns: 100 }
    );
  });

  it('Property 1: UUID v1 should match RFC 4122 format', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const uuid = generateUUID({ version: 'v1', withHyphens: true });
        expect(uuid).toMatch(UUID_V1_REGEX);
        expect(uuid.length).toBe(36);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: random-generator-tool, Property 2: UUID 无连字符格式**
   * **Validates: Requirements 1.3**
   */
  it('Property 2: UUID without hyphens should be 32 characters', () => {
    fc.assert(
      fc.property(fc.constantFrom('v1', 'v4') as fc.Arbitrary<'v1' | 'v4'>, version => {
        const uuid = generateUUID({ version, withHyphens: false });
        expect(uuid).toMatch(UUID_NO_HYPHEN_REGEX);
        expect(uuid.length).toBe(32);
        expect(uuid).not.toContain('-');
      }),
      { numRuns: 100 }
    );
  });
});

describe('NanoID Generator Properties', () => {
  /**
   * **Feature: random-generator-tool, Property 10: NanoID 格式有效性**
   * **Validates: Requirements 5.1.1, 5.1.4**
   */
  it('Property 10: NanoID should only contain URL-safe characters', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 64 }), length => {
        const nanoid = generateNanoID({ length });
        expect(nanoid).toMatch(NANOID_CHARSET);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: random-generator-tool, Property 11: NanoID 长度约束**
   * **Validates: Requirements 5.1.2**
   */
  it('Property 11: NanoID should have specified length', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 64 }), length => {
        const nanoid = generateNanoID({ length });
        expect(nanoid.length).toBe(length);
      }),
      { numRuns: 100 }
    );
  });

  it('Property 11: NanoID default length should be 21', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const nanoid = generateNanoID({});
        expect(nanoid.length).toBe(21);
      }),
      { numRuns: 100 }
    );
  });
});

describe('ULID Generator Properties', () => {
  /**
   * **Feature: random-generator-tool, Property 12: ULID 格式有效性**
   * **Validates: Requirements 5.2.1**
   */
  it('Property 12: ULID should be 26 characters with Crockford Base32', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const ulid = generateULID();
        expect(ulid.length).toBe(26);
        expect(ulid).toMatch(ULID_CHARSET);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: random-generator-tool, Property 13: ULID 递增性**
   * **Validates: Requirements 5.2.3**
   */
  it('Property 13: ULIDs generated in sequence should be lexicographically increasing', () => {
    fc.assert(
      fc.property(fc.integer({ min: 2, max: 10 }), count => {
        const ulids: string[] = [];
        for (let i = 0; i < count; i++) {
          ulids.push(generateULID());
        }
        for (let i = 1; i < ulids.length; i++) {
          expect(ulids[i] >= ulids[i - 1]).toBe(true);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('ULID timestamp should be parseable', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const before = Date.now();
        const ulid = generateULID();
        const after = Date.now();
        const timestamp = parseULIDTimestamp(ulid);
        expect(timestamp.getTime()).toBeGreaterThanOrEqual(before);
        expect(timestamp.getTime()).toBeLessThanOrEqual(after);
      }),
      { numRuns: 100 }
    );
  });
});


describe('ObjectId Generator Properties', () => {
  /**
   * **Feature: random-generator-tool, Property 14: ObjectId 格式有效性**
   * **Validates: Requirements 5.3.1**
   */
  it('Property 14: ObjectId should be 24 hex characters', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const objectId = generateObjectId();
        expect(objectId.length).toBe(24);
        expect(objectId).toMatch(OBJECTID_CHARSET);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: random-generator-tool, Property 15: ObjectId 时间戳可提取性**
   * **Validates: Requirements 5.3.4**
   */
  it('Property 15: ObjectId timestamp should be within reasonable range', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const before = Math.floor(Date.now() / 1000) * 1000;
        const objectId = generateObjectId();
        const after = Math.floor(Date.now() / 1000) * 1000 + 1000;
        const timestamp = parseObjectIdTimestamp(objectId);
        expect(timestamp.getTime()).toBeGreaterThanOrEqual(before);
        expect(timestamp.getTime()).toBeLessThanOrEqual(after);
      }),
      { numRuns: 100 }
    );
  });
});

describe('Snowflake ID Generator Properties', () => {
  /**
   * **Feature: random-generator-tool, Property 9: 雪花 ID 递增性**
   * **Validates: Requirements 5.1, 5.3**
   */
  it('Property 9: Snowflake IDs should be strictly increasing', () => {
    fc.assert(
      fc.property(fc.integer({ min: 2, max: 20 }), count => {
        const ids: bigint[] = [];
        for (let i = 0; i < count; i++) {
          ids.push(BigInt(generateSnowflakeId()));
        }
        for (let i = 1; i < ids.length; i++) {
          expect(ids[i] > ids[i - 1]).toBe(true);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('Snowflake ID timestamp should be parseable', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const before = Date.now();
        const id = generateSnowflakeId();
        const after = Date.now();
        const timestamp = parseSnowflakeTimestamp(id);
        // 允许一些时间误差
        expect(timestamp.getTime()).toBeGreaterThanOrEqual(before - 1000);
        expect(timestamp.getTime()).toBeLessThanOrEqual(after + 1000);
      }),
      { numRuns: 100 }
    );
  });
});

describe('Random String Generator Properties', () => {
  const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz';
  const NUMBERS = '0123456789';
  const SYMBOLS = '!@#$%^&*()_+-=[]{}|;:,.<>?';

  /**
   * **Feature: random-generator-tool, Property 4: 随机字符串字符集约束**
   * **Validates: Requirements 2.1, 2.2, 2.3, 2.4**
   */
  it('Property 4: String with uppercase only should contain only uppercase', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 100 }), length => {
        const str = generateRandomString({
          length,
          uppercase: true,
          lowercase: false,
          numbers: false,
          symbols: false,
        });
        for (const char of str) {
          expect(UPPERCASE).toContain(char);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('Property 4: String with lowercase only should contain only lowercase', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 100 }), length => {
        const str = generateRandomString({
          length,
          uppercase: false,
          lowercase: true,
          numbers: false,
          symbols: false,
        });
        for (const char of str) {
          expect(LOWERCASE).toContain(char);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('Property 4: String with numbers only should contain only numbers', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 100 }), length => {
        const str = generateRandomString({
          length,
          uppercase: false,
          lowercase: false,
          numbers: true,
          symbols: false,
        });
        for (const char of str) {
          expect(NUMBERS).toContain(char);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('Property 4: String with symbols only should contain only symbols', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 100 }), length => {
        const str = generateRandomString({
          length,
          uppercase: false,
          lowercase: false,
          numbers: false,
          symbols: true,
        });
        for (const char of str) {
          expect(SYMBOLS).toContain(char);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('Property 4: String with mixed charset should only contain selected chars', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        fc.boolean(),
        fc.boolean(),
        fc.boolean(),
        fc.boolean(),
        (length, upper, lower, nums, syms) => {
          // 至少选择一个字符集
          if (!upper && !lower && !nums && !syms) {
            upper = true;
          }
          const str = generateRandomString({
            length,
            uppercase: upper,
            lowercase: lower,
            numbers: nums,
            symbols: syms,
          });
          let allowedChars = '';
          if (upper) allowedChars += UPPERCASE;
          if (lower) allowedChars += LOWERCASE;
          if (nums) allowedChars += NUMBERS;
          if (syms) allowedChars += SYMBOLS;
          for (const char of str) {
            expect(allowedChars).toContain(char);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: random-generator-tool, Property 5: 随机字符串长度约束**
   * **Validates: Requirements 2.5**
   */
  it('Property 5: String should have specified length', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 256 }), length => {
        const str = generateRandomString({
          length,
          uppercase: true,
          lowercase: true,
          numbers: true,
          symbols: false,
        });
        expect(str.length).toBe(length);
      }),
      { numRuns: 100 }
    );
  });
});

describe('Random Number Generator Properties', () => {
  /**
   * **Feature: random-generator-tool, Property 6: 随机数字范围约束**
   * **Validates: Requirements 3.1**
   */
  it('Property 6: Number should be within specified range', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -1000000, max: 1000000 }),
        fc.integer({ min: 0, max: 1000 }),
        (min, range) => {
          const max = min + range;
          const num = generateRandomNumber({ min, max });
          expect(num).toBeGreaterThanOrEqual(min);
          expect(num).toBeLessThanOrEqual(max);
          expect(Number.isInteger(num)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 6: Number with same min and max should return that value', () => {
    fc.assert(
      fc.property(fc.integer({ min: -1000, max: 1000 }), value => {
        const num = generateRandomNumber({ min: value, max: value });
        expect(num).toBe(value);
      }),
      { numRuns: 100 }
    );
  });
});

describe('MD5 Hash Properties', () => {
  /**
   * **Feature: random-generator-tool, Property 7: MD5 哈希确定性**
   * **Validates: Requirements 4.1**
   */
  it('Property 7: MD5 should be deterministic', () => {
    fc.assert(
      fc.property(fc.string(), text => {
        const hash1 = calculateMD5(text, { uppercase: false });
        const hash2 = calculateMD5(text, { uppercase: false });
        expect(hash1).toBe(hash2);
        expect(hash1.length).toBe(32);
        expect(hash1).toMatch(/^[0-9a-f]{32}$/);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: random-generator-tool, Property 8: MD5 大小写输出**
   * **Validates: Requirements 4.2, 4.3**
   */
  it('Property 8: MD5 uppercase option should return uppercase', () => {
    fc.assert(
      fc.property(fc.string(), text => {
        const hash = calculateMD5(text, { uppercase: true });
        expect(hash).toMatch(/^[0-9A-F]{32}$/);
        expect(hash).toBe(hash.toUpperCase());
      }),
      { numRuns: 100 }
    );
  });

  it('Property 8: MD5 lowercase option should return lowercase', () => {
    fc.assert(
      fc.property(fc.string(), text => {
        const hash = calculateMD5(text, { uppercase: false });
        expect(hash).toMatch(/^[0-9a-f]{32}$/);
        expect(hash).toBe(hash.toLowerCase());
      }),
      { numRuns: 100 }
    );
  });

  it('MD5 of empty string should be d41d8cd98f00b204e9800998ecf8427e', () => {
    const hash = calculateMD5('', { uppercase: false });
    expect(hash).toBe('d41d8cd98f00b204e9800998ecf8427e');
  });
});

describe('Batch Generator Properties', () => {
  /**
   * **Feature: random-generator-tool, Property 3: 批量生成数量一致性**
   * **Validates: Requirements 1.4, 3.3, 5.2, 5.1.3, 5.2.2, 5.3.2**
   */
  it('Property 3: Batch should return specified count', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 100 }), count => {
        const results = generateBatch(() => generateUUID({ version: 'v4', withHyphens: true }), count);
        expect(results.length).toBe(count);
      }),
      { numRuns: 100 }
    );
  });

  it('Property 3: Batch count should be clamped to 1-100', () => {
    expect(generateBatch(() => 'test', 0).length).toBe(1);
    expect(generateBatch(() => 'test', -5).length).toBe(1);
    expect(generateBatch(() => 'test', 150).length).toBe(100);
  });
});
