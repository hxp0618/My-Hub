import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ToolCard } from '../../../../components/ToolCard';
import { TOOL_METADATA, ToolId, ToolComponentProps } from '../../../../types/tools';
import { useCopyToClipboard } from '../../../../hooks/useCopyToClipboard';
import {
  generateUUID,
  generateNanoID,
  generateULID,
  parseULIDTimestamp,
  generateObjectId,
  parseObjectIdTimestamp,
  generateSnowflakeId,
  parseSnowflakeTimestamp,
  generateRandomString,
  generateRandomNumber,
  calculateMD5,
  generateBatch,
} from '../../../../utils/randomGenerators';

type GeneratorType = 'uuid' | 'nanoid' | 'ulid' | 'objectid' | 'snowflake' | 'string' | 'number' | 'md5';

interface GeneratedResult {
  value: string;
  timestamp?: Date;
}

/**
 * 随机生成器工具组件
 */
export const RandomGeneratorTool: React.FC<ToolComponentProps> = ({
  isExpanded,
  onToggleExpand,
}) => {
  const { t } = useTranslation();
  const { copy } = useCopyToClipboard();

  // 通用状态
  const [activeTab, setActiveTab] = useState<GeneratorType>('uuid');
  const [results, setResults] = useState<GeneratedResult[]>([]);
  const [count, setCount] = useState(1);

  // UUID 选项
  const [uuidVersion, setUuidVersion] = useState<'v1' | 'v4'>('v4');
  const [uuidWithHyphens, setUuidWithHyphens] = useState(true);

  // NanoID 选项
  const [nanoidLength, setNanoidLength] = useState(21);

  // 随机字符串选项
  const [stringLength, setStringLength] = useState(16);
  const [stringUppercase, setStringUppercase] = useState(true);
  const [stringLowercase, setStringLowercase] = useState(true);
  const [stringNumbers, setStringNumbers] = useState(true);
  const [stringSymbols, setStringSymbols] = useState(false);

  // 随机数字选项
  const [numberMin, setNumberMin] = useState(0);
  const [numberMax, setNumberMax] = useState(100);

  // MD5 选项
  const [md5Input, setMd5Input] = useState('');
  const [md5Uppercase, setMd5Uppercase] = useState(false);

  const tabs: { id: GeneratorType; label: string }[] = [
    { id: 'uuid', label: 'UUID' },
    { id: 'nanoid', label: 'NanoID' },
    { id: 'ulid', label: 'ULID' },
    { id: 'objectid', label: 'ObjectId' },
    { id: 'snowflake', label: t('tools.randomGenerator.snowflake') },
    { id: 'string', label: t('tools.randomGenerator.string') },
    { id: 'number', label: t('tools.randomGenerator.number') },
    { id: 'md5', label: 'MD5' },
  ];

  const handleGenerate = useCallback(() => {
    let newResults: GeneratedResult[] = [];

    switch (activeTab) {
      case 'uuid':
        newResults = generateBatch(
          () => generateUUID({ version: uuidVersion, withHyphens: uuidWithHyphens }),
          count
        ).map(value => ({ value }));
        break;

      case 'nanoid':
        newResults = generateBatch(
          () => generateNanoID({ length: nanoidLength }),
          count
        ).map(value => ({ value }));
        break;

      case 'ulid':
        newResults = generateBatch(() => {
          const ulid = generateULID();
          return { value: ulid, timestamp: parseULIDTimestamp(ulid) };
        }, count);
        break;

      case 'objectid':
        newResults = generateBatch(() => {
          const oid = generateObjectId();
          return { value: oid, timestamp: parseObjectIdTimestamp(oid) };
        }, count);
        break;

      case 'snowflake':
        newResults = generateBatch(() => {
          const id = generateSnowflakeId();
          return { value: id, timestamp: parseSnowflakeTimestamp(id) };
        }, count);
        break;

      case 'string':
        if (!stringUppercase && !stringLowercase && !stringNumbers && !stringSymbols) {
          return;
        }
        newResults = generateBatch(
          () =>
            generateRandomString({
              length: stringLength,
              uppercase: stringUppercase,
              lowercase: stringLowercase,
              numbers: stringNumbers,
              symbols: stringSymbols,
            }),
          count
        ).map(value => ({ value }));
        break;

      case 'number':
        if (numberMin > numberMax) {
          return;
        }
        newResults = generateBatch(
          () => generateRandomNumber({ min: numberMin, max: numberMax }).toString(),
          count
        ).map(value => ({ value }));
        break;

      case 'md5':
        newResults = [{ value: calculateMD5(md5Input, { uppercase: md5Uppercase }) }];
        break;
    }

    setResults(newResults);
  }, [
    activeTab, count, uuidVersion, uuidWithHyphens, nanoidLength,
    stringLength, stringUppercase, stringLowercase, stringNumbers, stringSymbols,
    numberMin, numberMax, md5Input, md5Uppercase
  ]);

  const handleCopyAll = useCallback(() => {
    copy(results.map(r => r.value).join('\n'));
  }, [results, copy]);

  const handleCopySingle = useCallback((value: string) => {
    copy(value);
  }, [copy]);

  const handleClear = () => {
    setResults([]);
  };

  const handleTabChange = (tab: GeneratorType) => {
    setActiveTab(tab);
    setResults([]);
  };

  const isGenerateDisabled = () => {
    if (activeTab === 'string') {
      return !stringUppercase && !stringLowercase && !stringNumbers && !stringSymbols;
    }
    if (activeTab === 'number') {
      return numberMin > numberMax;
    }
    return false;
  };

  const renderOptions = () => {
    switch (activeTab) {
      case 'uuid':
        return (
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <label className="text-sm nb-text-secondary">{t('tools.randomGenerator.version')}:</label>
              <select
                value={uuidVersion}
                onChange={e => setUuidVersion(e.target.value as 'v1' | 'v4')}
                className="nb-input text-sm"
              >
                <option value="v4">UUID v4</option>
                <option value="v1">UUID v1</option>
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm nb-text-secondary cursor-pointer">
              <input
                type="checkbox"
                checked={uuidWithHyphens}
                onChange={e => setUuidWithHyphens(e.target.checked)}
                className="nb-checkbox"
              />
              {t('tools.randomGenerator.withHyphens')}
            </label>
          </div>
        );

      case 'nanoid':
        return (
          <div className="flex items-center gap-2">
            <label className="text-sm nb-text-secondary">{t('tools.randomGenerator.length')}:</label>
            <input
              type="number"
              min={1}
              max={64}
              value={nanoidLength}
              onChange={e => setNanoidLength(Math.min(64, Math.max(1, parseInt(e.target.value) || 21)))}
              className="nb-input w-20 text-sm"
            />
          </div>
        );

      case 'string':
        return (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <label className="text-sm nb-text-secondary">{t('tools.randomGenerator.length')}:</label>
              <input
                type="number"
                min={1}
                max={256}
                value={stringLength}
                onChange={e => setStringLength(Math.min(256, Math.max(1, parseInt(e.target.value) || 16)))}
                className="nb-input w-20 text-sm"
              />
            </div>
            <div className="flex items-center gap-4 flex-wrap">
              <label className="flex items-center gap-2 text-sm nb-text-secondary cursor-pointer">
                <input
                  type="checkbox"
                  checked={stringUppercase}
                  onChange={e => setStringUppercase(e.target.checked)}
                  className="nb-checkbox"
                />
                A-Z
              </label>
              <label className="flex items-center gap-2 text-sm nb-text-secondary cursor-pointer">
                <input
                  type="checkbox"
                  checked={stringLowercase}
                  onChange={e => setStringLowercase(e.target.checked)}
                  className="nb-checkbox"
                />
                a-z
              </label>
              <label className="flex items-center gap-2 text-sm nb-text-secondary cursor-pointer">
                <input
                  type="checkbox"
                  checked={stringNumbers}
                  onChange={e => setStringNumbers(e.target.checked)}
                  className="nb-checkbox"
                />
                0-9
              </label>
              <label className="flex items-center gap-2 text-sm nb-text-secondary cursor-pointer">
                <input
                  type="checkbox"
                  checked={stringSymbols}
                  onChange={e => setStringSymbols(e.target.checked)}
                  className="nb-checkbox"
                />
                !@#$%
              </label>
            </div>
            {isGenerateDisabled() && (
              <p className="text-sm text-red-500">{t('tools.randomGenerator.noCharsetSelected')}</p>
            )}
          </div>
        );

      case 'number':
        return (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <label className="text-sm nb-text-secondary">{t('tools.randomGenerator.min')}:</label>
                <input
                  type="number"
                  value={numberMin}
                  onChange={e => setNumberMin(parseInt(e.target.value) || 0)}
                  className="nb-input w-28 text-sm"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm nb-text-secondary">{t('tools.randomGenerator.max')}:</label>
                <input
                  type="number"
                  value={numberMax}
                  onChange={e => setNumberMax(parseInt(e.target.value) || 100)}
                  className="nb-input w-28 text-sm"
                />
              </div>
            </div>
            {numberMin > numberMax && (
              <p className="text-sm text-red-500">{t('tools.randomGenerator.invalidRange')}</p>
            )}
          </div>
        );

      case 'md5':
        return (
          <div className="flex flex-col gap-3">
            <textarea
              value={md5Input}
              onChange={e => setMd5Input(e.target.value)}
              placeholder={t('tools.randomGenerator.md5Placeholder')}
              className="nb-input text-sm min-h-[80px] resize-y"
            />
            <label className="flex items-center gap-2 text-sm nb-text-secondary cursor-pointer">
              <input
                type="checkbox"
                checked={md5Uppercase}
                onChange={e => setMd5Uppercase(e.target.checked)}
                className="nb-checkbox"
              />
              {t('tools.randomGenerator.uppercase')}
            </label>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <ToolCard
      tool={TOOL_METADATA[ToolId.RANDOM_GENERATOR]}
      isExpanded={isExpanded}
      onToggleExpand={onToggleExpand}
    >
      <div className="h-full flex flex-col gap-4">
        {/* 标签页导航 */}
        <div className="nb-card-static p-2">
          <div className="flex flex-wrap gap-2">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg border-2 border-[var(--nb-border)] transition-all ${
                  activeTab === tab.id
                    ? 'bg-[var(--nb-accent-yellow)] shadow-[2px_2px_0px_0px_var(--nb-border)]'
                    : 'bg-[var(--nb-card)] hover:shadow-[2px_2px_0px_0px_var(--nb-border)] hover:translate-x-[-1px] hover:translate-y-[-1px]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* 选项区 */}
        <div className="flex-shrink-0">{renderOptions()}</div>

        {/* 控制按钮 */}
        {activeTab !== 'md5' && (
          <div className="flex items-center gap-4 flex-wrap flex-shrink-0">
            <div className="flex items-center gap-2">
              <label className="text-sm nb-text-secondary">{t('tools.randomGenerator.count')}:</label>
              <input
                type="number"
                min={1}
                max={100}
                value={count}
                onChange={e => setCount(Math.min(100, Math.max(1, parseInt(e.target.value) || 1)))}
                className="nb-input w-20 text-sm"
              />
            </div>
          </div>
        )}

        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={handleGenerate}
            disabled={isGenerateDisabled()}
            className="nb-btn nb-btn-primary text-sm"
          >
            {t('tools.randomGenerator.generate')}
          </button>
          <button
            onClick={handleCopyAll}
            disabled={results.length === 0}
            className="nb-btn nb-btn-secondary text-sm"
          >
            {t('tools.randomGenerator.copyAll')}
          </button>
          <button
            onClick={handleClear}
            disabled={results.length === 0}
            className="nb-btn nb-btn-ghost text-sm"
          >
            {t('tools.randomGenerator.clear')}
          </button>
        </div>

        {/* 结果区 */}
        <div className="flex-1 flex flex-col min-h-0">
          <label className="block text-sm font-medium nb-text mb-2 flex-shrink-0">
            {t('tools.randomGenerator.result')}
          </label>
          <div className="flex-1 nb-card-static overflow-auto">
            {results.length === 0 ? (
              <div className="h-full flex items-center justify-center nb-text-secondary text-sm">
                {t('tools.randomGenerator.emptyResult')}
              </div>
            ) : (
              <div className="p-3 space-y-2">
                {results.map((result, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 nb-bg rounded-lg group"
                  >
                    <div className="flex flex-col gap-1 min-w-0 flex-1">
                      <code className="font-mono text-sm nb-text break-all">{result.value}</code>
                      {result.timestamp && (
                        <span className="text-xs nb-text-secondary">
                          {result.timestamp.toLocaleString()}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => handleCopySingle(result.value)}
                      className="nb-btn nb-btn-ghost px-2 py-1 text-xs opacity-0 group-hover:opacity-100 transition-opacity ml-2 flex-shrink-0"
                    >
                      {t('tools.randomGenerator.copy')}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </ToolCard>
  );
};
