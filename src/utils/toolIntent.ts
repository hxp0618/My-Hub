import { jsonrepair } from 'jsonrepair';
import CryptoJS from 'crypto-js';
import { ToolId } from '../types/tools';
import { convert, detectFormat, type DataFormat } from './formatConverter';
import { getNextExecutions, validateCronExpression } from './cronUtils';
import { parseCurl } from './curlUtils';
import { generateNanoID, generateRandomNumber, generateRandomString, generateUUID } from './randomGenerators';

export type ToolIntentId =
  | 'json-format'
  | 'json-repair'
  | 'url-encode'
  | 'url-decode'
  | 'base64-encode'
  | 'base64-decode'
  | 'html-entity-encode'
  | 'html-entity-decode'
  | 'jwt-decode'
  | 'timestamp-to-date'
  | 'yaml-convert'
  | 'toml-convert'
  | 'regex-test'
  | 'hash-calculate'
  | 'case-convert'
  | 'color-convert'
  | 'uuid-generate'
  | 'nanoid-generate'
  | 'random-string'
  | 'random-number'
  | 'cron-inspect'
  | 'curl-import'
  | 'http-request';

export interface ToolIntent {
  id: ToolIntentId;
  toolId: ToolId;
  mode: string;
  confidence: number;
  titleKey: string;
  descriptionKey: string;
  previewLabelKey: string;
}

export type ToolIntentRunResult =
  | { success: true; output: string }
  | { success: false; errorKey: string };

