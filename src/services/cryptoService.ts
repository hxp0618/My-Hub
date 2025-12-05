import CryptoJS from 'crypto-js';

/**
 * 支持的加密算法
 */
export type Algorithm = 'AES-256' | 'AES-128' | 'DES' | 'TripleDES';

/**
 * AES 加密模式
 */
export type AESMode = 'CBC' | 'ECB' | 'CTR';

/**
 * 加密选项
 */
export interface EncryptOptions {
  /** 加密算法 */
  algorithm: Algorithm;
  /** AES 加密模式（仅 AES 算法使用） */
  mode?: AESMode;
  /** 密码 */
  password: string;
}

/**
 * 解析后的加密数据
 */
export interface EncryptedData {
  /** 使用的算法 */
  algorithm: Algorithm;
  /** AES 模式（如果适用） */
  mode?: AESMode;
  /** 密文 */
  ciphertext: string;
}

/**
 * 加密输出格式分隔符
 */
const SEPARATOR = ':';

/**
 * 获取 CryptoJS 加密模式
 */
function getCryptoMode(mode: AESMode): CryptoJS.Mode {
  switch (mode) {
    case 'CBC':
      return CryptoJS.mode.CBC;
    case 'ECB':
      return CryptoJS.mode.ECB;
    case 'CTR':
      return CryptoJS.mode.CTR;
    default:
      return CryptoJS.mode.CBC;
  }
}

/**
 * 加密服务
 * 
 * 提供多种加密算法支持，包括 AES-256、AES-128、DES、Triple DES
 * 加密输出包含算法标识，便于解密时自动识别
 */
export class CryptoService {
  /**
   * 获取支持的加密算法列表
   */
  static getSupportedAlgorithms(): Algorithm[] {
    return ['AES-256', 'AES-128', 'DES', 'TripleDES'];
  }

  /**
   * 获取支持的 AES 模式列表
   */
  static getSupportedAESModes(): AESMode[] {
    return ['CBC', 'ECB', 'CTR'];
  }

  /**
   * 检查算法是否为 AES 类型
   */
  static isAESAlgorithm(algorithm: Algorithm): boolean {
    return algorithm === 'AES-256' || algorithm === 'AES-128';
  }

  /**
   * 加密文本
   * 
   * @param plaintext 明文
   * @param options 加密选项
   * @returns 加密后的字符串（包含算法标识）
   * 
   * @example
   * ```ts
   * const encrypted = CryptoService.encrypt('Hello', {
   *   algorithm: 'AES-256',
   *   mode: 'CBC',
   *   password: 'secret',
   * });
   * // 输出: "AES-256:CBC:U2FsdGVkX1..."
   * ```
   */
  static encrypt(plaintext: string, options: EncryptOptions): string {
    const { algorithm, mode = 'CBC', password } = options;

    if (!plaintext) {
      throw new Error('Plaintext cannot be empty');
    }

    if (!password) {
      throw new Error('Password cannot be empty');
    }

    let ciphertext: string;

    try {
      switch (algorithm) {
        case 'AES-256':
        case 'AES-128': {
          const cryptoMode = getCryptoMode(mode);
          const keySize = algorithm === 'AES-256' ? 256 / 32 : 128 / 32;
          const key = CryptoJS.PBKDF2(password, CryptoJS.lib.WordArray.random(128 / 8), {
            keySize,
            iterations: 1000,
          });
          
          // 使用简化的加密方式，让 CryptoJS 自动处理 key 和 iv
          const encrypted = CryptoJS.AES.encrypt(plaintext, password, {
            mode: cryptoMode,
            padding: CryptoJS.pad.Pkcs7,
          });
          ciphertext = encrypted.toString();
          break;
        }

        case 'DES': {
          const encrypted = CryptoJS.DES.encrypt(plaintext, password);
          ciphertext = encrypted.toString();
          break;
        }

        case 'TripleDES': {
          const encrypted = CryptoJS.TripleDES.encrypt(plaintext, password);
          ciphertext = encrypted.toString();
          break;
        }

        default:
          throw new Error(`Unsupported algorithm: ${algorithm}`);
      }
    } catch (e) {
      throw new Error(`Encryption failed: ${e instanceof Error ? e.message : String(e)}`);
    }

    // 构建输出格式：algorithm:mode:ciphertext 或 algorithm:ciphertext
    if (this.isAESAlgorithm(algorithm)) {
      return `${algorithm}${SEPARATOR}${mode}${SEPARATOR}${ciphertext}`;
    }
    return `${algorithm}${SEPARATOR}${ciphertext}`;
  }

