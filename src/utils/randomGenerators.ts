/**
 * 随机生成器工具函数
 * 支持 UUID、NanoID、ULID、ObjectId、雪花 ID、随机字符串、随机数字、MD5 哈希
 */

// ==================== UUID 生成器 ====================

export interface UUIDOptions {
  version: 'v1' | 'v4';
  withHyphens: boolean;
}

/**
 * 生成 UUID v4 (随机)
 * 符合 RFC 4122 标准
 */
export const generateUUIDv4 = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

/**
 * 生成 UUID v1 (基于时间戳)
 */
export const generateUUIDv1 = (): string => {
  const now = Date.now();
  const timeHex = now.toString(16).padStart(12, '0');
  const timeLow = timeHex.slice(-8);
  const timeMid = timeHex.slice(-12, -8);
  const timeHigh = '1' + timeHex.slice(0, 3);
  const clockSeq = ((Math.random() * 0x3fff) | 0x8000).toString(16);
  const node = Array.from({ length: 6 }, () =>
    Math.floor(Math.random() * 256)
      .toString(16)
      .padStart(2, '0')
  ).join('');
  return `${timeLow}-${timeMid}-${timeHigh}-${clockSeq}-${node}`;
};

/**
 * 生成 UUID
 * @param options UUID 选项
 */
export const generateUUID = (options: UUIDOptions): string => {
  const uuid = options.version === 'v4' ? generateUUIDv4() : generateUUIDv1();
  return options.withHyphens ? uuid : uuid.replace(/-/g, '');
};

// ==================== NanoID 生成器 ====================

export interface NanoIDOptions {
  length?: number; // 1-64, default 21
}

const NANOID_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-';

/**
 * 生成 NanoID
 * URL 安全的唯一字符串 ID
 */
export const generateNanoID = (options: NanoIDOptions = {}): string => {
  const length = Math.min(64, Math.max(1, options.length ?? 21));
  let result = '';
  for (let i = 0; i < length; i++) {
    result += NANOID_ALPHABET[Math.floor(Math.random() * NANOID_ALPHABET.length)];
  }
  return result;
};


// ==================== ULID 生成器 ====================

// Crockford Base32 字符集 (排除 I, L, O, U 以避免混淆)
const ULID_ENCODING = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

// ULID 状态，用于同毫秒内递增
let lastULIDTime = 0;
let lastULIDRandom: number[] = [];

/**
 * 生成随机部分 (80 bits = 16 个 base32 字符)
 */
const generateULIDRandomPart = (): number[] => {
  const random: number[] = [];
  for (let i = 0; i < 16; i++) {
    random.push(Math.floor(Math.random() * 32));
  }
  return random;
};

/**
 * 递增随机部分
 */
const incrementULIDRandom = (random: number[]): number[] => {
  const result = [...random];
  for (let i = result.length - 1; i >= 0; i--) {
    if (result[i] < 31) {
      result[i]++;
      return result;
    }
    result[i] = 0;
  }
  // 溢出，重新生成
  return generateULIDRandomPart();
};

/**
 * 编码时间戳为 10 个 base32 字符
 */
const encodeULIDTime = (time: number): string => {
  let result = '';
  for (let i = 9; i >= 0; i--) {
    result = ULID_ENCODING[time % 32] + result;
    time = Math.floor(time / 32);
  }
  return result;
};

/**
 * 生成 ULID
 * 可排序的唯一标识符，26 字符
 */
export const generateULID = (): string => {
  const now = Date.now();

  if (now === lastULIDTime) {
    // 同毫秒内递增
    lastULIDRandom = incrementULIDRandom(lastULIDRandom);
  } else {
    lastULIDTime = now;
    lastULIDRandom = generateULIDRandomPart();
  }

  const timeStr = encodeULIDTime(now);
  const randomStr = lastULIDRandom.map(i => ULID_ENCODING[i]).join('');

  return timeStr + randomStr;
};

/**
 * 解析 ULID 时间戳
 */