const INTENT_COPY: Record<ToolIntentId, Pick<ToolIntent, 'titleKey' | 'descriptionKey' | 'previewLabelKey'>> = {
  'json-format': {
    titleKey: 'tools.smartToolRouter.intents.jsonFormat.title',
    descriptionKey: 'tools.smartToolRouter.intents.jsonFormat.description',
    previewLabelKey: 'tools.smartToolRouter.preview',
  },
  'json-repair': {
    titleKey: 'tools.smartToolRouter.intents.jsonRepair.title',
    descriptionKey: 'tools.smartToolRouter.intents.jsonRepair.description',
    previewLabelKey: 'tools.smartToolRouter.preview',
  },
  'url-encode': {
    titleKey: 'tools.smartToolRouter.intents.urlEncode.title',
    descriptionKey: 'tools.smartToolRouter.intents.urlEncode.description',
    previewLabelKey: 'tools.smartToolRouter.preview',
  },
  'url-decode': {
    titleKey: 'tools.smartToolRouter.intents.urlDecode.title',
    descriptionKey: 'tools.smartToolRouter.intents.urlDecode.description',
    previewLabelKey: 'tools.smartToolRouter.preview',
  },
  'base64-encode': {
    titleKey: 'tools.smartToolRouter.intents.base64Encode.title',
    descriptionKey: 'tools.smartToolRouter.intents.base64Encode.description',
    previewLabelKey: 'tools.smartToolRouter.preview',
  },
  'base64-decode': {
    titleKey: 'tools.smartToolRouter.intents.base64Decode.title',
    descriptionKey: 'tools.smartToolRouter.intents.base64Decode.description',
    previewLabelKey: 'tools.smartToolRouter.preview',
  },
  'html-entity-encode': {
    titleKey: 'tools.smartToolRouter.intents.htmlEntityEncode.title',
    descriptionKey: 'tools.smartToolRouter.intents.htmlEntityEncode.description',
    previewLabelKey: 'tools.smartToolRouter.preview',
  },
  'html-entity-decode': {
    titleKey: 'tools.smartToolRouter.intents.htmlEntityDecode.title',
    descriptionKey: 'tools.smartToolRouter.intents.htmlEntityDecode.description',
    previewLabelKey: 'tools.smartToolRouter.preview',
  },
  'jwt-decode': {
    titleKey: 'tools.smartToolRouter.intents.jwtDecode.title',
    descriptionKey: 'tools.smartToolRouter.intents.jwtDecode.description',
    previewLabelKey: 'tools.smartToolRouter.preview',
  },
  'timestamp-to-date': {
    titleKey: 'tools.smartToolRouter.intents.timestampToDate.title',
    descriptionKey: 'tools.smartToolRouter.intents.timestampToDate.description',
    previewLabelKey: 'tools.smartToolRouter.preview',
  },
  'yaml-convert': {
    titleKey: 'tools.smartToolRouter.intents.yamlConvert.title',
    descriptionKey: 'tools.smartToolRouter.intents.yamlConvert.description',
    previewLabelKey: 'tools.smartToolRouter.preview',
  },
  'toml-convert': {
    titleKey: 'tools.smartToolRouter.intents.tomlConvert.title',
    descriptionKey: 'tools.smartToolRouter.intents.tomlConvert.description',
    previewLabelKey: 'tools.smartToolRouter.preview',
  },
  'regex-test': {
    titleKey: 'tools.smartToolRouter.intents.regexTest.title',
    descriptionKey: 'tools.smartToolRouter.intents.regexTest.description',
    previewLabelKey: 'tools.smartToolRouter.preview',
  },
  'hash-calculate': {
    titleKey: 'tools.smartToolRouter.intents.hashCalculate.title',
    descriptionKey: 'tools.smartToolRouter.intents.hashCalculate.description',
    previewLabelKey: 'tools.smartToolRouter.preview',
  },
  'case-convert': {
    titleKey: 'tools.smartToolRouter.intents.caseConvert.title',
    descriptionKey: 'tools.smartToolRouter.intents.caseConvert.description',
    previewLabelKey: 'tools.smartToolRouter.preview',
  },
  'color-convert': {
    titleKey: 'tools.smartToolRouter.intents.colorConvert.title',
    descriptionKey: 'tools.smartToolRouter.intents.colorConvert.description',
    previewLabelKey: 'tools.smartToolRouter.preview',
  },
  'uuid-generate': {
    titleKey: 'tools.smartToolRouter.intents.uuidGenerate.title',
    descriptionKey: 'tools.smartToolRouter.intents.uuidGenerate.description',
    previewLabelKey: 'tools.smartToolRouter.preview',
  },
  'nanoid-generate': {
    titleKey: 'tools.smartToolRouter.intents.nanoidGenerate.title',
    descriptionKey: 'tools.smartToolRouter.intents.nanoidGenerate.description',
    previewLabelKey: 'tools.smartToolRouter.preview',
  },
  'random-string': {
    titleKey: 'tools.smartToolRouter.intents.randomString.title',
    descriptionKey: 'tools.smartToolRouter.intents.randomString.description',
    previewLabelKey: 'tools.smartToolRouter.preview',
  },
  'random-number': {
    titleKey: 'tools.smartToolRouter.intents.randomNumber.title',
    descriptionKey: 'tools.smartToolRouter.intents.randomNumber.description',
    previewLabelKey: 'tools.smartToolRouter.preview',
  },
  'cron-inspect': {
    titleKey: 'tools.smartToolRouter.intents.cronInspect.title',
    descriptionKey: 'tools.smartToolRouter.intents.cronInspect.description',
    previewLabelKey: 'tools.smartToolRouter.preview',
  },
  'curl-import': {
    titleKey: 'tools.smartToolRouter.intents.curlImport.title',
    descriptionKey: 'tools.smartToolRouter.intents.curlImport.description',
    previewLabelKey: 'tools.smartToolRouter.preview',
  },
  'http-request': {
    titleKey: 'tools.smartToolRouter.intents.httpRequest.title',
    descriptionKey: 'tools.smartToolRouter.intents.httpRequest.description',
    previewLabelKey: 'tools.smartToolRouter.preview',
  },
};

type HashAlgorithm = 'MD5' | 'SHA1' | 'SHA256' | 'SHA512';
type CaseMode = 'camelCase' | 'snakeCase' | 'kebabCase' | 'uppercase' | 'lowercase';

interface RegexLiteral {
  pattern: string;
  flags: string;
}

interface HashCommand {
  algorithm: HashAlgorithm;
  input: string;
}

interface CaseCommand {
  mode: CaseMode;
  input: string;
}

interface EncodeCommand {
  intentId: 'url-encode' | 'base64-encode' | 'html-entity-encode';
  toolId: ToolId;
  input: string;
}

interface RandomCommand {
  intentId: 'uuid-generate' | 'nanoid-generate' | 'random-string' | 'random-number';
  mode: string;
  input: string;
  length?: number;
  min?: number;
  max?: number;
}

