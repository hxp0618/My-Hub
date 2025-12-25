import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { exportData, importData } from '../../../lib/dataSync';
import { useTheme } from '../../../contexts/ThemeContext';
import { ThemeSwitcher } from '../../../components/ThemeSwitcher';
import { MenuOrderConfig } from '../../../components/MenuOrderConfig';
import { NotificationSettings } from '../../../components/NotificationSettings';

const GeneralSettings: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { theme, setTheme } = useTheme();
  const [autoSuggest, setAutoSuggest] = useState<boolean>(false);
  const [currentLanguage, setCurrentLanguage] = useState<string>(i18n.language);
  const [cardsPerRow, setCardsPerRow] = useState<number>(4);

  useEffect(() => {
    const savedSetting = localStorage.getItem('autoSuggestBookmarkInfo');
    if (savedSetting !== null) {
      setAutoSuggest(JSON.parse(savedSetting));
    }

    const savedCardsPerRow = localStorage.getItem('cardsPerRow');
    if (savedCardsPerRow !== null) {
      setCardsPerRow(parseInt(savedCardsPerRow, 10));
    }
  }, []);

  const handleToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.checked;
    setAutoSuggest(newValue);
    localStorage.setItem('autoSuggestBookmarkInfo', JSON.stringify(newValue));
  };

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLanguage = e.target.value;
    setCurrentLanguage(newLanguage);
    i18n.changeLanguage(newLanguage);
  };

  const handleCardsPerRowChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = parseInt(e.target.value, 10);
    setCardsPerRow(newValue);
    localStorage.setItem('cardsPerRow', newValue.toString());

    // Dispatch custom event to notify other components
    window.dispatchEvent(new CustomEvent('cardsPerRowChanged', { detail: newValue }));
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    await exportData();
  };

  const handleImport = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      importData(file);
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
            <p className="text-sm text-secondary">{t('settings.themeDesc')}</p>
          </div>
          <ThemeSwitcher variant="grid" showDescriptions={true} showLabels={true} />
        </div>

        {/* Language Selection - Neo-Brutalism 风格 */}
        <div className="nb-card-static flex items-center justify-between p-4">
          <div>
            <h3 className="font-semibold text-[color:var(--nb-text)]">{t('settings.language')}</h3>
            <p className="text-sm text-secondary">{t('settings.languageDesc')}</p>
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
            <p className="text-sm text-secondary">{t('settings.autoSuggestDesc')}</p>
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
            <p className="text-sm text-secondary">{t('settings.cardsPerRowDesc')}</p>
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
      <p className="text-sm text-secondary mb-4">{t('settings.notificationDesc')}</p>
      <NotificationSettings />

      <h2 className="text-xl font-bold mt-8 mb-4 text-[color:var(--nb-text)]">{t('settings.dataManagement')}</h2>
      <div className="space-y-4">
        <div className="nb-card-static flex items-center justify-between p-4">
          <div>
            <h3 className="font-semibold text-[color:var(--nb-text)]">{t('settings.exportDataTitle')}</h3>
            <p className="text-sm text-secondary">{t('settings.exportDataDesc')}</p>
          </div>
          <button
            onClick={handleExport}
            className="nb-btn nb-btn-primary px-4 py-2"
          >
            {t('settings.exportButton')}
          </button>
        </div>
        <div className="nb-card-static flex items-center justify-between p-4">
          <div>
            <h3 className="font-semibold text-[color:var(--nb-text)]">{t('settings.importDataTitle')}</h3>
            <p className="text-sm text-secondary">{t('settings.importDataDesc')}</p>
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

      <p className="text-secondary mt-8">{t('settings.moreFeaturesComing')}</p>
    </div>
  );
};

export default GeneralSettings;
