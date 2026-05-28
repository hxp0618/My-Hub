import { describe, expect, it } from 'vitest';
import { Algorithm, CryptoService } from '../cryptoService';

describe('CryptoService stable errors', () => {
  it('round-trips encrypted text with the selected algorithm and mode', () => {
    const encrypted = CryptoService.encrypt('hello my hub', {
      algorithm: 'AES-256',
      mode: 'CBC',
      password: 'secret',
    });

    expect(encrypted).not.toBe('hello my hub');
    expect(CryptoService.decrypt(encrypted, 'secret', {
      algorithm: 'AES-256',
      mode: 'CBC',
    })).toBe('hello my hub');
  });

  it('rejects unsupported algorithms with a stable error code', () => {
    const unsupportedAlgorithm = 'ChaCha20' as unknown as Algorithm;

    expect(() => CryptoService.encrypt('hello', {
      algorithm: unsupportedAlgorithm,
      password: 'secret',
    })).toThrow('unsupportedAlgorithm');
  });

  it('hides low-level decrypt failure details behind a stable error code', () => {
    const encrypted = CryptoService.encrypt('private note', {
      algorithm: 'AES-256',
      mode: 'CBC',
      password: 'secret',
    });

    expect(() => CryptoService.decrypt(encrypted, 'wrong password', {
      algorithm: 'AES-256',
      mode: 'CBC',
    })).toThrow('decryptFailed');
  });

  it('rejects malformed ciphertext before decrypting accidental plaintext', () => {
    expect(() => CryptoService.decrypt('not-a-valid-ciphertext', 'wrong password', {
      algorithm: 'AES-256',
      mode: 'CBC',
    })).toThrow('decryptFailed');
  });

  it('uses stable validation errors for missing inputs', () => {
    expect(() => CryptoService.encrypt('', {
      algorithm: 'AES-256',
      password: 'secret',
    })).toThrow('emptyPlaintext');

    expect(() => CryptoService.decrypt('', 'secret')).toThrow('emptyEncryptedText');
    expect(() => CryptoService.decrypt('ciphertext', '')).toThrow('emptyPassword');
  });
});