const makeIntent = (
  id: ToolIntentId,
  toolId: ToolId,
  mode: string,
  confidence: number,
): ToolIntent => ({
  id,
  toolId,
  mode,
  confidence,
  ...INTENT_COPY[id],
});

const isJsonLike = (value: string): boolean => {
  const trimmed = value.trim();
  const isTomlSection = /^\[[a-zA-Z_][a-zA-Z0-9_.-]*\]\s*(?:\r?\n|$)/.test(trimmed);
  return trimmed.startsWith('{') || (trimmed.startsWith('[') && !isTomlSection);
};

const parseTimestamp = (value: string): Date | null => {
  if (!/^\d{10}$|^\d{13}$/.test(value)) return null;
  const numericValue = Number(value);
  const date = new Date(value.length === 10 ? numericValue * 1000 : numericValue);
  const year = date.getUTCFullYear();
  return Number.isNaN(date.getTime()) || year < 2000 || year > 2100 ? null : date;
};

const parseRegexLiteral = (value: string): RegexLiteral | null => {
  const match = value.match(/^\/((?:\\.|[^/])+)\/([dgimsuvy]*)$/s);
  if (!match) return null;

  try {
    new RegExp(match[1], match[2]);
    return { pattern: match[1], flags: match[2] };
  } catch {
    return null;
  }
};

const HASH_ALGORITHMS: Record<string, HashAlgorithm> = {
  md5: 'MD5',
  sha1: 'SHA1',
  'sha-1': 'SHA1',
  sha256: 'SHA256',
  'sha-256': 'SHA256',
  sha512: 'SHA512',
  'sha-512': 'SHA512',
};

const parseHashCommand = (value: string): HashCommand | null => {
  const match = value.match(/^(md5|sha-?1|sha-?256|sha-?512)\s*(?::|\()\s*([\s\S]+?)\s*\)?$/i);
  if (!match) return null;
  const input = match[2].trim();
  return input ? { algorithm: HASH_ALGORITHMS[match[1].toLowerCase()], input } : null;
};

const CASE_MODES: Record<string, CaseMode> = {
  camel: 'camelCase',
  snake: 'snakeCase',
  kebab: 'kebabCase',
  upper: 'uppercase',
  uppercase: 'uppercase',
  lower: 'lowercase',
  lowercase: 'lowercase',
};

const parseCaseCommand = (value: string): CaseCommand | null => {
  const match = value.match(/^(camel|snake|kebab|upper(?:case)?|lower(?:case)?)\s*:\s*([\s\S]+)$/i);
  if (!match) return null;
  const input = match[2].trim();
  return input ? { mode: CASE_MODES[match[1].toLowerCase()], input } : null;
};

const parseEncodeCommand = (value: string): EncodeCommand | null => {
  const match = value.match(/^(url|base64|html(?:\s+entity)?)\s+encode\s*:\s*([\s\S]+)$/i);
  if (!match || !match[2].trim()) return null;

  const command = match[1].toLowerCase();
  if (command === 'url') {
    return { intentId: 'url-encode', toolId: ToolId.URL_CODEC, input: match[2].trim() };
  }
  if (command === 'base64') {
    return { intentId: 'base64-encode', toolId: ToolId.BASE64_CONVERTER, input: match[2].trim() };
  }
  return { intentId: 'html-entity-encode', toolId: ToolId.HTML_ENTITY, input: match[2].trim() };
};

const parseRandomCommand = (value: string): RandomCommand | null => {
  const uuidMatch = value.match(/^(?:random\s+)?uuid(?:\s+(v1|v4))?$/i);
  if (uuidMatch) {
    const version = uuidMatch[1]?.toLowerCase() === 'v1' ? 'v1' : 'v4';
    return { intentId: 'uuid-generate', mode: `uuid-${version}`, input: '', length: undefined };
  }

  const nanoidMatch = value.match(/^(?:random\s+)?nanoid(?:\s+(\d{1,3}))?$/i);
  if (nanoidMatch) {
    const length = Math.min(64, Math.max(1, Number(nanoidMatch[1] || 21)));
    return { intentId: 'nanoid-generate', mode: 'nanoid', input: String(length), length };
  }

  const stringMatch = value.match(/^random\s+string(?:\s+(\d{1,3}))?$/i);
  if (stringMatch) {
    const length = Math.min(256, Math.max(1, Number(stringMatch[1] || 16)));
    return { intentId: 'random-string', mode: 'string', input: String(length), length };
  }

  const numberMatch = value.match(/^random\s+(?:number|integer)(?:\s+(-?\d+)\s*(?:\.\.|,|:)\s*(-?\d+))?$/i);
  if (!numberMatch) return null;
  const min = Number(numberMatch[1] ?? 0);
  const max = Number(numberMatch[2] ?? 100);
  if (!Number.isSafeInteger(min) || !Number.isSafeInteger(max) || min > max) return null;
  return { intentId: 'random-number', mode: 'number', input: `${min},${max}`, min, max };
};