  /**
   * 解密文本
   * 
   * @param encryptedText 加密的字符串（包含算法标识）
   * @param password 密码
   * @returns 解密后的明文
   * 
   * @example
   * ```ts
   * const decrypted = CryptoService.decrypt('AES-256:CBC:U2FsdGVkX1...', 'secret');
   * // 输出: "Hello"
   * ```
   */
  static decrypt(encryptedText: string, password: string): string {
    if (!encryptedText) {
      throw new Error('Encrypted text cannot be empty');
    }

    if (!password) {
      throw new Error('Password cannot be empty');
    }

    const parsed = this.parseEncryptedData(encryptedText);
    
    if (!parsed) {
      // 尝试作为旧格式（纯 AES）解密
      try {
        const bytes = CryptoJS.AES.decrypt(encryptedText, password);
        const decrypted = bytes.toString(CryptoJS.enc.Utf8);
        if (!decrypted) {
          throw new Error('Decryption failed: Invalid password or corrupted data');
        }
        return decrypted;
      } catch (e) {
        throw new Error('Decryption failed: Invalid format or password');
      }
    }

    const { algorithm, mode = 'CBC', ciphertext } = parsed;

    try {
      let decrypted: string;

      switch (algorithm) {
        case 'AES-256':
        case 'AES-128': {
          const cryptoMode = getCryptoMode(mode);
          const bytes = CryptoJS.AES.decrypt(ciphertext, password, {
            mode: cryptoMode,
            padding: CryptoJS.pad.Pkcs7,
          });
          decrypted = bytes.toString(CryptoJS.enc.Utf8);
          break;
        }

        case 'DES': {
          const bytes = CryptoJS.DES.decrypt(ciphertext, password);
          decrypted = bytes.toString(CryptoJS.enc.Utf8);
          break;
        }

        case 'TripleDES': {
          const bytes = CryptoJS.TripleDES.decrypt(ciphertext, password);
          decrypted = bytes.toString(CryptoJS.enc.Utf8);
          break;
        }

        default:
          throw new Error(`Unsupported algorithm: ${algorithm}`);
      }

      if (!decrypted) {
        throw new Error('Decryption failed: Invalid password or corrupted data');
      }

      return decrypted;
    } catch (e) {
      if (e instanceof Error && e.message.includes('Decryption failed')) {
        throw e;
      }
      throw new Error(`Decryption failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  /**
   * 解析加密数据格式
   * 
   * @param encryptedText 加密的字符串
   * @returns 解析后的数据，如果格式无效则返回 null
   */
  static parseEncryptedData(encryptedText: string): EncryptedData | null {
    if (!encryptedText) {
      return null;
    }

    const parts = encryptedText.split(SEPARATOR);
    
    if (parts.length < 2) {
      return null;
    }

    const algorithm = parts[0] as Algorithm;
    
    // 验证算法是否有效
    if (!this.getSupportedAlgorithms().includes(algorithm)) {
      return null;
    }

    if (this.isAESAlgorithm(algorithm)) {
      // AES 格式：algorithm:mode:ciphertext
      if (parts.length < 3) {
        return null;
      }
      const mode = parts[1] as AESMode;
      if (!this.getSupportedAESModes().includes(mode)) {
        return null;
      }
      // 密文可能包含分隔符，所以需要重新组合
      const ciphertext = parts.slice(2).join(SEPARATOR);
      return { algorithm, mode, ciphertext };
    }

    // DES/TripleDES 格式：algorithm:ciphertext
    const ciphertext = parts.slice(1).join(SEPARATOR);
    return { algorithm, ciphertext };
  }

  /**
   * 检测加密文本使用的算法
   * 
   * @param encryptedText 加密的字符串
   * @returns 算法名称，如果无法检测则返回 null
   */
  static detectAlgorithm(encryptedText: string): Algorithm | null {
    const parsed = this.parseEncryptedData(encryptedText);
    return parsed?.algorithm ?? null;
  }
}

export default CryptoService;
