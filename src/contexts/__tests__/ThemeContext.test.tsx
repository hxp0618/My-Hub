import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_BRIGHTNESS,
  ThemeProvider,
  parseStoredBrightness,
  sanitizeBrightnessInput,
  useTheme,
} from '../ThemeContext';

const BrightnessProbe = () => {
  const { brightness, setBrightness } = useTheme();

  return (
    <div>
      <span data-testid="brightness">{brightness}</span>
      <button type="button" onClick={() => setBrightness(Number.NaN)}>set invalid</button>
      <button type="button" onClick={() => setBrightness(0.2)}>set low</button>
    </div>
  );
};

describe('ThemeContext brightness handling', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.style.filter = '';
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query.includes('dark'),
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    document.documentElement.style.filter = '';
  });

  it('parses only strict finite brightness values from storage', () => {
    expect(parseStoredBrightness('0.75')).toBe(0.75);
    expect(parseStoredBrightness('0.75px')).toBe(DEFAULT_BRIGHTNESS);
    expect(parseStoredBrightness('Infinity')).toBe(DEFAULT_BRIGHTNESS);
    expect(parseStoredBrightness(null)).toBe(DEFAULT_BRIGHTNESS);
  });

  it('sanitizes brightness values before saving and applying them', async () => {
    localStorage.setItem('brightness', '0.75px');

    render(
      <ThemeProvider>
        <BrightnessProbe />
      </ThemeProvider>
    );

    expect(screen.getByTestId('brightness')).toHaveTextContent('1');
    expect(document.documentElement.style.filter).toBe('');

    fireEvent.click(screen.getByRole('button', { name: 'set low' }));
    await waitFor(() => expect(screen.getByTestId('brightness')).toHaveTextContent('0.5'));
    expect(localStorage.getItem('brightness')).toBe('0.5');
    expect(document.documentElement.style.filter).toBe('brightness(0.5)');

    fireEvent.click(screen.getByRole('button', { name: 'set invalid' }));
    await waitFor(() => expect(screen.getByTestId('brightness')).toHaveTextContent('1'));
    expect(localStorage.getItem('brightness')).toBe('1');
    expect(document.documentElement.style.filter).toBe('');
  });

  it('clamps finite brightness inputs into the supported range', () => {
    expect(sanitizeBrightnessInput(0.2)).toBe(0.5);
    expect(sanitizeBrightnessInput(0.8)).toBe(0.8);
    expect(sanitizeBrightnessInput(2)).toBe(1);
    expect(sanitizeBrightnessInput(Number.NaN)).toBe(DEFAULT_BRIGHTNESS);
  });
});