const parseColor = (value: string): { hex: string; rgb: string } | null => {
  const hexMatch = value.match(/^#?([\da-f]{3}|[\da-f]{6})$/i);
  if (hexMatch) {
    const normalized = hexMatch[1].length === 3
      ? hexMatch[1].split('').map(char => `${char}${char}`).join('')
      : hexMatch[1];
    const r = Number.parseInt(normalized.slice(0, 2), 16);
    const g = Number.parseInt(normalized.slice(2, 4), 16);
    const b = Number.parseInt(normalized.slice(4, 6), 16);
    return { hex: `#${normalized.toLowerCase()}`, rgb: `rgb(${r}, ${g}, ${b})` };
  }

  const rgbMatch = value.match(/^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i);
  if (!rgbMatch) return null;
  const channels = rgbMatch.slice(1).map(Number);
  if (channels.some(channel => channel > 255)) return null;
  const hex = `#${channels.map(channel => channel.toString(16).padStart(2, '0')).join('')}`;
  return { hex, rgb: `rgb(${channels.join(', ')})` };
};

const parseHttpUrl = (value: string): URL | null => {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url : null;
  } catch {
    return null;
  }
};

const splitWords = (value: string): string[] => value
  .trim()
  .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
  .replace(/([a-z\d])([A-Z])/g, '$1 $2')
  .replace(/[_\-./\\\s]+/g, ' ')
  .split(' ')
  .filter(Boolean);

const convertCasePreview = (input: string, mode: CaseMode): string => {
  if (mode === 'uppercase') return input.toUpperCase();
  if (mode === 'lowercase') return input.toLowerCase();

  const words = splitWords(input).map(word => word.toLowerCase());
  if (mode === 'snakeCase') return words.join('_');
  if (mode === 'kebabCase') return words.join('-');
  return words.map((word, index) => index === 0 ? word : `${word.charAt(0).toUpperCase()}${word.slice(1)}`).join('');
};

const calculateHashPreview = (input: string, algorithm: HashAlgorithm): string => {
  switch (algorithm) {
    case 'MD5': return CryptoJS.MD5(input).toString();
    case 'SHA1': return CryptoJS.SHA1(input).toString();
    case 'SHA256': return CryptoJS.SHA256(input).toString();
    case 'SHA512': return CryptoJS.SHA512(input).toString();
  }
};

export const getToolIntentInvocationInput = (intent: ToolIntent, input: string): string => {
  if (intent.id === 'regex-test') return parseRegexLiteral(input.trim())?.pattern ?? input;
  if (intent.id === 'hash-calculate') return parseHashCommand(input.trim())?.input ?? input;
  if (intent.id === 'case-convert') return parseCaseCommand(input.trim())?.input ?? input;
  if (intent.id === 'url-encode' || intent.id === 'base64-encode' || intent.id === 'html-entity-encode') {
    return parseEncodeCommand(input.trim())?.input ?? input;
  }
  if (intent.id === 'uuid-generate' || intent.id === 'nanoid-generate' || intent.id === 'random-string' || intent.id === 'random-number') {
    return parseRandomCommand(input.trim())?.input ?? input;
  }
  return input;
};

const safeJsonRepair = (value: string): string | null => {
  try {
    const repaired = jsonrepair(value);
    JSON.parse(repaired);
    return repaired;
  } catch {
    return null;
  }
};