export const parseULIDTimestamp = (ulid: string): Date => {
  if (ulid.length !== 26) {
    throw new Error('Invalid ULID length');
  }

  const timeStr = ulid.slice(0, 10).toUpperCase();
  let time = 0;

  for (let i = 0; i < 10; i++) {
    const char = timeStr[i];
    const index = ULID_ENCODING.indexOf(char);
    if (index === -1) {
      throw new Error(`Invalid ULID character: ${char}`);
    }
    time = time * 32 + index;
  }

  return new Date(time);
};

// ==================== ObjectId 生成器 ====================

// ObjectId 状态
let objectIdCounter = Math.floor(Math.random() * 0xffffff);
let objectIdRandom: string | null = null;

/**
 * 生成 5 字节随机值 (10 个十六进制字符)
 */
const getObjectIdRandom = (): string => {
  if (!objectIdRandom) {
    objectIdRandom = Array.from({ length: 5 }, () =>
      Math.floor(Math.random() * 256)
        .toString(16)
        .padStart(2, '0')
    ).join('');
  }
  return objectIdRandom;
};

/**
 * 生成 MongoDB ObjectId
 * 24 位十六进制字符
 */
export const generateObjectId = (): string => {
  // 4 字节时间戳
  const timestamp = Math.floor(Date.now() / 1000)
    .toString(16)
    .padStart(8, '0');

  // 5 字节随机值
  const random = getObjectIdRandom();

  // 3 字节递增计数器
  objectIdCounter = (objectIdCounter + 1) % 0xffffff;
  const counter = objectIdCounter.toString(16).padStart(6, '0');

  return timestamp + random + counter;
};

/**
 * 解析 ObjectId 时间戳
 */
export const parseObjectIdTimestamp = (objectId: string): Date => {
  if (objectId.length !== 24) {
    throw new Error('Invalid ObjectId length');
  }

  const timestamp = parseInt(objectId.slice(0, 8), 16);
  return new Date(timestamp * 1000);
};


// ==================== 雪花 ID 生成器 ====================

export interface SnowflakeConfig {
  epoch?: number; // 自定义纪元，默认 Twitter 纪元 (2010-11-04)
  workerId?: number; // 工作节点 ID，默认 1
  datacenterId?: number; // 数据中心 ID，默认 1
}

// Twitter 纪元: 2010-11-04 01:42:54.657 UTC
const TWITTER_EPOCH = 1288834974657n;

// 雪花 ID 状态
let snowflakeSequence = 0n;
let snowflakeLastTime = 0n;

/**
 * 生成雪花 ID
 * 64 位整数，返回字符串形式
 */
export const generateSnowflakeId = (config: SnowflakeConfig = {}): string => {
  const epoch = BigInt(config.epoch ?? Number(TWITTER_EPOCH));
  const workerId = BigInt(config.workerId ?? 1) & 0x1fn; // 5 bits
  const datacenterId = BigInt(config.datacenterId ?? 1) & 0x1fn; // 5 bits

  let timestamp = BigInt(Date.now()) - epoch;

  if (timestamp === snowflakeLastTime) {
    snowflakeSequence = (snowflakeSequence + 1n) & 0xfffn; // 12 bits
    if (snowflakeSequence === 0n) {
      // 等待下一毫秒
      while (timestamp <= snowflakeLastTime) {
        timestamp = BigInt(Date.now()) - epoch;
      }
    }
  } else {
    snowflakeSequence = 0n;
  }

  snowflakeLastTime = timestamp;

  // 组装 ID: timestamp (41 bits) | datacenterId (5 bits) | workerId (5 bits) | sequence (12 bits)
  const id =
    (timestamp << 22n) | (datacenterId << 17n) | (workerId << 12n) | snowflakeSequence;

  return id.toString();
};

/**
 * 解析雪花 ID 时间戳
 */
export const parseSnowflakeTimestamp = (id: string, epoch?: number): Date => {
  const snowflakeEpoch = BigInt(epoch ?? Number(TWITTER_EPOCH));
  const snowflakeId = BigInt(id);
  const timestamp = (snowflakeId >> 22n) + snowflakeEpoch;
  return new Date(Number(timestamp));
};

// ==================== 随机字符串生成器 ====================

