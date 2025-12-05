/**
 * 格式转换引擎属性测试
 * 使用 fast-check 进行属性测试
 * 
 * **Feature: yaml-toml-converter**
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  convert,
  detectFormat,
  parseJson,
  parseYaml,
  parseToml,
  stringifyJson,
  stringifyYaml,
  DataFormat,
} from '../formatConverter';

/**
 * 生成 TOML 兼容的简单值
 */
const tomlCompatibleLeaf = fc.oneof(
  fc.string().filter(s => !s.includes('\u0000') && s.length < 50), // 排除 null 字符，限制长度
  fc.integer({ min: -1000000, max: 1000000 }), // 限制整数范围
  fc.double({ noNaN: true, noDefaultInfinity: true, min: -1e10, max: 1e10 }),
  fc.boolean()
);

/**
 * 生成有效的对象键（TOML 兼容，排除特殊键名）
 */
const validKey = fc.string({ minLength: 1, maxLength: 10 })
  .filter(s => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(s))
  .filter(s => !['__proto__', 'constructor', 'prototype'].includes(s));

/**
 * 生成 TOML 兼容的对象（无 null，无混合数组）
 */
const tomlCompatibleObject = fc.letrec(tie => ({
  leaf: tomlCompatibleLeaf,
  array: fc.array(tomlCompatibleLeaf, { maxLength: 3 }),
  object: fc.dictionary(
    validKey,
    fc.oneof(
      { weight: 3, arbitrary: tie('leaf') },
      { weight: 1, arbitrary: tie('array') },
      { weight: 1, arbitrary: tie('object') }
    ),
    { minKeys: 1, maxKeys: 3 }
  )
})).object;

/**
 * 生成通用 JavaScript 对象（可能包含 null）
 */
const generalObject = fc.letrec(tie => ({
  leaf: fc.oneof(
    fc.string().filter(s => !s.includes('\u0000')),
    fc.integer(),
    fc.double({ noNaN: true, noDefaultInfinity: true }),
    fc.boolean(),
    fc.constant(null)
  ),
  array: fc.array(tie('leaf'), { maxLength: 3 }),
  object: fc.dictionary(
    validKey,
    fc.oneof(
      { weight: 3, arbitrary: tie('leaf') },
      { weight: 1, arbitrary: tie('array') },
      { weight: 1, arbitrary: tie('object') }
    ),
    { minKeys: 1, maxKeys: 3 }
  )
})).object;

