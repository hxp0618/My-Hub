import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getLLMSettings, saveLLMSettings, testLLMConnection } from '../../../lib/llmUtils';
import { LLMSettings } from '../../../types/llm';
import { PROVIDERS, ProviderKey } from '../../../data/models';

type GeminiNanoStatus = 'checking' | 'available' | 'unavailable' | 'downloading' | 'downloadable';

const LLMSettings: React.FC = () => {
  const { t } = useTranslation();
  const [settings, setSettings] = useState<LLMSettings>({
    selectedProvider: '',
    selectedModel: '',
    apiKey: '',
    customApiUrl: '',
    customModel: '',
    providers: {},
    prioritizeGeminiNano: false,
  });
  const [showApiKey, setShowApiKey] = useState(false);
  const [isCustomProvider, setIsCustomProvider] = useState(false);
  const [isCustomModel, setIsCustomModel] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [geminiNanoStatus, setGeminiNanoStatus] = useState<GeminiNanoStatus>('checking');

  useEffect(() => {
    const loadedSettings = getLLMSettings();
    setSettings(loadedSettings);
    setIsCustomProvider(loadedSettings.selectedProvider === 'custom');
    setIsCustomModel(loadedSettings.selectedModel === 'custom');
    
    // 如果已选择提供商，从对应配置中加载 API Key
    if (loadedSettings.selectedProvider && loadedSettings.selectedProvider !== 'custom') {
      const providerConfig = loadedSettings.providers[loadedSettings.selectedProvider];
      if (providerConfig) {
        setSettings(prev => ({
          ...prev,
          apiKey: providerConfig.apiKey,
          selectedModel: providerConfig.selectedModel,
          customModel: providerConfig.customModel,
        }));
      }
    }

    // Check for Gemini Nano availability
    const checkGeminiNanoAvailability = async () => {
      let status: GeminiNanoStatus = 'unavailable';
      try {
        if (typeof LanguageModel !== 'undefined' && typeof LanguageModel.availability === 'function') {
          status = await LanguageModel.availability();
        }
      } catch (error) {
        console.error("Error checking Gemini Nano availability:", error);
      }
      
      setGeminiNanoStatus(status);

      // 根据可用性及是否已有偏好决定是否需要更新并持久化
      let nextSettingsToSave: LLMSettings | null = null;
      setSettings(currentSettings => {
        // Only default to 'on' if the setting has never been saved before.
        const rawSettingsData = localStorage.getItem('llm_settings');
        const hasSetNanoPreference = rawSettingsData ? 'prioritizeGeminiNano' in JSON.parse(rawSettingsData) : false;

        if (status === 'available') {
          if (!hasSetNanoPreference && !currentSettings.prioritizeGeminiNano) {
            const next = { ...currentSettings, prioritizeGeminiNano: true } as LLMSettings;
            nextSettingsToSave = next;
            return next;
          }
        } else {
          // If not available, always force it to off.
          if (currentSettings.prioritizeGeminiNano) {
            const next = { ...currentSettings, prioritizeGeminiNano: false } as LLMSettings;
            nextSettingsToSave = next;
            return next;
          }
        }
        return currentSettings;
      });

      if (nextSettingsToSave) {
        // 持久化最新的 Gemini Nano 偏好
        saveLLMSettings(nextSettingsToSave);
      }
    };
    checkGeminiNanoAvailability();
  }, []);

  const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const provider = e.target.value;
    const isCustom = provider === 'custom';
    setIsCustomProvider(isCustom);
    setIsCustomModel(false);
    
    if (isCustom) {
      setSettings(prev => ({
        ...prev,
        selectedProvider: provider,
        selectedModel: '',
        customModel: '',
        apiKey: '',
        customApiUrl: ''
      }));
    } else {
      const providerConfig = settings.providers[provider];
      setSettings(prev => ({
        ...prev,
        selectedProvider: provider,
        selectedModel: providerConfig?.selectedModel || '',
        customModel: providerConfig?.customModel || '',
        apiKey: providerConfig?.apiKey || '',
        customApiUrl: ''
      }));
    }
  };

  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const model = e.target.value;
    const isCustom = model === 'custom';
    setIsCustomModel(isCustom);
    
    setSettings(prev => ({
      ...prev,
      selectedModel: model,
      customModel: isCustom ? '' : ''
    }));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSettings(prev => ({ ...prev, [name]: value }));
  };

  const handleToggleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setSettings(prev => {
      const next = { ...prev, [name]: checked } as LLMSettings;
      // 立即持久化，确保 localStorage 中的开关状态与 UI 同步
      saveLLMSettings(next);
      return next;
    });
  };

  const handleSave = () => {
    saveLLMSettings(settings);
    alert(t('settings.settingsSavedAlert'));
  };

  const handleTest = async () => {
    setIsLoading(true);
    setTestResult(null);
    
    try {
      const result = await testLLMConnection(settings);
      setTestResult({ success: true, message: t('settings.connectionSuccessMsg') });
    } catch (error) {
      setTestResult({ 
        success: false, 
        message: t('settings.connectionFailedMsg', { error: error instanceof Error ? error.message : t('errors.generic.message') })
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getProviderOptions = () => {
    const options = Object.entries(PROVIDERS).map(([key, provider]) => (
      <option key={key} value={key}>
        {provider.name}
      </option>
    ));
    options.push(<option key="custom" value="custom">{t('settings.custom')}</option>);
    return options;
  };

  const getModelOptions = () => {
    if (isCustomProvider) {
      return [<option key="custom" value="custom">{t('settings.custom')}</option>];
    }
    
    const provider = PROVIDERS[settings.selectedProvider as ProviderKey];
    if (!provider) return [];
    
    const options = provider.models.map(model => (
      <option key={model.value} value={model.value}>
        {model.label}
      </option>
    ));
    options.push(<option key="custom" value="custom">{t('settings.custom')}</option>);
    return options;
  };

  const getProviderWebsiteUrl = () => {
    if (isCustomProvider) return null;
    const provider = PROVIDERS[settings.selectedProvider as ProviderKey];
    return provider?.websiteUrl;
  };

  const getProviderName = () => {
    if (isCustomProvider) return t('settings.custom');
    const provider = PROVIDERS[settings.selectedProvider as ProviderKey];
    return provider?.name;
  };

  return (
    <div className="flex-1 flex flex-col nb-text">
      <h2 className="text-xl font-bold mb-6">{t('settings.llmTitle')}</h2>
      
      <div className="flex-1 overflow-y-auto">
        {/* Gemini Nano Toggle - Neo-Brutalism 风格 */}
        <div className="nb-card-static mb-6 p-4">
          <div className="flex items-center justify-between">
            <label htmlFor="prioritizeGeminiNano" className="text-sm font-medium text-[color:var(--nb-text)]">
              {t('settings.geminiNanoPriority')}
              <p className="text-xs nb-text-secondary mt-1">
                {t('settings.geminiNanoDesc')}
                <a
                  href="https://developer.chrome.com/docs/ai/prompt-api"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[color:var(--nb-accent-blue)] hover:underline ml-1"
                >
                  {t('settings.hardwareRequirements')}
                </a>
              </p>
            </label>
            {/* Neo-Brutalism 风格开关 */}
            <label className="nb-toggle">
              <input
                type="checkbox"
                name="prioritizeGeminiNano"
                id="prioritizeGeminiNano"
                checked={settings.prioritizeGeminiNano}
                onChange={(e) => {
                  if (e.target.checked && geminiNanoStatus !== 'available') {
                    return;
                  }
                  handleToggleChange(e);
                }}
                className="sr-only"
              />
              <div className={`nb-toggle-track ${settings.prioritizeGeminiNano ? 'active' : ''}`}>
                <div className="nb-toggle-thumb"></div>
              </div>
            </label>
          </div>
          <p className="text-xs nb-text-secondary mt-2">
            {t('settings.status')}: <span className={`font-medium ${geminiNanoStatus === 'available' ? 'text-[color:var(--nb-accent-green)]' : 'nb-text-secondary'}`}>{geminiNanoStatus}</span>
          </p>
        </div>

        {/* Provider Selection - Neo-Brutalism 风格 */}
        <div className="mb-6">
          <label htmlFor="provider" className="block text-sm font-medium text-[color:var(--nb-text)] mb-2">
            {t('settings.providerLabel')}
          </label>
          <select
            id="provider"
            value={settings.selectedProvider}
            onChange={handleProviderChange}
            className="nb-input block w-full px-3 py-2 sm:text-sm"
          >
            <option value="">{t('settings.selectProvider')}</option>
            {getProviderOptions()}
          </select>
        </div>

        {/* Custom API URL - Neo-Brutalism 风格 */}
        {isCustomProvider && (
          <div className="mb-6">
            <label htmlFor="customApiUrl" className="block text-sm font-medium text-[color:var(--nb-text)] mb-2">
              {t('settings.apiUrlLabel')}
            </label>
            <input
              type="text"
              id="customApiUrl"
              name="customApiUrl"
              value={settings.customApiUrl || ''}
              onChange={handleInputChange}
              placeholder={t('settings.customApiUrlPlaceholder')}
              className="nb-input block w-full px-3 py-2 sm:text-sm"
            />
          </div>
        )}

        {/* Model Selection - Neo-Brutalism 风格 */}
        {settings.selectedProvider && (
          <div className="mb-6">
            <label htmlFor="model" className="block text-sm font-medium text-[color:var(--nb-text)] mb-2">
              {t('settings.modelLabel')}
            </label>
            <select
              id="model"
              value={settings.selectedModel}
              onChange={handleModelChange}
              className="nb-input block w-full px-3 py-2 sm:text-sm"
            >
              <option value="">{t('settings.selectModel')}</option>
              {getModelOptions()}
            </select>
          </div>
        )}

        {/* Custom Model - Neo-Brutalism 风格 */}
        {isCustomModel && (
          <div className="mb-6">
            <label htmlFor="customModel" className="block text-sm font-medium text-[color:var(--nb-text)] mb-2">
              {t('settings.customModelLabel')}
            </label>
            <input
              type="text"
              id="customModel"
              name="customModel"
              value={settings.customModel || ''}
              onChange={handleInputChange}
              placeholder={t('settings.customModelPlaceholder')}
              className="nb-input block w-full px-3 py-2 sm:text-sm"
            />
          </div>
        )}

        {/* API Key - Neo-Brutalism 风格 */}
        {settings.selectedProvider && (
          <div className="mb-6">
            <label htmlFor="apiKey" className="block text-sm font-medium text-[color:var(--nb-text)] mb-2">
              {t('settings.apiKeyLabel')}
            </label>
            <div className="relative">
              <input
                type={showApiKey ? 'text' : 'password'}
                id="apiKey"
                name="apiKey"
                value={settings.apiKey}
                onChange={handleInputChange}
                className="nb-input block w-full px-3 py-2 pr-10 sm:text-sm"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center nb-text-secondary hover:text-[color:var(--nb-text)] transition"
              >
                <span className="material-symbols-outlined icon-linear">
                  {showApiKey ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
            {!isCustomProvider && getProviderWebsiteUrl() && (
              <p className="mt-2 text-xs nb-text-secondary">
                {t('settings.getApiKeyFrom', { provider: getProviderName() })}{' '}
                <a
                  href={getProviderWebsiteUrl()!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[color:var(--nb-accent-blue)] hover:underline"
                >
                  {getProviderName()}
                </a>
              </p>
            )}
          </div>
        )}
      </div>

      {/* Test Result - Neo-Brutalism 风格 */}
      {testResult && (
        <div className={`nb-card-static mb-4 p-3 ${testResult.success ? 'bg-[color:var(--nb-accent-green)]/20 border-[color:var(--nb-accent-green)]' : 'bg-[color:var(--nb-accent-pink)]/20 border-[color:var(--nb-accent-pink)]'}`}>
          <span className={testResult.success ? 'text-[color:var(--nb-accent-green)]' : 'text-[color:var(--nb-accent-pink)]'}>
            {testResult.message}
          </span>
        </div>
      )}

      {/* Action Buttons - Neo-Brutalism 风格 */}
      <div className="flex justify-end space-x-3 pt-4 border-t-[length:var(--nb-border-width)] border-[color:var(--nb-border)]">
        <button
          onClick={handleTest}
          disabled={!settings.selectedProvider || !settings.apiKey || isLoading}
          className="nb-btn nb-btn-secondary px-4 py-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
        >
          {isLoading ? t('settings.testing') : t('settings.testConnectionButton')}
        </button>
        <button
          onClick={handleSave}
          className="nb-btn nb-btn-primary px-4 py-2 text-sm font-medium"
        >
          {t('settings.saveButton')}
        </button>
      </div>
    </div>
  );
};

export default LLMSettings;
