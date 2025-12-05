import React, { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ToolCard } from '../../../../components/ToolCard';
import { TOOL_METADATA, ToolId, ToolComponentProps } from '../../../../types/tools';
import { useCopyToClipboard } from '../../../../hooks/useCopyToClipboard';

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface HSL {
  h: number;
  s: number;
  l: number;
}

/**
 * HEX 转 RGB
 */
export const hexToRgb = (hex: string): RGB | null => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return null;
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
};

/**
 * RGB 转 HEX
 */
export const rgbToHex = (rgb: RGB): string => {
  const toHex = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
};

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
  const match = str.match(/^(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})$/);
  if (!match) return null;
  const r = parseInt(match[1]);
  const g = parseInt(match[2]);
  const b = parseInt(match[3]);
  if (r > 255 || g > 255 || b > 255) return null;
  return { r, g, b };
};

/**
 * 解析 HSL 字符串
 */
export const parseHslString = (str: string): HSL | null => {
  const match = str.match(/^(\d{1,3})\s*,\s*(\d{1,3})%?\s*,\s*(\d{1,3})%?$/);
  if (!match) return null;
  const h = parseInt(match[1]);
  const s = parseInt(match[2]);
  const l = parseInt(match[3]);
  if (h > 360 || s > 100 || l > 100) return null;
  return { h, s, l };
};

/**
 * 颜色转换器工具组件
 */
export const ColorConverterTool: React.FC<ToolComponentProps> = ({
  isExpanded,
  onToggleExpand,
}) => {
  const { t } = useTranslation();
  const { copy } = useCopyToClipboard();
  const [hex, setHex] = useState('#3b82f6');
  const [rgb, setRgb] = useState<RGB>({ r: 59, g: 130, b: 246 });
  const [hsl, setHsl] = useState<HSL>({ h: 217, s: 91, l: 60 });
  const [error, setError] = useState<string | null>(null);
  const [activeInput, setActiveInput] = useState<'hex' | 'rgb' | 'hsl' | 'picker'>('hex');

  // 从 HEX 更新其他值
  const updateFromHex = useCallback((value: string) => {
    const parsed = hexToRgb(value);
    if (parsed) {
      setRgb(parsed);
      setHsl(rgbToHsl(parsed));
      setError(null);
    } else {
      setError(t('tools.colorConverter.invalidFormat'));
    }
  }, [t]);

  // 从 RGB 更新其他值
  const updateFromRgb = useCallback((value: RGB) => {
    setHex(rgbToHex(value));
    setHsl(rgbToHsl(value));
    setError(null);
  }, []);

  // 从 HSL 更新其他值
  const updateFromHsl = useCallback((value: HSL) => {
    const rgbValue = hslToRgb(value);
    setRgb(rgbValue);
    setHex(rgbToHex(rgbValue));
    setError(null);
  }, []);

  // 处理 HEX 输入
  const handleHexChange = (value: string) => {
    setHex(value);
    setActiveInput('hex');
    if (value.length >= 6) {
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
            style={{ backgroundColor: hex }}
          />
          <div className="flex flex-col gap-2">
            <label className="text-sm nb-text-secondary">{t('tools.colorConverter.picker')}</label>
            <input
              type="color"
              value={hex}
              onChange={handlePickerChange}
              className="w-16 h-10 cursor-pointer rounded nb-border"
            />
          </div>
          <div className="flex-1">
            <p className="text-sm nb-text-secondary mb-1">{t('tools.colorConverter.preview')}</p>
            <div className="flex gap-2">
              <div
                className="flex-1 h-8 rounded nb-border"
                style={{ backgroundColor: hex }}
              />
              <div
                className="flex-1 h-8 rounded nb-border text-center leading-8 text-sm font-medium"
                style={{ backgroundColor: hex, color: hsl.l > 50 ? '#000' : '#fff' }}
              >
                Text
              </div>
            </div>
          </div>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="p-3 nb-bg-card nb-border rounded-lg flex-shrink-0" style={{ borderColor: 'var(--nb-accent-pink)' }}>
            <p className="text-sm" style={{ color: 'var(--nb-accent-pink)' }}>{error}</p>
          </div>
        )}

        {/* 颜色值输入 */}
        <div className="grid grid-cols-3 gap-4 flex-shrink-0">
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
                placeholder={t('tools.colorConverter.hexPlaceholder')}
                className="nb-input flex-1 font-mono text-sm"
              />
              <button
                onClick={() => copy(hex)}
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
                  const newRgb = { ...rgb, [channel]: parseInt(e.target.value) };
                  setRgb(newRgb);
                  setActiveInput('rgb');
                  updateFromRgb(newRgb);
                }}
                className="flex-1 accent-[var(--nb-accent-yellow)]"
              />
              <span className="w-10 text-sm nb-text-secondary text-right">{rgb[channel]}</span>
            </div>
          ))}
        </div>
      </div>
    </ToolCard>
  );
};
