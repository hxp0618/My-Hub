import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ToolCard } from '../../../../components/ToolCard';
import { TOOL_METADATA, ToolId, ToolComponentProps } from '../../../../types/tools';
import { useCopyToClipboard } from '../../../../hooks/useCopyToClipboard';
import { useToolInvocation } from '../../../../hooks/useToolInvocation';

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface RGBA extends RGB {
  a: number;
}

export interface HSL {
  h: number;
  s: number;
  l: number;
}

export const parseRgbChannel = (value: string | number, fallback = 0): number => {
  const safeFallback = Number.isSafeInteger(fallback)
    ? Math.min(255, Math.max(0, fallback))
    : 0;

  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value)) return safeFallback;
    return Math.min(255, Math.max(0, value));
  }

  const trimmedValue = value.trim();
  if (!/^\d+$/.test(trimmedValue)) return safeFallback;

  const parsedValue = Number(trimmedValue);
  return Number.isSafeInteger(parsedValue)
    ? Math.min(255, Math.max(0, parsedValue))
    : safeFallback;
};

const parseAlphaChannel = (value: string | number, fallback = 1): number => {
  const safeFallback = Number.isFinite(fallback)
    ? Math.min(1, Math.max(0, fallback))
    : 1;

  const parsedValue = typeof value === 'number' ? value : Number(value.trim());
  if (!Number.isFinite(parsedValue) || parsedValue < 0 || parsedValue > 1) {
    return safeFallback;
  }

  return Number(parsedValue.toFixed(2));
};

/**
 * HEX 转 RGBA
 */
export const hexToRgba = (hex: string): RGBA | null => {
  const normalizedHex = hex.trim().replace(/^#/, '');
  const expandedHex = (normalizedHex.length === 3 || normalizedHex.length === 4)
    ? normalizedHex.split('').map(char => `${char}${char}`).join('')
    : normalizedHex;
  const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})?$/i.exec(expandedHex);
  if (!result) return null;
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
    a: result[4] ? Number((parseInt(result[4], 16) / 255).toFixed(2)) : 1,
  };
};

/**
 * HEX 转 RGB
 */
export const hexToRgb = (hex: string): RGB | null => {
  const rgba = hexToRgba(hex);
  if (!rgba) return null;
  return { r: rgba.r, g: rgba.g, b: rgba.b };
};

/**
 * RGB 转 HEX
 */
export const rgbToHex = (rgb: RGB): string => {
  const toHex = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
};

/**
 * RGBA 转 8 位 HEX
 */
export const rgbaToHex = (rgba: RGBA): string => {
  const alphaHex = Math.round(parseAlphaChannel(rgba.a) * 255)
    .toString(16)
    .padStart(2, '0');
  return `${rgbToHex(rgba)}${alphaHex}`;
};

const rgbaToCss = (rgba: RGBA): string => `rgba(${rgba.r}, ${rgba.g}, ${rgba.b}, ${rgba.a})`;

/**
 * RGB 转 HSL
 */
export const rgbToHsl = (rgb: RGB): HSL => {
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  if (max === min) {
    return { h: 0, s: 0, l: Math.round(l * 100) };
  }

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

  let h = 0;
  switch (max) {
    case r:
      h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
      break;
    case g:
      h = ((b - r) / d + 2) / 6;
      break;
    case b:
      h = ((r - g) / d + 4) / 6;
      break;
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
};

/**
 * HSL 转 RGB
 */
export const hslToRgb = (hsl: HSL): RGB => {
  const h = hsl.h / 360;
  const s = hsl.s / 100;
  const l = hsl.l / 100;

  if (s === 0) {
    const val = Math.round(l * 255);
    return { r: val, g: val, b: val };
  }

  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;

  return {
    r: Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
    g: Math.round(hue2rgb(p, q, h) * 255),
    b: Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
  };
};

/**
 * 解析 RGB 字符串
 */
export const parseRgbString = (str: string): RGB | null => {
  const normalized = str.trim().replace(/^rgb\(\s*/i, '').replace(/\s*\)$/, '');
  const match = normalized.match(/^(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})$/);
  if (!match) return null;
  if (match.slice(1).some(channel => Number(channel) > 255)) return null;
  const r = parseRgbChannel(match[1]);
  const g = parseRgbChannel(match[2]);
  const b = parseRgbChannel(match[3]);
  return { r, g, b };
};

