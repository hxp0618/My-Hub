import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { exportData, importData } from '../../../lib/dataSync';
import { sanitizeBrightnessInput, useTheme } from '../../../contexts/ThemeContext';
import { ThemeSwitcher } from '../../../components/ThemeSwitcher';
import { MenuOrderConfig } from '../../../components/MenuOrderConfig';
import { NotificationSettings } from '../../../components/NotificationSettings';
import { ConfirmDialog } from '../../../components/ConfirmDialog';
import { useToastContext } from '../../../contexts/ToastContext';
import {
  autoSuggestBookmark,
  cardsPerRow as cardsPerRowStorage,
  parseCardsPerRowValue,
  type StorageValues,
  StorageKey,
} from '../../../utils/storageManager';

const PERMISSION_ITEMS = [
  { key: 'bookmarks', icon: 'bookmark' },
  { key: 'history', icon: 'history' },
  { key: 'storage', icon: 'database' },
  { key: 'tabs', icon: 'tab' },
  { key: 'clipboard', icon: 'content_paste' },
  { key: 'alarms', icon: 'schedule' },
  { key: 'contentScripts', icon: 'web' },
];

const GeneralSettings: React.FC = () => {
  const { t, i18n } = useTranslation();
  const toast = useToastContext();
  const { brightness, setBrightness } = useTheme();
  const [autoSuggest, setAutoSuggest] = useState<boolean>(false);
  const [currentLanguage, setCurrentLanguage] = useState<string>(i18n.language);
  const [cardsPerRow, setCardsPerRow] = useState<StorageValues[StorageKey.CARDS_PER_ROW]>(4);
  const [includeSensitiveExport, setIncludeSensitiveExport] = useState<boolean>(false);
  const [showSensitiveExportConfirm, setShowSensitiveExportConfirm] = useState(false);

  useEffect(() => {
    setAutoSuggest(autoSuggestBookmark.get());
    setCardsPerRow(cardsPerRowStorage.get());
  }, []);

  const handleToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.checked;
    setAutoSuggest(newValue);
    autoSuggestBookmark.set(newValue);
  };

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLanguage = e.target.value;
    setCurrentLanguage(newLanguage);
    i18n.changeLanguage(newLanguage);
  };

  const handleCardsPerRowChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = parseCardsPerRowValue(e.target.value);
    if (newValue === null) return;

    setCardsPerRow(newValue);
    cardsPerRowStorage.set(newValue);

    // Dispatch custom event to notify other components
    window.dispatchEvent(new CustomEvent('cardsPerRowChanged', { detail: newValue }));
  };

  const handleBrightnessChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = sanitizeBrightnessInput(Number(e.target.value));
    setBrightness(newValue);
  };

  const handleResetBrightness = () => {
    setBrightness(1.0);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    if (includeSensitiveExport) {
      setShowSensitiveExportConfirm(true);
      return;
    }
    try {
      await exportData({ includeSensitiveData: false });
    } catch {
      toast.error(t('dataSync.exportError'));
    }
  };

  const handleConfirmSensitiveExport = async () => {
    try {
      await exportData({ includeSensitiveData: true });
    } catch {
      toast.error(t('dataSync.exportError'));
    }
  };

  const handleImport = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        await importData(file);
        toast.success(
          t('dataSync.importSuccess'),
          t('common.reload'),
          () => window.location.reload()
        );
      } catch {
        toast.error(t('dataSync.importError'));
      } finally {
        event.target.value = '';
      }
    }
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">{t('settings.generalTitle')}</h2>

      <div className="space-y-4">
        {/* Theme Selection - Neo-Brutalism 风格 */}
        <div className="nb-card-static p-4">
          <div className="mb-4">
            <h3 className="font-semibold text-[color:var(--nb-text)]">{t('settings.theme')}</h3>
            <p className="text-sm nb-text-secondary">{t('settings.themeDesc')}</p>
          </div>
          <ThemeSwitcher variant="grid" showDescriptions={true} showLabels={true} />
        </div>

        {/* Brightness Slider - Neo-Brutalism 风格 */}
        <div className="nb-card-static p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-[color:var(--nb-text)]">{t('settings.brightness')}</h3>
              <p className="text-sm nb-text-secondary">{t('settings.brightnessDesc')}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold nb-text px-2 py-1 bg-[color:var(--nb-accent-yellow)] border-2 border-[color:var(--nb-border)]">
                {Math.round(brightness * 100)}%
              </span>
              {brightness < 1.0 && (
                <button
                  onClick={handleResetBrightness}
                  className="nb-btn nb-btn-ghost px-2 py-1 text-xs"
                  title={t('settings.brightnessReset')}
                >
                  <span className="material-symbols-outlined text-sm">restart_alt</span>
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="material-symbols-outlined text-lg nb-text-secondary">brightness_low</span>
            <input
              type="range"
              min="0.5"
              max="1.0"
              step="0.01"
              value={brightness}
              onChange={handleBrightnessChange}
              className="flex-1 h-3 bg-[color:var(--nb-bg)] border-2 border-[color:var(--nb-border)] rounded-none appearance-none cursor-pointer
                [&::-webkit-slider-thumb]:appearance-none
                [&::-webkit-slider-thumb]:w-5
                [&::-webkit-slider-thumb]:h-5
                [&::-webkit-slider-thumb]:bg-[color:var(--nb-accent-yellow)]
                [&::-webkit-slider-thumb]:border-2
                [&::-webkit-slider-thumb]:border-[color:var(--nb-border)]
                [&::-webkit-slider-thumb]:cursor-pointer
                [&::-webkit-slider-thumb]:shadow-[2px_2px_0px_0px_var(--nb-border)]
                [&::-webkit-slider-thumb]:hover:shadow-[1px_1px_0px_0px_var(--nb-border)]
                [&::-webkit-slider-thumb]:hover:translate-x-[1px]
                [&::-webkit-slider-thumb]:hover:translate-y-[1px]
                [&::-webkit-slider-thumb]:transition-all
                [&::-moz-range-thumb]:w-5
                [&::-moz-range-thumb]:h-5
                [&::-moz-range-thumb]:bg-[color:var(--nb-accent-yellow)]
                [&::-moz-range-thumb]:border-2
                [&::-moz-range-thumb]:border-[color:var(--nb-border)]
                [&::-moz-range-thumb]:cursor-pointer"
            />
            <span className="material-symbols-outlined text-lg nb-text-secondary">brightness_high</span>
          </div>
        </div>

        {/* Language Selection - Neo-Brutalism 风格 */}
        <div className="nb-card-static flex items-center justify-between p-4">
          <div>
            <h3 className="font-semibold text-[color:var(--nb-text)]">{t('settings.language')}</h3>
            <p className="text-sm nb-text-secondary">{t('settings.languageDesc')}</p>
          </div>
          <select
            value={currentLanguage}
            onChange={handleLanguageChange}
            className="nb-input px-4 py-2"
          >
            <option value="zh-CN">{t('settings.languageOptions.zh-CN')}</option>
            <option value="en">{t('settings.languageOptions.en')}</option>
          </select>
        </div>

        {/* Auto Suggest - Neo-Brutalism 风格开关 */}
        <div className="nb-card-static flex items-center justify-between p-4">
          <div>
            <h3 className="font-semibold text-[color:var(--nb-text)]">{t('settings.autoSuggestTitle')}</h3>
            <p className="text-sm nb-text-secondary">{t('settings.autoSuggestDesc')}</p>
          </div>
          <label className="nb-toggle">
            <input
              type="checkbox"
              checked={autoSuggest}
              onChange={handleToggle}
              className="sr-only"
            />
            <div className={`nb-toggle-track ${autoSuggest ? 'active' : ''}`}>
              <div className="nb-toggle-thumb"></div>
            </div>
          </label>
        </div>

        {/* Cards Per Row - Neo-Brutalism 风格 */}
        <div className="nb-card-static flex items-center justify-between p-4">
          <div>
            <h3 className="font-semibold text-[color:var(--nb-text)]">{t('settings.cardsPerRow')}</h3>
            <p className="text-sm nb-text-secondary">{t('settings.cardsPerRowDesc')}</p>
          </div>
          <select
            value={cardsPerRow}
            onChange={handleCardsPerRowChange}
            className="nb-input px-4 py-2"
          >
            <option value="2">{t('settings.cardsPerRowOption', { count: 2 })}</option>
            <option value="3">{t('settings.cardsPerRowOption', { count: 3 })}</option>
            <option value="4">{t('settings.cardsPerRowOption', { count: 4 })}</option>
            <option value="5">{t('settings.cardsPerRowOption', { count: 5 })}</option>
            <option value="6">{t('settings.cardsPerRowOption', { count: 6 })}</option>
          </select>
        </div>

        {/* Menu Order - Neo-Brutalism 风格 */}
        <div className="nb-card-static p-4">
          <MenuOrderConfig />
        </div>
      </div>

      <h2 className="text-xl font-bold mt-8 mb-4 text-[color:var(--nb-text)]">{t('settings.notificationTitle')}</h2>
      <p className="text-sm nb-text-secondary mb-4">{t('settings.notificationDesc')}</p>
      <NotificationSettings />

      <h2 className="text-xl font-bold mt-8 mb-4 text-[color:var(--nb-text)]">{t('settings.permissionsTitle')}</h2>
      <p className="text-sm nb-text-secondary mb-4">{t('settings.permissionsDesc')}</p>
      <div className="nb-card-static p-4">
        <div className="divide-y-2 divide-[color:var(--nb-border)]">
          {PERMISSION_ITEMS.map((item) => (
            <div key={item.key} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-start">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center border-2 border-[color:var(--nb-border)] bg-[color:var(--nb-accent-blue)] shadow-[2px_2px_0px_0px_var(--nb-border)]">
                <span className="material-symbols-outlined text-base nb-text">{item.icon}</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <h3 className="text-sm font-bold text-[color:var(--nb-text)]">
                    {t(`settings.permissions.${item.key}.title`)}
                  </h3>
                  <span className="w-fit border border-[color:var(--nb-border)] bg-[color:var(--nb-accent-yellow)] px-2 py-0.5 text-xs font-bold text-[color:var(--nb-border)]">
                    {t(`settings.permissions.${item.key}.scope`)}
                  </span>
                </div>
                <p className="mt-1 text-xs leading-5 nb-text-secondary">
                  {t(`settings.permissions.${item.key}.desc`)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <h2 className="text-xl font-bold mt-8 mb-4 text-[color:var(--nb-text)]">{t('settings.dataManagement')}</h2>
      <div className="space-y-4">
        <div className="nb-card-static p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="font-semibold text-[color:var(--nb-text)]">{t('settings.exportDataTitle')}</h3>
              <p className="text-sm nb-text-secondary">{t('settings.exportDataDesc')}</p>
            </div>
            <button
              onClick={handleExport}
              className="nb-btn nb-btn-primary px-4 py-2 self-start"
            >
              {t('settings.exportButton')}
            </button>
          </div>
          <div className="mt-4 flex flex-col gap-3 border-t-2 border-[color:var(--nb-border)] pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h4 className="text-sm font-bold text-[color:var(--nb-text)]">{t('settings.exportSensitiveTitle')}</h4>
              <p className="text-xs nb-text-secondary">{t('settings.exportSensitiveDesc')}</p>
              {!includeSensitiveExport && (
                <p className="mt-1 text-xs font-medium" style={{ color: 'var(--nb-accent-green)' }}>
                  {t('settings.exportSafeModeHint')}
                </p>
              )}
              {includeSensitiveExport && (
                <p className="mt-1 text-xs font-medium" style={{ color: 'var(--nb-accent-pink)' }}>
                  {t('settings.exportSensitiveWarning')}
                </p>
              )}
            </div>
            <label className="nb-toggle self-start sm:self-center">
              <input
                type="checkbox"
                checked={includeSensitiveExport}
                onChange={(event) => setIncludeSensitiveExport(event.target.checked)}
                className="sr-only"
                aria-label={t('settings.exportSensitiveTitle')}
              />
              <div className={`nb-toggle-track ${includeSensitiveExport ? 'active' : ''}`}>
                <div className="nb-toggle-thumb"></div>
              </div>
            </label>
          </div>
        </div>
        <div className="nb-card-static flex items-center justify-between p-4">
          <div>
            <h3 className="font-semibold text-[color:var(--nb-text)]">{t('settings.importDataTitle')}</h3>
            <p className="text-sm nb-text-secondary">{t('settings.importDataDesc')}</p>
          </div>
          <button
            onClick={handleImport}
            className="nb-btn nb-btn-secondary px-4 py-2"
          >
            {t('settings.importButton')}
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept="application/json"
          />
        </div>
      </div>

      <p className="nb-text-secondary mt-8">{t('settings.moreFeaturesComing')}</p>

      <ConfirmDialog
        isOpen={showSensitiveExportConfirm}
        onClose={() => setShowSensitiveExportConfirm(false)}
        onConfirm={handleConfirmSensitiveExport}
        title={t('settings.exportSensitiveTitle')}
        message={t('settings.exportSensitiveConfirm')}
        confirmText={t('settings.exportButton')}
        danger
      />
    </div>
  );
};

export default GeneralSettings;