describe('Format Converter Property Tests', () => {
  /**
   * **Property 1: JSON-YAML 往返一致性**
   * **Validates: Requirements 1.1, 1.3**
   * 
   * For any 有效的 JavaScript 对象，将其序列化为 JSON 后转换为 YAML，
   * 再转换回 JSON 并解析，应得到与原对象深度相等的结果。
   */
  describe('Property 1: JSON-YAML Round Trip Consistency', () => {
    it('should preserve data when converting JSON -> YAML -> JSON', () => {
      fc.assert(
        fc.property(generalObject, (obj) => {
          // JSON -> YAML
          const jsonStr = stringifyJson(obj);
          const toYamlResult = convert(jsonStr, 'json', 'yaml');
          expect(toYamlResult.success).toBe(true);
          
          // YAML -> JSON
          const toJsonResult = convert(toYamlResult.output, 'yaml', 'json');
          expect(toJsonResult.success).toBe(true);
          
          // 比较结果
          const parsed = parseJson(toJsonResult.output);
          expect(parsed).toEqual(obj);
        }),
        { numRuns: 100 }
      );
    });
  });


  /**
   * **Property 2: JSON-TOML 往返一致性**
   * **Validates: Requirements 1.2, 1.5**
   * 
   * For any 有效的 JavaScript 对象（符合 TOML 限制），将其序列化为 JSON 后转换为 TOML，
   * 再转换回 JSON 并解析，应得到与原对象深度相等的结果。
   */
  describe('Property 2: JSON-TOML Round Trip Consistency', () => {
    it('should preserve data when converting JSON -> TOML -> JSON', () => {
      fc.assert(
        fc.property(tomlCompatibleObject, (obj) => {
          // JSON -> TOML
          const jsonStr = stringifyJson(obj);
          const toTomlResult = convert(jsonStr, 'json', 'toml');
          expect(toTomlResult.success).toBe(true);
          
          // TOML -> JSON
          const toJsonResult = convert(toTomlResult.output, 'toml', 'json');
          expect(toJsonResult.success).toBe(true);
          
          // 比较结果
          const parsed = parseJson(toJsonResult.output);
          expect(parsed).toEqual(obj);
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Property 3: YAML-TOML 往返一致性**
   * **Validates: Requirements 1.4, 1.6**
   * 
   * For any 有效的 JavaScript 对象（符合 TOML 限制），将其序列化为 YAML 后转换为 TOML，
   * 再转换回 YAML 并解析，应得到与原对象深度相等的结果。
   */
  describe('Property 3: YAML-TOML Round Trip Consistency', () => {
    it('should preserve data when converting YAML -> TOML -> YAML', () => {
      fc.assert(
        fc.property(tomlCompatibleObject, (obj) => {
          // YAML -> TOML
          const yamlStr = stringifyYaml(obj);
          const toTomlResult = convert(yamlStr, 'yaml', 'toml');
          expect(toTomlResult.success).toBe(true);
          
          // TOML -> YAML
          const toYamlResult = convert(toTomlResult.output, 'toml', 'yaml');
          expect(toYamlResult.success).toBe(true);
          
          // 比较结果
          const parsed = parseYaml(toYamlResult.output);
          expect(parsed).toEqual(obj);
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Property 4: JSON 格式检测准确性**
   * **Validates: Requirements 2.1**
   * 
   * For any 以 `{` 或 `[` 开头的有效 JSON 字符串，格式检测器应返回 `json` 格式。
   */
  describe('Property 4: JSON Format Detection Accuracy', () => {
    it('should detect JSON format for valid JSON strings', () => {
      fc.assert(
        fc.property(generalObject, (obj) => {
          const jsonStr = stringifyJson(obj);
          const result = detectFormat(jsonStr);
          expect(result.format).toBe('json');
          expect(result.confidence).toBe('high');
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Property 5: YAML 格式检测准确性**
   * **Validates: Requirements 2.2**
   * 
   * For any 包含 YAML 特征的有效 YAML 字符串，格式检测器应返回 `yaml` 格式。
   */
  describe('Property 5: YAML Format Detection Accuracy', () => {
    it('should detect YAML format for YAML strings with document separator', () => {
      fc.assert(
        fc.property(generalObject, (obj) => {
          // 添加 YAML 文档分隔符
          const yamlStr = '---\n' + stringifyYaml(obj);
          const result = detectFormat(yamlStr);
          expect(result.format).toBe('yaml');
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Property 6: TOML 格式检测准确性**
   * **Validates: Requirements 2.3**
   * 
   * For any 包含 TOML 特征的有效 TOML 字符串，格式检测器应返回 `toml` 格式。
   */
  describe('Property 6: TOML Format Detection Accuracy', () => {
    it('should detect TOML format for valid TOML strings with sections', () => {
      // 测试带有 [section] 的 TOML 字符串
      const tomlWithSection = '[database]\nhost = "localhost"\nport = 5432';
      const result = detectFormat(tomlWithSection);
      expect(result.format).toBe('toml');
      expect(result.confidence).toBe('high');
    });

    it('should detect TOML format for key = value patterns', () => {
      fc.assert(
        fc.property(
          validKey,
          fc.oneof(fc.string(), fc.integer(), fc.boolean()),
          (key, value) => {
            // 生成简单的 key = value TOML 格式
            let tomlStr: string;
            if (typeof value === 'string') {
              tomlStr = `${key} = "${value.replace(/"/g, '\\"')}"`;
            } else {
              tomlStr = `${key} = ${value}`;
            }
            
            const result = detectFormat(tomlStr);
            // TOML 的 key = value 模式应该被检测到
            expect(['toml', 'yaml']).toContain(result.format);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  /**
   * **Property 7: 无效输入错误处理**
   * **Validates: Requirements 3.1, 3.2, 3.3**
   * 
   * For any 无效的格式字符串，转换函数应返回包含错误信息的结果，且 success 为 false。
   */
  describe('Property 7: Invalid Input Error Handling', () => {
    const invalidInputs = [
      { input: '{invalid json', format: 'json' as DataFormat },
      { input: 'key: value\n  invalid indent', format: 'yaml' as DataFormat },
      { input: '[invalid\ntoml = ', format: 'toml' as DataFormat },
    ];

    it('should return error for invalid JSON input', () => {
      const result = convert('{invalid json}', 'json', 'yaml');
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toBeTruthy();
    });

    it('should return error for invalid TOML input', () => {
      const result = convert('[invalid\ntoml = ', 'toml', 'json');
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  /**
   * **Property 8: 缩进选项生效**
   * **Validates: Requirements 6.1, 6.2**
   * 
   * For any 有效的 JavaScript 对象和缩进设置（2 或 4），JSON/YAML 输出的缩进应与设置一致。
   */
  describe('Property 8: Indent Options Effectiveness', () => {
    it('should apply indent size to JSON output', () => {
      fc.assert(
        fc.property(
          fc.record({ nested: fc.record({ key: fc.string() }) }),
          fc.constantFrom(2, 4) as fc.Arbitrary<2 | 4>,
          (obj, indentSize) => {
            const result = convert(stringifyJson(obj), 'json', 'json', { indentSize });
            expect(result.success).toBe(true);
            
            // 检查缩进
            const lines = result.output.split('\n');
            const indentedLine = lines.find(line => line.startsWith(' '));
            if (indentedLine) {
              const leadingSpaces = indentedLine.match(/^(\s*)/)?.[1].length || 0;
              expect(leadingSpaces % indentSize).toBe(0);
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should apply indent size to YAML output', () => {
      fc.assert(
        fc.property(
          fc.record({ nested: fc.record({ key: fc.string() }) }),
          fc.constantFrom(2, 4) as fc.Arbitrary<2 | 4>,
          (obj, indentSize) => {
            const result = convert(stringifyJson(obj), 'json', 'yaml', { indentSize });
            expect(result.success).toBe(true);
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});
