import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TextCryptorTool } from '../TextCryptorTool';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => ({
      'tools.textCryptor.encrypt': 'Encrypt',
      'tools.textCryptor.decrypt': 'Decrypt',
      'tools.textCryptor.inputPlaintext': 'Plaintext',
      'tools.textCryptor.inputCiphertext': 'Ciphertext',
      'tools.textCryptor.plaintextPlaceholder': 'Enter text to encrypt...',
      'tools.textCryptor.ciphertextPlaceholder': 'Enter ciphertext to decrypt...',
      'tools.textCryptor.password': 'Password',
      'tools.textCryptor.passwordPlaceholder': 'Enter encryption/decryption password',
      'tools.textCryptor.outputCiphertext': 'Encrypted Result',
      'tools.textCryptor.outputPlaintext': 'Decrypted Result',
      'tools.textCryptor.copy': 'Copy',
      'tools.textCryptor.clear': 'Clear',
      'tools.textCryptor.emptyInput': 'Please enter text',
      'tools.textCryptor.emptyPassword': 'Please enter password',
      'tools.textCryptor.encryptError': 'Encryption failed',
      'tools.textCryptor.decryptError': 'Decryption failed, please check password',
      'tools.textCryptor.securityNote': 'All encryption/decryption operations are performed locally',
      'tools.textCryptor.algorithm': 'Algorithm',
      'tools.textCryptor.mode': 'Mode',
    }[key] ?? key),
  }),
}));

vi.mock('../../../../../hooks/useCopyToClipboard', () => ({
  useCopyToClipboard: () => ({
    copy: vi.fn(),
  }),
}));

describe('TextCryptorTool', () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('shows localized validation errors for empty input and password', () => {
    render(<TextCryptorTool isExpanded onToggleExpand={vi.fn()} />);

    fireEvent.click(screen.getAllByRole('button', { name: 'Encrypt' }).at(-1)!);
    expect(screen.getByText('Please enter text')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('Enter text to encrypt...'), {
      target: { value: 'hello' },
    });
    fireEvent.click(screen.getAllByRole('button', { name: 'Encrypt' }).at(-1)!);
    expect(screen.getByText('Please enter password')).toBeInTheDocument();
  });

  it('maps decrypt failures to localized text instead of raw service errors', () => {
    render(<TextCryptorTool isExpanded onToggleExpand={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Decrypt' }));
    fireEvent.change(screen.getByPlaceholderText('Enter ciphertext to decrypt...'), {
      target: { value: 'not-a-valid-ciphertext' },
    });
    fireEvent.change(screen.getByPlaceholderText('Enter encryption/decryption password'), {
      target: { value: 'wrong-password' },
    });
    fireEvent.click(screen.getAllByRole('button', { name: 'Decrypt' }).at(-1)!);

    expect(screen.getByText('Decryption failed, please check password')).toBeInTheDocument();
    expect(screen.queryByText(/Invalid password or corrupted data/)).not.toBeInTheDocument();
  });
});