const decodeUtf8Base64 = (value: string): string | null => {
  try {
    const normalized = value.trim().replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
};

const encodeUtf8Base64 = (value: string): string => {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  bytes.forEach(byte => { binary += String.fromCharCode(byte); });
  return btoa(binary);
};

const encodeHtmlEntityText = (value: string): string => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const decodeBase64UrlJson = (value: string): Record<string, unknown> | null => {
  const decoded = decodeUtf8Base64(value);
  if (!decoded) return null;

  try {
    const parsed: unknown = JSON.parse(decoded);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
};

const looksLikeBase64 = (value: string): boolean => {
  const trimmed = value.trim();
  if (trimmed.length < 8 || trimmed.length % 4 !== 0) return false;
  if (!/^[A-Za-z0-9+/_-]+={0,2}$/.test(trimmed)) return false;

  const decoded = decodeUtf8Base64(trimmed);
  if (!decoded || decoded === trimmed || decoded.trim().length < 2) return false;
  return !Array.from(decoded).some(char => {
    const code = char.charCodeAt(0);
    return code < 32 && code !== 9 && code !== 10 && code !== 13;
  });
};

const decodeHtmlEntityText = (value: string): string => value.replace(
  /&(?:amp|lt|gt|quot|apos|#39|#\d+|#x[0-9a-f]+);/gi,
  entity => {
    const named: Record<string, string> = {
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&apos;': "'",
      '&#39;': "'",
    };
    const lower = entity.toLowerCase();
    if (named[lower]) return named[lower];

    const numericMatch = lower.match(/^&#(x[0-9a-f]+|\d+);$/);
    if (!numericMatch) return entity;

    const rawCode = numericMatch[1];
    const code = rawCode.startsWith('x')
      ? Number.parseInt(rawCode.slice(1), 16)
      : Number.parseInt(rawCode, 10);
    return Number.isFinite(code) ? String.fromCodePoint(code) : entity;
  },
);

const looksLikeHtmlEntity = (value: string): boolean => (
  /&(?:amp|lt|gt|quot|apos|#39|#\d+|#x[0-9a-f]+);/i.test(value)
);

const decodeJwtParts = (value: string): { header: Record<string, unknown>; payload: Record<string, unknown> } | null => {
  const parts = value.trim().split('.');
  if (parts.length !== 3 || parts.some(part => !/^[A-Za-z0-9_-]*$/.test(part))) {
    return null;
  }

  const header = decodeBase64UrlJson(parts[0]);
  const payload = decodeBase64UrlJson(parts[1]);
  return header && payload ? { header, payload } : null;
};

export const detectToolIntents = (input: string): ToolIntent[] => {
  const value = input.trim();
  if (!value) return [];

  const intents: ToolIntent[] = [];
  const hashCommand = parseHashCommand(value);
  const caseCommand = parseCaseCommand(value);
  const regexLiteral = parseRegexLiteral(value);
  const encodeCommand = parseEncodeCommand(value);
  const randomCommand = parseRandomCommand(value);
  const color = parseColor(value);
  const curl = /^curl(?:\s|$)/i.test(value) ? parseCurl(value) : null;
  const httpUrl = parseHttpUrl(value);

  if (decodeJwtParts(value)) {
    intents.push(makeIntent('jwt-decode', ToolId.JWT_DECODER, 'decode', 0.92));
  }

  if (isJsonLike(value)) {
    try {
      JSON.parse(value);
      intents.push(makeIntent('json-format', ToolId.JSON_FORMATTER, 'format', 0.98));
    } catch {
      if (safeJsonRepair(value)) {
        intents.push(makeIntent('json-repair', ToolId.JSON_FORMATTER, 'repair', 0.88));
      }
    }
  }

  if (parseTimestamp(value)) {
    intents.push(makeIntent('timestamp-to-date', ToolId.TIMESTAMP_CONVERTER, 'timestamp-to-date', 0.96));
  }

  if (hashCommand) {
    intents.push(makeIntent('hash-calculate', ToolId.HASH_CALCULATOR, hashCommand.algorithm, 0.94));
  }

  if (caseCommand) {
    intents.push(makeIntent('case-convert', ToolId.CASE_CONVERTER, caseCommand.mode, 0.93));
  }

  if (encodeCommand) {
    intents.push(makeIntent(encodeCommand.intentId, encodeCommand.toolId, 'encode', 0.97));
  }

  if (randomCommand) {
    intents.push(makeIntent(randomCommand.intentId, ToolId.RANDOM_GENERATOR, randomCommand.mode, 0.96));
  }

  if (color) {
    intents.push(makeIntent('color-convert', ToolId.COLOR_CONVERTER, 'color', 0.95));
  }

  if (/^\S+(?:\s+\S+){4}$/.test(value) && validateCronExpression(value).isValid) {
    intents.push(makeIntent('cron-inspect', ToolId.CRON_BUILDER, 'cron', 0.94));
  }

  if (curl?.success) {
    intents.push(makeIntent('curl-import', ToolId.HTTP_URL_TESTER, 'curl', 0.99));
  } else if (httpUrl) {
    intents.push(makeIntent('http-request', ToolId.HTTP_URL_TESTER, 'url', 0.83));
  }

  if (regexLiteral) {
    intents.push(makeIntent('regex-test', ToolId.REGEX_TESTER, `regex:${regexLiteral.flags}`, 0.9));
  }

  if (!isJsonLike(value) && !hashCommand && !caseCommand && value.includes('\n')) {
    const detectedFormat = detectFormat(value);
    if (detectedFormat.format === 'yaml' && detectedFormat.confidence !== 'low') {
      intents.push(makeIntent('yaml-convert', ToolId.YAML_TOML_CONVERTER, 'yaml-to-json', 0.86));
    } else if (detectedFormat.format === 'toml' && detectedFormat.confidence !== 'low') {
      intents.push(makeIntent('toml-convert', ToolId.YAML_TOML_CONVERTER, 'toml-to-json', 0.9));
    }
  }

  if (/%[0-9a-f]{2}/i.test(value)) {
    try {
      const decoded = decodeURIComponent(value);
      if (decoded !== value) {
        intents.push(makeIntent('url-decode', ToolId.URL_CODEC, 'decode', 0.84));
      }
    } catch {
      // Invalid percent-encoding is not a candidate.
    }
  }

  if (looksLikeHtmlEntity(value)) {
    intents.push(makeIntent('html-entity-decode', ToolId.HTML_ENTITY, 'decode', 0.82));
  }

  if (!value.includes('.') && looksLikeBase64(value)) {
    intents.push(makeIntent('base64-decode', ToolId.BASE64_CONVERTER, 'decode', 0.78));
  }

  return intents.sort((a, b) => b.confidence - a.confidence);
};

export const runToolIntent = (intent: ToolIntent, input: string): ToolIntentRunResult => {
  const value = input.trim();

  try {
    switch (intent.id) {
      case 'json-format':
        return { success: true, output: JSON.stringify(JSON.parse(value), null, 2) };
      case 'json-repair': {
        const repaired = jsonrepair(value);
        return { success: true, output: JSON.stringify(JSON.parse(repaired), null, 2) };
      }
      case 'url-encode': {
        const command = parseEncodeCommand(value);
        return command
          ? { success: true, output: encodeURIComponent(command.input) }
          : { success: false, errorKey: 'tools.smartToolRouter.previewFailed' };
      }
      case 'url-decode':
        return { success: true, output: decodeURIComponent(value) };
      case 'base64-encode': {
        const command = parseEncodeCommand(value);
        return command
          ? { success: true, output: encodeUtf8Base64(command.input) }
          : { success: false, errorKey: 'tools.smartToolRouter.previewFailed' };
      }
      case 'base64-decode': {
        const decoded = decodeUtf8Base64(value);
        return decoded
          ? { success: true, output: decoded }
          : { success: false, errorKey: 'tools.smartToolRouter.previewFailed' };
      }
      case 'html-entity-decode':
        return { success: true, output: decodeHtmlEntityText(value) };
      case 'html-entity-encode': {
        const command = parseEncodeCommand(value);
        return command
          ? { success: true, output: encodeHtmlEntityText(command.input) }
          : { success: false, errorKey: 'tools.smartToolRouter.previewFailed' };
      }
      case 'jwt-decode': {
        const decoded = decodeJwtParts(value);
        return decoded
          ? { success: true, output: JSON.stringify(decoded, null, 2) }
          : { success: false, errorKey: 'tools.smartToolRouter.previewFailed' };
      }
      case 'timestamp-to-date': {
        const date = parseTimestamp(value);
        return date
          ? { success: true, output: `ISO 8601: ${date.toISOString()}\nLocal: ${date.toLocaleString()}` }
          : { success: false, errorKey: 'tools.smartToolRouter.previewFailed' };
      }
      case 'yaml-convert':
      case 'toml-convert': {
        const sourceFormat: DataFormat = intent.id === 'yaml-convert' ? 'yaml' : 'toml';
        const converted = convert(value, sourceFormat, 'json');
        return converted.success
          ? { success: true, output: converted.output }
          : { success: false, errorKey: 'tools.smartToolRouter.previewFailed' };
      }
      case 'regex-test': {
        const regex = parseRegexLiteral(value);
        return regex
          ? { success: true, output: `Pattern: ${regex.pattern}\nFlags: ${regex.flags || '(none)'}` }
          : { success: false, errorKey: 'tools.smartToolRouter.previewFailed' };
      }
      case 'hash-calculate': {
        const command = parseHashCommand(value);
        return command
          ? { success: true, output: calculateHashPreview(command.input, command.algorithm) }
          : { success: false, errorKey: 'tools.smartToolRouter.previewFailed' };
      }
      case 'case-convert': {
        const command = parseCaseCommand(value);
        return command
          ? { success: true, output: convertCasePreview(command.input, command.mode) }
          : { success: false, errorKey: 'tools.smartToolRouter.previewFailed' };
      }
      case 'color-convert': {
        const color = parseColor(value);
        return color
          ? { success: true, output: `${color.hex}\n${color.rgb}` }
          : { success: false, errorKey: 'tools.smartToolRouter.previewFailed' };
      }
      case 'uuid-generate': {
        const command = parseRandomCommand(value);
        const version = command?.mode === 'uuid-v1' ? 'v1' : 'v4';
        return command
          ? { success: true, output: generateUUID({ version, withHyphens: true }) }
          : { success: false, errorKey: 'tools.smartToolRouter.previewFailed' };
      }
      case 'nanoid-generate': {
        const command = parseRandomCommand(value);
        return command
          ? { success: true, output: generateNanoID({ length: command.length }) }
          : { success: false, errorKey: 'tools.smartToolRouter.previewFailed' };
      }
      case 'random-string': {
        const command = parseRandomCommand(value);
        return command
          ? {
              success: true,
              output: generateRandomString({
                length: command.length ?? 16,
                uppercase: true,
                lowercase: true,
                numbers: true,
                symbols: false,
              }),
            }
          : { success: false, errorKey: 'tools.smartToolRouter.previewFailed' };
      }
      case 'random-number': {
        const command = parseRandomCommand(value);
        return command && command.min !== undefined && command.max !== undefined
          ? { success: true, output: String(generateRandomNumber({ min: command.min, max: command.max })) }
          : { success: false, errorKey: 'tools.smartToolRouter.previewFailed' };
      }
      case 'cron-inspect': {
        const validation = validateCronExpression(value);
        if (!validation.isValid) return { success: false, errorKey: 'tools.smartToolRouter.previewFailed' };
        const next = getNextExecutions(value, 3).map(date => date.toLocaleString());
        return { success: true, output: `${value}\n${next.join('\n')}` };
      }
      case 'curl-import': {
        const parsed = parseCurl(value);
        if (!parsed.success) return { success: false, errorKey: 'tools.smartToolRouter.previewFailed' };
        const lines = [`${parsed.data.method} ${parsed.data.url}`];
        parsed.data.headers.filter(header => header.enabled && header.key).forEach(header => {
          lines.push(`${header.key}: ${header.value}`);
        });
        if (parsed.data.body) lines.push('', parsed.data.body);
        return { success: true, output: lines.join('\n') };
      }
      case 'http-request': {
        const url = parseHttpUrl(value);
        return url
          ? { success: true, output: `GET ${url.href}\nHost: ${url.host}` }
          : { success: false, errorKey: 'tools.smartToolRouter.previewFailed' };
      }
      default:
        return { success: false, errorKey: 'tools.smartToolRouter.previewFailed' };
    }
  } catch {
    return { success: false, errorKey: 'tools.smartToolRouter.previewFailed' };
  }
};
