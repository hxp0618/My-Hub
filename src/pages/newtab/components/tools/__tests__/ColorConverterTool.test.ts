import { describe, expect, it } from 'vitest';
import {
  calculateContrastRatio,
  hexToRgb,
  hexToRgba,
  parseHslString,
  parseRgbChannel,
  parseRgbString,
  parseRgbaString,
  rgbaToHex,
} from '../ColorConverterTool';

describe('ColorConverterTool parsers', () => {
  it('accepts long and shorthand hex colors', () => {
    expect(hexToRgb('#3b82f6')).toEqual({ r: 59, g: 130, b: 246 });
    expect(hexToRgb('#fff')).toEqual({ r: 255, g: 255, b: 255 });
    expect(hexToRgb('0f8')).toEqual({ r: 0, g: 255, b: 136 });
  });

  it('accepts plain and CSS rgb input', () => {
    expect(parseRgbString('59, 130, 246')).toEqual({ r: 59, g: 130, b: 246 });
    expect(parseRgbString('rgb(59, 130, 246)')).toEqual({ r: 59, g: 130, b: 246 });
  });

  it('rejects invalid rgb channels', () => {
    expect(parseRgbString('rgb(256, 0, 0)')).toBeNull();
    expect(parseRgbString('rgb(1.5, 0, 0)')).toBeNull();
    expect(parseRgbString('rgb(1, 2)')).toBeNull();
  });

  it('strictly parses RGB channel values for UI controls', () => {
    expect(parseRgbChannel('128')).toBe(128);
    expect(parseRgbChannel(' 255 ')).toBe(255);
    expect(parseRgbChannel('999')).toBe(255);
    expect(parseRgbChannel('-1', 12)).toBe(12);
    expect(parseRgbChannel('12abc', 64)).toBe(64);
    expect(parseRgbChannel('12.5', 64)).toBe(64);
    expect(parseRgbChannel(Number.NaN, 64)).toBe(64);
  });

  it('accepts plain and CSS hsl input', () => {
    expect(parseHslString('217, 91%, 60%')).toEqual({ h: 217, s: 91, l: 60 });
    expect(parseHslString('hsl(217, 91%, 60%)')).toEqual({ h: 217, s: 91, l: 60 });
  });

  it('rejects invalid hsl channels', () => {
    expect(parseHslString('hsl(361, 50%, 50%)')).toBeNull();
    expect(parseHslString('hsl(120, 101%, 50%)')).toBeNull();
    expect(parseHslString('hsl(120, 50.5%, 50%)')).toBeNull();
  });

  it('parses and formats alpha-aware colors', () => {
    expect(hexToRgba('#3b82f680')).toEqual({ r: 59, g: 130, b: 246, a: 0.5 });
    expect(hexToRgba('#0f8c')).toEqual({ r: 0, g: 255, b: 136, a: 0.8 });
    expect(parseRgbaString('rgba(59, 130, 246, 0.5)')).toEqual({ r: 59, g: 130, b: 246, a: 0.5 });
    expect(rgbaToHex({ r: 59, g: 130, b: 246, a: 0.5 })).toBe('#3b82f680');
  });

  it('calculates WCAG contrast ratios', () => {
    expect(calculateContrastRatio({ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 })).toBe(21);
    expect(calculateContrastRatio({ r: 255, g: 255, b: 255 }, { r: 255, g: 255, b: 255 })).toBe(1);
  });
});
