/**
 * 单位转换工具属性测试
 * Feature: unit-converter-tool
 * 
 * 使用 fast-check 进行属性测试，验证单位转换的正确性
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  validateInput,
  formatValue,
  convert,
  saveCategoryPreference,
  loadCategoryPreference,
  CATEGORY_CONFIGS,
  DATA_UNIT_BASE,
  UnitCategory,
  Unit,
  formatTimeReadable,
  ReadableTimeFormatter,
  getCategoryConfig,
  getUnitConfig,
} from '../unitConverter';

// ============================================================================
// Property 1: 单位转换往返一致性
// Validates: Requirements 1.1, 2.1, 3.1, 4.1
// ============================================================================
describe('Property 1: 单位转换往返一致性', () => {
  /**
   * 对于任意有效数值 v、任意源单位 u1 和任意目标单位 u2（同一类别），
   * 将 v 从 u1 转换到 u2，再从 u2 转换回 u1，结果应与原始值 v 在合理精度范围内相等。
   */
  
  // 为每个类别生成单位对的 arbitrary
  const categoryArbitrary = fc.constantFrom<UnitCategory>('time', 'length', 'data', 'weight');
  
  const unitPairArbitrary = categoryArbitrary.chain(category => {
    const config = CATEGORY_CONFIGS.find(c => c.key === category)!;
    const units = config.units.map(u => u.key);
    return fc.record({
      category: fc.constant(category),
      unit1: fc.constantFrom(...units),
      unit2: fc.constantFrom(...units),
    });
  });

  it('时间单位往返转换应保持一致', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.001, max: 1e12, noNaN: true }),
        unitPairArbitrary.filter(p => p.category === 'time'),
        (value, { category, unit1, unit2 }) => {
          const converted = convert(value, unit1 as Unit, unit2 as Unit, category);
          const roundTrip = convert(converted, unit2 as Unit, unit1 as Unit, category);
          
          // 允许相对误差 1e-9
          const relativeError = Math.abs(roundTrip - value) / Math.max(Math.abs(value), 1e-10);
          expect(relativeError).toBeLessThan(1e-9);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('长度单位往返转换应保持一致', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.001, max: 1e12, noNaN: true }),
        unitPairArbitrary.filter(p => p.category === 'length'),
        (value, { category, unit1, unit2 }) => {
          const converted = convert(value, unit1 as Unit, unit2 as Unit, category);
          const roundTrip = convert(converted, unit2 as Unit, unit1 as Unit, category);
          
          const relativeError = Math.abs(roundTrip - value) / Math.max(Math.abs(value), 1e-10);
          expect(relativeError).toBeLessThan(1e-9);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('数据存储单位往返转换应保持一致', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.001, max: 1e12, noNaN: true }),
        unitPairArbitrary.filter(p => p.category === 'data'),
        (value, { category, unit1, unit2 }) => {
          const converted = convert(value, unit1 as Unit, unit2 as Unit, category);
          const roundTrip = convert(converted, unit2 as Unit, unit1 as Unit, category);
          
          const relativeError = Math.abs(roundTrip - value) / Math.max(Math.abs(value), 1e-10);
          expect(relativeError).toBeLessThan(1e-9);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('重量单位往返转换应保持一致', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.001, max: 1e12, noNaN: true }),
        unitPairArbitrary.filter(p => p.category === 'weight'),
        (value, { category, unit1, unit2 }) => {
          const converted = convert(value, unit1 as Unit, unit2 as Unit, category);
          const roundTrip = convert(converted, unit2 as Unit, unit1 as Unit, category);
          
          const relativeError = Math.abs(roundTrip - value) / Math.max(Math.abs(value), 1e-10);
          expect(relativeError).toBeLessThan(1e-9);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ============================================================================
// Property 2: 数据单位 1024 基数
// Validates: Requirements 3.3
// ============================================================================
describe('Property 2: 数据单位 1024 基数', () => {
  /**
   * 对于任意数据存储单位转换，相邻单位之间的换算比例应为 1024。
   */
  
  it('相邻数据单位之间的换算比例应为 1024', () => {
    const adjacentPairs: [Unit, Unit][] = [
      ['B', 'KB'],
      ['KB', 'MB'],
      ['MB', 'GB'],
      ['GB', 'TB'],
    ];

    fc.assert(
      fc.property(
        fc.double({ min: 1, max: 1e6, noNaN: true }),
        fc.constantFrom(...adjacentPairs),
        (value, [smallerUnit, largerUnit]) => {
          // 从较小单位转换到较大单位，应该除以 1024
          const converted = convert(value, smallerUnit, largerUnit, 'data');
          const expected = value / DATA_UNIT_BASE;
          
          const relativeError = Math.abs(converted - expected) / Math.max(Math.abs(expected), 1e-10);
          expect(relativeError).toBeLessThan(1e-9);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('1 KB 应等于 1024 B', () => {
    const result = convert(1, 'KB', 'B', 'data');
    expect(result).toBe(1024);
  });

  it('1 MB 应等于 1024 KB', () => {
    const result = convert(1, 'MB', 'KB', 'data');
    expect(result).toBe(1024);
  });

  it('1 GB 应等于 1024 MB', () => {
    const result = convert(1, 'GB', 'MB', 'data');
    expect(result).toBe(1024);
  });

  it('1 TB 应等于 1024 GB', () => {
    const result = convert(1, 'TB', 'GB', 'data');
    expect(result).toBe(1024);
  });
});

// ============================================================================
// Property 3: 输入验证拒绝非数字
// Validates: Requirements 1.4
// ============================================================================
describe('Property 3: 输入验证拒绝非数字', () => {
  /**
   * 对于任意包含非数字字符的输入字符串（除了小数点和负号），
   * 系统应返回 false。
   */

  it('整数字符串应通过验证', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -1000000, max: 1000000 }),
        (num) => {
          const str = num.toString();
          expect(validateInput(str)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('小数字符串应通过验证', () => {
    fc.assert(
      fc.property(
        fc.double({ min: -1e6, max: 1e6, noNaN: true, noDefaultInfinity: true }),
        (num) => {
          // 只测试正常范围内的数，避免科学计数法格式
          if (Math.abs(num) < 1e-6 && num !== 0) return true;
          if (Math.abs(num) > 1e9) return true;
          
          const str = num.toString();
          // 跳过科学计数法格式的字符串
          if (str.includes('e') || str.includes('E')) return true;
          
          expect(validateInput(str)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('包含字母的字符串应被拒绝', () => {
    const invalidStrings = [
      'abc', '123abc', 'abc123', '12a34', 
      'hello', 'NaN', 'Infinity', '-Infinity',
      '1.2.3', '1..2', '--1', '++1'
    ];
    
    for (const str of invalidStrings) {
      expect(validateInput(str)).toBe(false);
    }
  });

  it('包含特殊字符的字符串应被拒绝', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('!', '@', '#', '$', '%', '^', '&', '*', '(', ')', '+', '='),
        (char) => {
          expect(validateInput(`123${char}456`)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('空字符串应通过验证（表示无输入）', () => {
    expect(validateInput('')).toBe(true);
    expect(validateInput('   ')).toBe(true);
  });

  it('只有符号的字符串应被拒绝', () => {
    expect(validateInput('-')).toBe(false);
    expect(validateInput('.')).toBe(false);
    expect(validateInput('-.')).toBe(false);
  });
});

// ============================================================================
// Property 4: 数值精度限制
// Validates: Requirements 3.4
// ============================================================================
describe('Property 4: 数值精度限制', () => {
  /**
   * 对于任意转换结果，小数部分的位数不应超过 6 位。
   */

  it('格式化后的数值小数位数不应超过 6 位', () => {
    fc.assert(
      fc.property(
        fc.double({ min: -1e8, max: 1e8, noNaN: true }),
        (value) => {
          const formatted = formatValue(value);
          
          // 跳过科学计数法格式
          if (formatted.includes('e') || formatted.includes('E')) {
            return true;
          }
          
          // 检查小数位数
          const parts = formatted.split('.');
          if (parts.length === 2) {
            expect(parts[1].length).toBeLessThanOrEqual(6);
          }
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('格式化应移除末尾的零', () => {
    expect(formatValue(1.5)).toBe('1.5');
    expect(formatValue(1.500000)).toBe('1.5');
    expect(formatValue(1.123000)).toBe('1.123');
  });
});

// ============================================================================
// Property 5: 科学计数法阈值
// Validates: Requirements 6.4
// ============================================================================
describe('Property 5: 科学计数法阈值', () => {
  /**
   * 对于任意绝对值大于 10^9 或小于 10^-6 的转换结果，应使用科学计数法格式显示。
   */

  it('大于 10^9 的数应使用科学计数法', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 1e9, max: 1e15, noNaN: true }),
        (value) => {
          const formatted = formatValue(value);
          expect(formatted).toMatch(/e\+?\d+/i);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('小于 10^-6 的正数应使用科学计数法', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 1e-15, max: 1e-6, noNaN: true }),
        (value) => {
          // 排除 0 和非常接近 0 的值
          if (value === 0 || value >= 1e-6) return true;
          
          const formatted = formatValue(value);
          expect(formatted).toMatch(/e-?\d+/i);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('正常范围内的数不应使用科学计数法', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 1e-5, max: 1e8, noNaN: true }),
        (value) => {
          const formatted = formatValue(value);
          expect(formatted).not.toMatch(/e/i);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('零应格式化为 "0"', () => {
    expect(formatValue(0)).toBe('0');
  });
});

// ============================================================================
// Property 6: 类别偏好持久化往返
// Validates: Requirements 5.3
// ============================================================================
describe('Property 6: 类别偏好持久化往返', () => {
  /**
   * 对于任意用户选择的单位类别，保存到 localStorage 后再读取，应得到相同的类别值。
   */

  it('保存并加载类别偏好应返回相同的值', () => {
    fc.assert(
      fc.property(
        fc.constantFrom<UnitCategory>('time', 'length', 'data', 'weight'),
        (category) => {
          saveCategoryPreference(category);
          const loaded = loadCategoryPreference();
          expect(loaded).toBe(category);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('无效的存储值应返回 null', () => {
    localStorage.setItem('unit_converter_category', 'invalid');
    expect(loadCategoryPreference()).toBeNull();
    
    localStorage.setItem('unit_converter_category', '');
    expect(loadCategoryPreference()).toBeNull();
  });
});

describe('Readable time formatting', () => {
  const englishFormatter: ReadableTimeFormatter = (count, part) => {
    const labels = {
      day: count === 1 ? 'day' : 'days',
      hour: count === 1 ? 'hour' : 'hours',
      minute: count === 1 ? 'minute' : 'minutes',
      second: count === 1 ? 'second' : 'seconds',
    };
    return `${count} ${labels[part]}`;
  };

  it('uses the provided formatter for readable time parts', () => {
    expect(formatTimeReadable(90, 'min', englishFormatter)).toBe('1 hour 30 minutes');
    expect(formatTimeReadable(1.5, 'd', englishFormatter)).toBe('1 day 12 hours');
  });

  it('keeps the existing compact Chinese fallback when no formatter is provided', () => {
    expect(formatTimeReadable(90, 'min')).toBe('1小时 30分钟');
  });
});

describe('Unit converter stable errors', () => {
  const getThrownMessage = (fn: () => void): string => {
    try {
      fn();
    } catch (error) {
      return error instanceof Error ? error.message : String(error);
    }

    throw new Error('Expected function to throw');
  };

  it('does not expose unknown category values in thrown errors', () => {
    const message = getThrownMessage(() => {
      getCategoryConfig('currency' as UnitCategory);
    });

    expect(message).toBe('unknownCategory');
    expect(message).not.toContain('currency');
  });

  it('does not expose unknown unit values in thrown errors', () => {
    const message = getThrownMessage(() => {
      getUnitConfig('evil-unit' as Unit, 'time');
    });

    expect(message).toBe('unknownUnit');
    expect(message).not.toContain('evil-unit');
    expect(message).not.toContain('time');
  });
});
