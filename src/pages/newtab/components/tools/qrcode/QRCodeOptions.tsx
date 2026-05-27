import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  QR_CODE_MARGIN_RANGE,
  QR_CODE_SIZES,
  parseQRCodeMargin,
  parseQRCodeSize,
} from '../../../../../types/qrcode';
import type { QRCodeOptions as QRCodeOptionsType } from '../../../../../types/qrcode';

interface QRCodeOptionsProps {
  options: QRCodeOptionsType;
  onChange: (options: QRCodeOptionsType) => void;
}

export const QRCodeOptions: React.FC<QRCodeOptionsProps> = ({ options, onChange }) => {
  const { t } = useTranslation();

  const handleChange = <K extends keyof QRCodeOptionsType>(key: K, value: QRCodeOptionsType[K]) => {
    onChange({ ...options, [key]: value });
  };

  return (
    <div className="space-y-3">
      {/* 尺寸 */}
      <div className="flex items-center gap-2">
        <label className="text-sm nb-text-secondary w-16">{t('tools.qrcodeGenerator.size')}:</label>
        <select
          value={options.size}
          onChange={e => handleChange('size', parseQRCodeSize(e.target.value, options.size))}
          className="nb-input flex-1 text-sm"
        >
          {QR_CODE_SIZES.map(size => (
            <option key={size} value={size}>{size} x {size}</option>
          ))}
        </select>
      </div>

      {/* 边距 */}
      <div className="flex items-center gap-2">
        <label className="text-sm nb-text-secondary w-16">{t('tools.qrcodeGenerator.margin')}:</label>
        <select
          value={options.margin}
          onChange={e => handleChange('margin', parseQRCodeMargin(e.target.value, options.margin))}
          className="nb-input flex-1 text-sm"
        >
          {Array.from(
            { length: QR_CODE_MARGIN_RANGE.max - QR_CODE_MARGIN_RANGE.min + 1 },
            (_, index) => QR_CODE_MARGIN_RANGE.min + index
          ).map(m => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>

      {/* 纠错级别 */}
      <div className="flex items-center gap-2">
        <label className="text-sm nb-text-secondary w-16">
          {t('tools.qrcodeGenerator.errorCorrection')}:
        </label>
        <select
          value={options.errorCorrectionLevel}
          onChange={e => handleChange('errorCorrectionLevel', e.target.value as 'L' | 'M' | 'Q' | 'H')}
          className="nb-input flex-1 text-sm"
        >
          <option value="L">{t('tools.qrcodeGenerator.errorCorrectionLevels.L')}</option>
          <option value="M">{t('tools.qrcodeGenerator.errorCorrectionLevels.M')}</option>
          <option value="Q">{t('tools.qrcodeGenerator.errorCorrectionLevels.Q')}</option>
          <option value="H">{t('tools.qrcodeGenerator.errorCorrectionLevels.H')}</option>
        </select>
      </div>

      {/* 前景色 */}
      <div className="flex items-center gap-2">
        <label className="text-sm nb-text-secondary w-16">
          {t('tools.qrcodeGenerator.foregroundColor')}:
        </label>
        <div className="flex-1 flex items-center gap-2">
          <input
            type="color"
            value={options.foregroundColor}
            onChange={e => handleChange('foregroundColor', e.target.value)}
            className="w-8 h-8 rounded cursor-pointer nb-border"
          />
          <input
            type="text"
            value={options.foregroundColor}
            onChange={e => handleChange('foregroundColor', e.target.value)}
            className="nb-input flex-1 text-sm"
          />
        </div>
      </div>

      {/* 背景色 */}
      <div className="flex items-center gap-2">
        <label className="text-sm nb-text-secondary w-16">
          {t('tools.qrcodeGenerator.backgroundColor')}:
        </label>
        <div className="flex-1 flex items-center gap-2">
          <input
            type="color"
            value={options.backgroundColor}
            onChange={e => handleChange('backgroundColor', e.target.value)}
            className="w-8 h-8 rounded cursor-pointer nb-border"
          />
          <input
            type="text"
            value={options.backgroundColor}
            onChange={e => handleChange('backgroundColor', e.target.value)}
            className="nb-input flex-1 text-sm"
          />
        </div>
      </div>
    </div>
  );
};