/**
 * 解析 RGBA 字符串
 */
export const parseRgbaString = (str: string): RGBA | null => {
  const normalized = str.trim().replace(/^rgba\(\s*/i, '').replace(/\s*\)$/, '');
  const match = normalized.match(/^(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(0(?:\.\d+)?|1(?:\.0+)?)$/);
  if (!match) return null;
  if (match.slice(1, 4).some(channel => Number(channel) > 255)) return null;

  return {
    r: parseRgbChannel(match[1]),
    g: parseRgbChannel(match[2]),
    b: parseRgbChannel(match[3]),
    a: parseAlphaChannel(match[4]),
  };
};

/**
 * 解析 HSL 字符串
 */
export const parseHslString = (str: string): HSL | null => {
  const normalized = str.trim().replace(/^hsl\(\s*/i, '').replace(/\s*\)$/, '');
  const match = normalized.match(/^(\d{1,3})\s*,\s*(\d{1,3})%?\s*,\s*(\d{1,3})%?$/);
  if (!match) return null;
  const h = parseInt(match[1], 10);
  const s = parseInt(match[2], 10);
  const l = parseInt(match[3], 10);
  if (h > 360 || s > 100 || l > 100) return null;
  return { h, s, l };
};

const getRelativeLuminance = (rgb: RGB): number => {
  const channels = [rgb.r, rgb.g, rgb.b].map(channel => {
    const value = channel / 255;
    return value <= 0.03928
      ? value / 12.92
      : ((value + 0.055) / 1.055) ** 2.4;
  });

  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
};

export const calculateContrastRatio = (foreground: RGB, background: RGB): number => {
  const foregroundLuminance = getRelativeLuminance(foreground);
  const backgroundLuminance = getRelativeLuminance(background);
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);

  return Number(((lighter + 0.05) / (darker + 0.05)).toFixed(2));
};

const blendRgbaOverRgb = (foreground: RGBA, background: RGB): RGB => ({
  r: Math.round(foreground.r * foreground.a + background.r * (1 - foreground.a)),
  g: Math.round(foreground.g * foreground.a + background.g * (1 - foreground.a)),
  b: Math.round(foreground.b * foreground.a + background.b * (1 - foreground.a)),
});

const getContrastLabelKey = (ratio: number): string => {
  if (ratio >= 7) return 'tools.colorConverter.contrastAAA';
  if (ratio >= 4.5) return 'tools.colorConverter.contrastAA';
  if (ratio >= 3) return 'tools.colorConverter.contrastLargeText';
  return 'tools.colorConverter.contrastFail';
};

/**
 * 颜色转换器工具组件
 */
