import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ToolCard } from '../../../../components/ToolCard';
import { TOOL_METADATA } from '../../../../types/tools';
import { ToolId, ToolComponentProps } from '../../../../types/tools';
import { useCopyToClipboard } from '../../../../hooks/useCopyToClipboard';

// 日期边界类型
interface DateBoundary {
  startSeconds: number;
  startMilliseconds: number;
  endSeconds: number;
  endMilliseconds: number;
}

// 快速日期选项
type QuickDateOption = 'today' | 'yesterday' | 'thisWeek' | 'thisMonth';

// 计算某一天的开始和结束时间戳
const getDateBoundaries = (date: Date): DateBoundary => {
  // 开始时间：00:00:00.000
  const startDate = new Date(date);
  startDate.setHours(0, 0, 0, 0);
  
  // 结束时间：23:59:59.999
  const endDate = new Date(date);
  endDate.setHours(23, 59, 59, 999);
  
  return {
    startSeconds: Math.floor(startDate.getTime() / 1000),
    startMilliseconds: startDate.getTime(),
    endSeconds: Math.floor(endDate.getTime() / 1000),
    endMilliseconds: endDate.getTime(),
  };
};

// 快速日期选择
const getQuickDate = (option: QuickDateOption): Date => {
  const now = new Date();
  
  switch (option) {
    case 'today':
      return now;
      
    case 'yesterday':
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      return yesterday;
      
    case 'thisWeek':
      // 本周一
      const weekStart = new Date(now);
      const day = weekStart.getDay();
      const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1);
      weekStart.setDate(diff);
      return weekStart;
      
    case 'thisMonth':
      // 本月1号
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      return monthStart;
      
    default:
      return now;
  }
};

/**
 * 时间戳转换工具组件
 */