export interface StringOptions {
  length: number; // 1-256
  uppercase: boolean;
  lowercase: boolean;
  numbers: boolean;
  symbols: boolean;
}

const UPPERCASE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const LOWERCASE_CHARS = 'abcdefghijklmnopqrstuvwxyz';
const NUMBER_CHARS = '0123456789';
const SYMBOL_CHARS = '!@#$%^&*()_+-=[]{}|;:,.<>?';

/**
 * 生成随机字符串
 */
export const generateRandomString = (options: StringOptions): string => {
  let charset = '';

  if (options.uppercase) charset += UPPERCASE_CHARS;
  if (options.lowercase) charset += LOWERCASE_CHARS;
  if (options.numbers) charset += NUMBER_CHARS;
  if (options.symbols) charset += SYMBOL_CHARS;

  if (charset.length === 0) {
    throw new Error('At least one character set must be selected');
  }

  const length = Math.min(256, Math.max(1, options.length));
  let result = '';

  for (let i = 0; i < length; i++) {
    result += charset[Math.floor(Math.random() * charset.length)];
  }

  return result;
};

// ==================== 随机数字生成器 ====================

export interface NumberOptions {
  min: number;
  max: number;
}

/**
 * 生成随机整数
 * @param options 范围选项
 * @returns 范围内的随机整数（包含边界）
 */
export const generateRandomNumber = (options: NumberOptions): number => {
  const min = Math.ceil(options.min);
  const max = Math.floor(options.max);

  if (min > max) {
    throw new Error('Minimum value cannot be greater than maximum value');
  }

  return Math.floor(Math.random() * (max - min + 1)) + min;
};

// ==================== MD5 哈希 ====================

export interface MD5Options {
  uppercase: boolean;
}

/**
 * 计算 MD5 哈希值
 * 使用 Web Crypto API 的替代实现
 */