export const ColorConverterTool: React.FC<ToolComponentProps> = ({
  isExpanded,
  onToggleExpand,
  invocation,
  onInvocationHandled,
}) => {
  const { t } = useTranslation();
  const { copy } = useCopyToClipboard();
  const [hex, setHex] = useState('#3b82f6');
  const [rgb, setRgb] = useState<RGB>({ r: 59, g: 130, b: 246 });
  const [alpha, setAlpha] = useState(1);
  const [hsl, setHsl] = useState<HSL>({ h: 217, s: 91, l: 60 });
  const [contrastBackground, setContrastBackground] = useState<RGB>({ r: 255, g: 255, b: 255 });
  const [error, setError] = useState<string | null>(null);
  const [, setActiveInput] = useState<'hex' | 'rgb' | 'rgba' | 'hsl' | 'picker' | 'alpha'>('hex');

  const currentRgba: RGBA = { ...rgb, a: alpha };
  const colorCss = rgbaToCss(currentRgba);
  const contrastForeground = alpha < 1 ? blendRgbaOverRgb(currentRgba, contrastBackground) : rgb;
  const contrastRatio = calculateContrastRatio(contrastForeground, contrastBackground);
  const contrastBackgroundHex = rgbToHex(contrastBackground);
  const displayHex = alpha < 1 ? rgbaToHex(currentRgba) : rgbToHex(rgb);

  // 从 HEX 更新其他值
  const updateFromHex = useCallback((value: string) => {
    const parsed = hexToRgba(value);
    if (parsed) {
      const rgbValue = { r: parsed.r, g: parsed.g, b: parsed.b };
      setHex(parsed.a < 1 ? rgbaToHex(parsed) : rgbToHex(parsed));
      setRgb(rgbValue);
      setAlpha(parsed.a);
      setHsl(rgbToHsl(rgbValue));
      setError(null);
    } else {
      setError(t('tools.colorConverter.invalidFormat'));
    }
  }, [t]);

  // 从 RGB 更新其他值
  const updateFromRgb = useCallback((value: RGB) => {
    setHex(alpha < 1 ? rgbaToHex({ ...value, a: alpha }) : rgbToHex(value));
    setHsl(rgbToHsl(value));
    setError(null);
  }, [alpha]);

  // 从 HSL 更新其他值
  const updateFromHsl = useCallback((value: HSL) => {
    const rgbValue = hslToRgb(value);
    setRgb(rgbValue);
    setHex(alpha < 1 ? rgbaToHex({ ...rgbValue, a: alpha }) : rgbToHex(rgbValue));
    setError(null);
  }, [alpha]);

  // 处理 HEX 输入
  const handleHexChange = (value: string) => {
    setHex(value);
    setActiveInput('hex');
    const normalizedLength = value.trim().replace(/^#/, '').length;
    if ([3, 4, 6, 8].includes(normalizedLength)) {
      updateFromHex(value);
    }
  };

  // 处理 RGB 输入
  const handleRgbChange = (value: string) => {
    setActiveInput('rgb');
    const parsed = parseRgbString(value);
    if (parsed) {
      setRgb(parsed);
      updateFromRgb(parsed);
    } else {
      setError(t('tools.colorConverter.invalidFormat'));
    }
  };

  // 处理 RGBA 输入
  const handleRgbaChange = (value: string) => {
    setActiveInput('rgba');
    const parsed = parseRgbaString(value);
    if (parsed) {
      const rgbValue = { r: parsed.r, g: parsed.g, b: parsed.b };
      setRgb(rgbValue);
      setAlpha(parsed.a);
      setHex(parsed.a < 1 ? rgbaToHex(parsed) : rgbToHex(parsed));
      setHsl(rgbToHsl(rgbValue));
      setError(null);
    } else {
      setError(t('tools.colorConverter.invalidFormat'));
    }
  };

  // 处理 HSL 输入
  const handleHslChange = (value: string) => {
    setActiveInput('hsl');
    const parsed = parseHslString(value);
    if (parsed) {
      setHsl(parsed);
      updateFromHsl(parsed);
    } else {
      setError(t('tools.colorConverter.invalidFormat'));
    }
  };

  // 处理颜色选择器
  const handlePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setHex(value);
    setActiveInput('picker');
    updateFromHex(value);
  };

  const handleAlphaChange = (value: string) => {
    const nextAlpha = parseAlphaChannel(Number(value) / 100, alpha);
    setAlpha(nextAlpha);
    setActiveInput('alpha');
    setHex(nextAlpha < 1 ? rgbaToHex({ ...rgb, a: nextAlpha }) : rgbToHex(rgb));
  };

  const handleContrastBackgroundChange = (value: string) => {
    const parsed = hexToRgb(value);
    if (parsed) {
      setContrastBackground(parsed);
      setError(null);
    } else {
      setError(t('tools.colorConverter.invalidFormat'));
    }
  };

  useToolInvocation({
    invocation,
    targetToolId: ToolId.COLOR_CONVERTER,
    onInvocationHandled,
    onApply: useCallback((nextInvocation) => {
      const value = nextInvocation.input.trim();
      const parsedRgba = parseRgbaString(value);
      if (parsedRgba) {
        const rgbValue = { r: parsedRgba.r, g: parsedRgba.g, b: parsedRgba.b };
        setRgb(rgbValue);
        setAlpha(parsedRgba.a);
        setHex(parsedRgba.a < 1 ? rgbaToHex(parsedRgba) : rgbToHex(parsedRgba));
        setHsl(rgbToHsl(rgbValue));
        setError(null);
        return;
      }

      const parsedRgb = parseRgbString(value);
      if (parsedRgb) {
        setRgb(parsedRgb);
        updateFromRgb(parsedRgb);
        return;
      }

      const parsedHsl = parseHslString(value);
      if (parsedHsl) {
        setHsl(parsedHsl);
        updateFromHsl(parsedHsl);
        return;
      }

      updateFromHex(value);
    }, [updateFromHex, updateFromHsl, updateFromRgb]),
  });

  return (
    <ToolCard
      tool={TOOL_METADATA[ToolId.COLOR_CONVERTER]}
      isExpanded={isExpanded}
      onToggleExpand={onToggleExpand}
    >
      <div className="h-full flex flex-col gap-4">
        {/* 颜色预览和选择器 */}
        <div className="flex items-center gap-4 flex-shrink-0">
          <div
            className="w-20 h-20 rounded-lg nb-border shadow-inner"
            style={{ backgroundColor: colorCss }}
          />
          <div className="flex flex-col gap-2">
            <label className="text-sm nb-text-secondary">{t('tools.colorConverter.picker')}</label>
            <input
              type="color"
              value={rgbToHex(rgb)}
              onChange={handlePickerChange}
              className="w-16 h-10 cursor-pointer rounded nb-border"
            />
          </div>
          <div className="flex-1">
            <p className="text-sm nb-text-secondary mb-1">{t('tools.colorConverter.preview')}</p>
            <div className="flex gap-2">
              <div
                className="flex-1 h-8 rounded nb-border"
                style={{ backgroundColor: colorCss }}
              />
              <div
                className="flex-1 h-8 rounded nb-border text-center leading-8 text-sm font-medium"
                style={{ backgroundColor: colorCss, color: hsl.l > 50 ? '#000' : '#fff' }}
              >
                Text
              </div>
            </div>
          </div>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="p-3 nb-bg-card nb-border rounded-lg flex-shrink-0" style={{ borderColor: 'var(--nb-accent-pink)' }}>
            <p className="text-sm" style={{ color: 'var(--color-error-text)' }}>{error}</p>
          </div>
        )}

        {/* 颜色值输入 */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 flex-shrink-0">
          {/* HEX */}
          <div>
            <label className="block text-sm font-medium nb-text mb-2">
              {t('tools.colorConverter.hex')}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={hex}
                onChange={e => handleHexChange(e.target.value)}
                placeholder={t('tools.colorConverter.hexAlphaPlaceholder')}
                className="nb-input flex-1 font-mono text-sm"
              />
              <button
                onClick={() => copy(displayHex)}
                className="nb-btn nb-btn-ghost text-sm"
              >
                {t('tools.colorConverter.copy')}
              </button>
            </div>
          </div>

          {/* RGB */}
          <div>
            <label className="block text-sm font-medium nb-text mb-2">
              {t('tools.colorConverter.rgb')}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={`${rgb.r}, ${rgb.g}, ${rgb.b}`}
                onChange={e => handleRgbChange(e.target.value)}
                placeholder={t('tools.colorConverter.rgbPlaceholder')}
                className="nb-input flex-1 font-mono text-sm"
              />
              <button
                onClick={() => copy(`rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`)}
                className="nb-btn nb-btn-ghost text-sm"
              >
                {t('tools.colorConverter.copy')}
              </button>
            </div>
          </div>

          {/* HSL */}
          <div>
            <label className="block text-sm font-medium nb-text mb-2">
              {t('tools.colorConverter.hsl')}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={`${hsl.h}, ${hsl.s}%, ${hsl.l}%`}
                onChange={e => handleHslChange(e.target.value)}
                placeholder={t('tools.colorConverter.hslPlaceholder')}
                className="nb-input flex-1 font-mono text-sm"
              />
              <button
                onClick={() => copy(`hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`)}
                className="nb-btn nb-btn-ghost text-sm"
              >
                {t('tools.colorConverter.copy')}
              </button>
            </div>
          </div>

          {/* RGBA */}
          <div>
            <label className="block text-sm font-medium nb-text mb-2">
              {t('tools.colorConverter.rgba')}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={`${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha}`}
                onChange={e => handleRgbaChange(e.target.value)}
                placeholder={t('tools.colorConverter.rgbaPlaceholder')}
                className="nb-input flex-1 font-mono text-sm"
              />
              <button
                onClick={() => copy(rgbaToCss(currentRgba))}
                className="nb-btn nb-btn-ghost text-sm"
              >
                {t('tools.colorConverter.copy')}
              </button>
            </div>
          </div>
        </div>

        {/* RGB 滑块 */}
        <div className="space-y-3 flex-shrink-0">
          {(['r', 'g', 'b'] as const).map(channel => (
            <div key={channel} className="flex items-center gap-3">
              <span className="w-6 text-sm font-medium nb-text uppercase">{channel}</span>
              <input
                type="range"
                min={0}
                max={255}
                value={rgb[channel]}
                onChange={e => {
                  const newRgb = { ...rgb, [channel]: parseRgbChannel(e.target.value, rgb[channel]) };
                  setRgb(newRgb);
                  setActiveInput('rgb');
                  updateFromRgb(newRgb);
                }}
                className="flex-1 accent-[var(--nb-accent-yellow)]"
              />
              <span className="w-10 text-sm nb-text-secondary text-right">{rgb[channel]}</span>
            </div>
          ))}
          <div className="flex items-center gap-3">
            <span className="w-6 text-sm font-medium nb-text uppercase">A</span>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(alpha * 100)}
              onChange={e => handleAlphaChange(e.target.value)}
              className="flex-1 accent-[var(--nb-accent-yellow)]"
            />
            <span className="w-10 text-sm nb-text-secondary text-right">{Math.round(alpha * 100)}%</span>
          </div>
        </div>

        {/* 对比度 */}
        <div className="grid grid-cols-1 md:grid-cols-[auto_minmax(0,1fr)] gap-4 items-center flex-shrink-0 p-3 nb-bg-card nb-border rounded-lg">
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium nb-text">
              {t('tools.colorConverter.contrastBackground')}
            </label>
            <input
              type="color"
              value={contrastBackgroundHex}
              onChange={e => handleContrastBackgroundChange(e.target.value)}
              className="w-14 h-9 cursor-pointer rounded nb-border"
            />
          </div>
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="h-9 w-20 nb-border rounded text-center leading-9 text-sm font-medium"
              style={{ backgroundColor: contrastBackgroundHex, color: colorCss }}
            >
              Text
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium nb-text">
                {t('tools.colorConverter.contrastRatio', { ratio: contrastRatio.toFixed(2) })}
              </div>
              <div className="text-xs nb-text-secondary">
                {t(getContrastLabelKey(contrastRatio))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </ToolCard>
  );
};