export const TimestampConverterTool: React.FC<ToolComponentProps> = ({
  isExpanded,
  onToggleExpand,
}) => {
  const { t } = useTranslation();
  const { copy } = useCopyToClipboard();
  const [currentTimestamp, setCurrentTimestamp] = useState({
    seconds: Math.floor(Date.now() / 1000),
    milliseconds: Date.now(),
  });
  const [timestampInput, setTimestampInput] = useState('');
  const [dateOutput, setDateOutput] = useState('');
  const [dateInput, setDateInput] = useState('');
  const [timestampOutput, setTimestampOutput] = useState('');
  
  // 新增：日期边界相关状态
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [dateBoundary, setDateBoundary] = useState<DateBoundary | null>(null);

  // 实时更新当前时间戳
  useEffect(() => {
    if (!isExpanded) return;

    const interval = setInterval(() => {
      setCurrentTimestamp({
        seconds: Math.floor(Date.now() / 1000),
        milliseconds: Date.now(),
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isExpanded]);

  // 当选择日期时计算边界
  useEffect(() => {
    if (selectedDate) {
      setDateBoundary(getDateBoundaries(selectedDate));
    }
  }, [selectedDate]);

  // 快速日期选择处理
  const handleQuickDateSelect = useCallback((option: QuickDateOption) => {
    setSelectedDate(getQuickDate(option));
  }, []);

  // 时间戳转日期
  const handleTimestampToDate = useCallback(() => {
    if (!timestampInput.trim()) {
      setDateOutput('');
      return;
    }

    try {
      const timestamp = parseInt(timestampInput);
      // 判断是秒还是毫秒
      const date = new Date(timestamp > 10000000000 ? timestamp : timestamp * 1000);
      
      if (isNaN(date.getTime())) {
        setDateOutput(t('tools.timestampConverter.invalidTimestamp'));
        return;
      }

      const iso = date.toISOString();
      const local = date.toLocaleString();
      setDateOutput(`ISO 8601: ${iso}\n${t('tools.timestampConverter.local')}: ${local}`);
    } catch (e) {
      setDateOutput(t('tools.timestampConverter.invalidTimestamp'));
    }
  }, [timestampInput, t]);

  // 日期转时间戳
  const handleDateToTimestamp = useCallback(() => {
    if (!dateInput.trim()) {
      setTimestampOutput('');
      return;
    }

    try {
      const date = new Date(dateInput);
      
      if (isNaN(date.getTime())) {
        setTimestampOutput(t('tools.timestampConverter.invalidDate'));
        return;
      }

      const seconds = Math.floor(date.getTime() / 1000);
      const milliseconds = date.getTime();
      setTimestampOutput(
        `${t('tools.timestampConverter.seconds')}: ${seconds}\n${t('tools.timestampConverter.milliseconds')}: ${milliseconds}`
      );
    } catch (e) {
      setTimestampOutput(t('tools.timestampConverter.invalidDate'));
    }
  }, [dateInput, t]);

  // 复制当前时间戳
  const handleCopyCurrentTimestamp = useCallback(
    (type: 'seconds' | 'milliseconds') => {
      const value = type === 'seconds' ? currentTimestamp.seconds : currentTimestamp.milliseconds;
      copy(value.toString());
    },
    [currentTimestamp, copy]
  );

  return (
    <ToolCard
      tool={TOOL_METADATA[ToolId.TIMESTAMP_CONVERTER]}
      isExpanded={isExpanded}
      onToggleExpand={onToggleExpand}
    >
      <div className="h-full flex flex-col gap-6">
        {/* 当前时间戳 - 固定在顶部 */}
        <div className="p-4 nb-card-static flex-shrink-0">
          <h4 className="text-sm font-medium nb-text mb-3">
            {t('tools.timestampConverter.current')}
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center justify-between">
              <span className="text-sm nb-text-secondary">
                {t('tools.timestampConverter.seconds')}:
              </span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-lg font-semibold nb-text">
                  {currentTimestamp.seconds}
                </span>
                <button
                  onClick={() => handleCopyCurrentTimestamp('seconds')}
                  className="nb-btn nb-btn-ghost p-1.5"
                  title={t('tools.timestampConverter.copy')}
                >
                  <span className="material-symbols-outlined text-sm">content_copy</span>
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm nb-text-secondary">
                {t('tools.timestampConverter.milliseconds')}:
              </span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-lg font-semibold nb-text">
                  {currentTimestamp.milliseconds}
                </span>
                <button
                  onClick={() => handleCopyCurrentTimestamp('milliseconds')}
                  className="nb-btn nb-btn-ghost p-1.5"
                  title={t('tools.timestampConverter.copy')}
                >
                  <span className="material-symbols-outlined text-sm">content_copy</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 新增：日期边界时间戳 */}
        <div className="nb-border-b pt-6 pb-6 flex-shrink-0">
          <h4 className="text-sm font-medium nb-text mb-3">
            {t('tools.timestampConverter.dateBoundary')}
          </h4>
          
          {/* 快速选择 */}
          <div className="mb-4">
            <label className="text-xs nb-text-secondary mb-2 block">
              {t('tools.timestampConverter.quickSelect')}
            </label>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => handleQuickDateSelect('today')}
                className="nb-btn nb-btn-secondary text-sm"
              >
                {t('tools.timestampConverter.today')}
              </button>
              <button
                onClick={() => handleQuickDateSelect('yesterday')}
                className="nb-btn nb-btn-secondary text-sm"
              >
                {t('tools.timestampConverter.yesterday')}
              </button>
              <button
                onClick={() => handleQuickDateSelect('thisWeek')}
                className="nb-btn nb-btn-secondary text-sm"
              >
                {t('tools.timestampConverter.thisWeek')}
              </button>
              <button
                onClick={() => handleQuickDateSelect('thisMonth')}
                className="nb-btn nb-btn-secondary text-sm"
              >
                {t('tools.timestampConverter.thisMonth')}
              </button>
            </div>
          </div>
          
          {/* 日期选择器 */}
          <div className="mb-4">
            <label className="text-xs nb-text-secondary mb-2 block">
              {t('tools.timestampConverter.selectDate')}
            </label>
            <input
              type="date"
              value={selectedDate.toISOString().split('T')[0]}
              onChange={(e) => setSelectedDate(new Date(e.target.value))}
              className="nb-input w-full text-sm"
            />
          </div>
          
          {/* 边界时间戳显示 */}
          {dateBoundary && (
            <div className="grid grid-cols-2 gap-4">
              {/* 开始时间 */}
              <div className="p-3 nb-card-static">
                <div className="text-xs nb-text-secondary mb-2">
                  {t('tools.timestampConverter.startTime')}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs nb-text-secondary">
                      {t('tools.timestampConverter.seconds')}:
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm nb-text">
                        {dateBoundary.startSeconds}
                      </span>
                      <button
                        onClick={() => copy(dateBoundary.startSeconds.toString())}
                        className="nb-btn nb-btn-ghost p-1"
                      >
                        <span className="material-symbols-outlined text-xs">content_copy</span>
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs nb-text-secondary">
                      {t('tools.timestampConverter.milliseconds')}:
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm nb-text">
                        {dateBoundary.startMilliseconds}
                      </span>
                      <button
                        onClick={() => copy(dateBoundary.startMilliseconds.toString())}
                        className="nb-btn nb-btn-ghost p-1"
                      >
                        <span className="material-symbols-outlined text-xs">content_copy</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* 结束时间 */}
              <div className="p-3 nb-card-static">
                <div className="text-xs nb-text-secondary mb-2">
                  {t('tools.timestampConverter.endTime')}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs nb-text-secondary">
                      {t('tools.timestampConverter.seconds')}:
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm nb-text">
                        {dateBoundary.endSeconds}
                      </span>
                      <button
                        onClick={() => copy(dateBoundary.endSeconds.toString())}
                        className="nb-btn nb-btn-ghost p-1"
                      >
                        <span className="material-symbols-outlined text-xs">content_copy</span>
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs nb-text-secondary">
                      {t('tools.timestampConverter.milliseconds')}:
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm nb-text">
                        {dateBoundary.endMilliseconds}
                      </span>
                      <button
                        onClick={() => copy(dateBoundary.endMilliseconds.toString())}
                        className="nb-btn nb-btn-ghost p-1"
                      >
                        <span className="material-symbols-outlined text-xs">content_copy</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 原有的转换功能 */}
        <div className="pt-6 flex-1 min-h-0">
          <h4 className="text-sm font-medium nb-text mb-3">转换工具</h4>
          <div className="grid grid-cols-2 gap-6 h-full">
          {/* 时间戳转日期 */}
          <div className="flex flex-col min-h-0">
            <label className="block text-sm font-medium nb-text mb-2 flex-shrink-0">
              {t('tools.timestampConverter.timestampToDate')}
            </label>
            <div className="flex gap-2 flex-shrink-0 mb-3">
              <input
                type="text"
                value={timestampInput}
                onChange={e => setTimestampInput(e.target.value)}
                placeholder={t('tools.timestampConverter.timestampPlaceholder')}
                className="nb-input flex-1 font-mono text-sm"
              />
              <button
                onClick={handleTimestampToDate}
                className="nb-btn nb-btn-primary text-sm whitespace-nowrap"
              >
                {t('tools.timestampConverter.convert')}
              </button>
            </div>
            {dateOutput && (
              <div className="flex-1 p-3 nb-card-static overflow-auto">
                <pre className="text-sm nb-text whitespace-pre-wrap font-mono">{dateOutput}</pre>
              </div>
            )}
          </div>

          {/* 日期转时间戳 */}
          <div className="flex flex-col min-h-0">
            <label className="block text-sm font-medium nb-text mb-2 flex-shrink-0">
              {t('tools.timestampConverter.dateToTimestamp')}
            </label>
            <div className="flex gap-2 flex-shrink-0 mb-3">
              <input
                type="datetime-local"
                value={dateInput}
                onChange={e => setDateInput(e.target.value)}
                className="nb-input flex-1 text-sm"
              />
              <button
                onClick={handleDateToTimestamp}
                className="nb-btn nb-btn-primary text-sm whitespace-nowrap"
              >
                {t('tools.timestampConverter.convert')}
              </button>
            </div>
            {timestampOutput && (
              <div className="flex-1 p-3 nb-card-static overflow-auto">
                <pre className="text-sm nb-text whitespace-pre-wrap font-mono">
                  {timestampOutput}
                </pre>
              </div>
            )}
          </div>
          </div>
        </div>
      </div>
    </ToolCard>
  );
};