export const calculateMD5 = (text: string, options: MD5Options = { uppercase: false }): string => {
  // MD5 实现
  const md5 = (str: string): string => {
    const rotateLeft = (x: number, n: number): number => (x << n) | (x >>> (32 - n));

    const addUnsigned = (x: number, y: number): number => {
      const x4 = x & 0x80000000;
      const y4 = y & 0x80000000;
      const x8 = x & 0x40000000;
      const y8 = y & 0x40000000;
      const result = (x & 0x3fffffff) + (y & 0x3fffffff);
      if (x8 & y8) return result ^ 0x80000000 ^ x4 ^ y4;
      if (x8 | y8) {
        if (result & 0x40000000) return result ^ 0xc0000000 ^ x4 ^ y4;
        return result ^ 0x40000000 ^ x4 ^ y4;
      }
      return result ^ x4 ^ y4;
    };

    const F = (x: number, y: number, z: number): number => (x & y) | (~x & z);
    const G = (x: number, y: number, z: number): number => (x & z) | (y & ~z);
    const H = (x: number, y: number, z: number): number => x ^ y ^ z;
    const I = (x: number, y: number, z: number): number => y ^ (x | ~z);

    const FF = (
      a: number,
      b: number,
      c: number,
      d: number,
      x: number,
      s: number,
      ac: number
    ): number => addUnsigned(rotateLeft(addUnsigned(addUnsigned(a, F(b, c, d)), addUnsigned(x, ac)), s), b);

    const GG = (
      a: number,
      b: number,
      c: number,
      d: number,
      x: number,
      s: number,
      ac: number
    ): number => addUnsigned(rotateLeft(addUnsigned(addUnsigned(a, G(b, c, d)), addUnsigned(x, ac)), s), b);

    const HH = (
      a: number,
      b: number,
      c: number,
      d: number,
      x: number,
      s: number,
      ac: number
    ): number => addUnsigned(rotateLeft(addUnsigned(addUnsigned(a, H(b, c, d)), addUnsigned(x, ac)), s), b);

    const II = (
      a: number,
      b: number,
      c: number,
      d: number,
      x: number,
      s: number,
      ac: number
    ): number => addUnsigned(rotateLeft(addUnsigned(addUnsigned(a, I(b, c, d)), addUnsigned(x, ac)), s), b);

    const convertToWordArray = (str: string): number[] => {
      const lWordCount = ((str.length + 8) >>> 6) + 1;
      const lNumberOfWords = lWordCount * 16;
      const lWordArray: number[] = new Array(lNumberOfWords - 1).fill(0);
      let lBytePosition = 0;
      let lByteCount = 0;

      while (lByteCount < str.length) {
        const lWordPosition = (lByteCount - (lByteCount % 4)) / 4;
        lBytePosition = (lByteCount % 4) * 8;
        lWordArray[lWordPosition] = lWordArray[lWordPosition] | (str.charCodeAt(lByteCount) << lBytePosition);
        lByteCount++;
      }

      const lWordPosition = (lByteCount - (lByteCount % 4)) / 4;
      lBytePosition = (lByteCount % 4) * 8;
      lWordArray[lWordPosition] = lWordArray[lWordPosition] | (0x80 << lBytePosition);
      lWordArray[lNumberOfWords - 2] = str.length << 3;
      lWordArray[lNumberOfWords - 1] = str.length >>> 29;

      return lWordArray;
    };

    const wordToHex = (lValue: number): string => {
      let result = '';
      for (let lCount = 0; lCount <= 3; lCount++) {
        const lByte = (lValue >>> (lCount * 8)) & 255;
        result += ('0' + lByte.toString(16)).slice(-2);
      }
      return result;
    };

    const x = convertToWordArray(str);
    let a = 0x67452301;
    let b = 0xefcdab89;
    let c = 0x98badcfe;
    let d = 0x10325476;

    const S11 = 7, S12 = 12, S13 = 17, S14 = 22;
    const S21 = 5, S22 = 9, S23 = 14, S24 = 20;
    const S31 = 4, S32 = 11, S33 = 16, S34 = 23;
    const S41 = 6, S42 = 10, S43 = 15, S44 = 21;

    for (let k = 0; k < x.length; k += 16) {
      const AA = a, BB = b, CC = c, DD = d;

      a = FF(a, b, c, d, x[k + 0], S11, 0xd76aa478);
      d = FF(d, a, b, c, x[k + 1], S12, 0xe8c7b756);
      c = FF(c, d, a, b, x[k + 2], S13, 0x242070db);
      b = FF(b, c, d, a, x[k + 3], S14, 0xc1bdceee);
      a = FF(a, b, c, d, x[k + 4], S11, 0xf57c0faf);
      d = FF(d, a, b, c, x[k + 5], S12, 0x4787c62a);
      c = FF(c, d, a, b, x[k + 6], S13, 0xa8304613);
      b = FF(b, c, d, a, x[k + 7], S14, 0xfd469501);
      a = FF(a, b, c, d, x[k + 8], S11, 0x698098d8);
      d = FF(d, a, b, c, x[k + 9], S12, 0x8b44f7af);
      c = FF(c, d, a, b, x[k + 10], S13, 0xffff5bb1);
      b = FF(b, c, d, a, x[k + 11], S14, 0x895cd7be);
      a = FF(a, b, c, d, x[k + 12], S11, 0x6b901122);
      d = FF(d, a, b, c, x[k + 13], S12, 0xfd987193);
      c = FF(c, d, a, b, x[k + 14], S13, 0xa679438e);
      b = FF(b, c, d, a, x[k + 15], S14, 0x49b40821);

      a = GG(a, b, c, d, x[k + 1], S21, 0xf61e2562);
      d = GG(d, a, b, c, x[k + 6], S22, 0xc040b340);
      c = GG(c, d, a, b, x[k + 11], S23, 0x265e5a51);
      b = GG(b, c, d, a, x[k + 0], S24, 0xe9b6c7aa);
      a = GG(a, b, c, d, x[k + 5], S21, 0xd62f105d);
      d = GG(d, a, b, c, x[k + 10], S22, 0x2441453);
      c = GG(c, d, a, b, x[k + 15], S23, 0xd8a1e681);
      b = GG(b, c, d, a, x[k + 4], S24, 0xe7d3fbc8);
      a = GG(a, b, c, d, x[k + 9], S21, 0x21e1cde6);
      d = GG(d, a, b, c, x[k + 14], S22, 0xc33707d6);
      c = GG(c, d, a, b, x[k + 3], S23, 0xf4d50d87);
      b = GG(b, c, d, a, x[k + 8], S24, 0x455a14ed);
      a = GG(a, b, c, d, x[k + 13], S21, 0xa9e3e905);
      d = GG(d, a, b, c, x[k + 2], S22, 0xfcefa3f8);
      c = GG(c, d, a, b, x[k + 7], S23, 0x676f02d9);
      b = GG(b, c, d, a, x[k + 12], S24, 0x8d2a4c8a);

      a = HH(a, b, c, d, x[k + 5], S31, 0xfffa3942);
      d = HH(d, a, b, c, x[k + 8], S32, 0x8771f681);
      c = HH(c, d, a, b, x[k + 11], S33, 0x6d9d6122);
      b = HH(b, c, d, a, x[k + 14], S34, 0xfde5380c);
      a = HH(a, b, c, d, x[k + 1], S31, 0xa4beea44);
      d = HH(d, a, b, c, x[k + 4], S32, 0x4bdecfa9);
      c = HH(c, d, a, b, x[k + 7], S33, 0xf6bb4b60);
      b = HH(b, c, d, a, x[k + 10], S34, 0xbebfbc70);
      a = HH(a, b, c, d, x[k + 13], S31, 0x289b7ec6);
      d = HH(d, a, b, c, x[k + 0], S32, 0xeaa127fa);
      c = HH(c, d, a, b, x[k + 3], S33, 0xd4ef3085);
      b = HH(b, c, d, a, x[k + 6], S34, 0x4881d05);
      a = HH(a, b, c, d, x[k + 9], S31, 0xd9d4d039);
      d = HH(d, a, b, c, x[k + 12], S32, 0xe6db99e5);
      c = HH(c, d, a, b, x[k + 15], S33, 0x1fa27cf8);
      b = HH(b, c, d, a, x[k + 2], S34, 0xc4ac5665);

      a = II(a, b, c, d, x[k + 0], S41, 0xf4292244);
      d = II(d, a, b, c, x[k + 7], S42, 0x432aff97);
      c = II(c, d, a, b, x[k + 14], S43, 0xab9423a7);
      b = II(b, c, d, a, x[k + 5], S44, 0xfc93a039);
      a = II(a, b, c, d, x[k + 12], S41, 0x655b59c3);
      d = II(d, a, b, c, x[k + 3], S42, 0x8f0ccc92);
      c = II(c, d, a, b, x[k + 10], S43, 0xffeff47d);
      b = II(b, c, d, a, x[k + 1], S44, 0x85845dd1);
      a = II(a, b, c, d, x[k + 8], S41, 0x6fa87e4f);
      d = II(d, a, b, c, x[k + 15], S42, 0xfe2ce6e0);
      c = II(c, d, a, b, x[k + 6], S43, 0xa3014314);
      b = II(b, c, d, a, x[k + 13], S44, 0x4e0811a1);
      a = II(a, b, c, d, x[k + 4], S41, 0xf7537e82);
      d = II(d, a, b, c, x[k + 11], S42, 0xbd3af235);
      c = II(c, d, a, b, x[k + 2], S43, 0x2ad7d2bb);
      b = II(b, c, d, a, x[k + 9], S44, 0xeb86d391);

      a = addUnsigned(a, AA);
      b = addUnsigned(b, BB);
      c = addUnsigned(c, CC);
      d = addUnsigned(d, DD);
    }

    return wordToHex(a) + wordToHex(b) + wordToHex(c) + wordToHex(d);
  };

  const hash = md5(text);
  return options.uppercase ? hash.toUpperCase() : hash.toLowerCase();
};

// ==================== 批量生成工具 ====================

/**
 * 批量生成
 * @param generator 生成器函数
 * @param count 生成数量 (1-100)
 */
export const generateBatch = <T>(generator: () => T, count: number): T[] => {
  const safeCount = Math.min(100, Math.max(1, count));
  return Array.from({ length: safeCount }, () => generator());
};
