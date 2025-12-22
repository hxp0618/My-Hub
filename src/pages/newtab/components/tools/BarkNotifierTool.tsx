import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ToolCard } from '../../../../components/ToolCard';
import { TOOL_METADATA } from '../../../../types/tools';
import { ToolId, ToolComponentProps } from '../../../../types/tools';
import { BarkKeyManager } from '../../../../services/BarkKeyManager';
import { migrateOldConfig } from '../../../../utils/barkKeyManager';
import { KeySelector } from './bark/KeySelector';
import { KeyManagementModal } from './bark/KeyManagementModal';
import { ScheduledTaskList } from './bark/ScheduledTaskList';
import { ScheduledTaskModal } from './bark/ScheduledTaskModal';
import { ExecutionHistoryModal } from './bark/ExecutionHistoryModal';
import { BarkNotificationOptions, BarkNotificationRecord } from '../../../../types/bark';
import { ScheduledTask, CreateTaskParams, UpdateTaskParams, TaskExecutionRecord } from '../../../../types/scheduledTask';
import { ScheduledTaskService } from '../../../../services/ScheduledTaskService';

// 历史记录存储键和限制
const BARK_HISTORY_KEY = 'bark_notification_history';
const MAX_HISTORY_RECORDS = 200;

// 加载历史记录
const loadHistory = (): BarkNotificationRecord[] => {
  try {
    const stored = localStorage.getItem(BARK_HISTORY_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load Bark history:', e);
  }
  return [];
};

// 保存历史记录
const saveHistory = (records: BarkNotificationRecord[]) => {
  try {
    const limitedRecords = records.slice(0, MAX_HISTORY_RECORDS);
    localStorage.setItem(BARK_HISTORY_KEY, JSON.stringify(limitedRecords));
  } catch (e) {
    console.error('Failed to save Bark history:', e);
  }
};

// 添加新记录
const addHistoryRecord = (record: Omit<BarkNotificationRecord, 'id' | 'timestamp'>) => {
  const newRecord: BarkNotificationRecord = {
    ...record,
    id: `bark_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now(),
  };

  const currentHistory = loadHistory();
  const updatedHistory = [newRecord, ...currentHistory].slice(0, MAX_HISTORY_RECORDS);
  saveHistory(updatedHistory);

  return updatedHistory;
};

// 删除单条记录
const deleteHistoryRecord = (id: string) => {
  const currentHistory = loadHistory();
  const updatedHistory = currentHistory.filter(record => record.id !== id);
  saveHistory(updatedHistory);
  return updatedHistory;
};

// 清空所有记录
const clearHistory = () => {
  localStorage.removeItem(BARK_HISTORY_KEY);
  return [];
};

// 通知预览组件
const NotificationPreview: React.FC<{
  title: string;
  body: string;
}> = ({ title, body }) => {
  const { t } = useTranslation();

  return (
    <div className="nb-card-static p-4">
      <div className="flex items-start gap-3">
        {/* iOS 通知图标 */}
        <div className="w-10 h-10 nb-border nb-shadow rounded-lg bg-[color:var(--nb-accent-blue)] flex items-center justify-center flex-shrink-0">
          <span className="material-symbols-outlined text-white text-lg">notifications</span>
        </div>

        <div className="flex-1 min-w-0">
          {/* 标题 */}
          <div className="font-semibold nb-text mb-1 truncate">
            {title || t('tools.barkNotifier.titlePlaceholder')}
          </div>

          {/* 内容 */}
          <div className="text-sm nb-text-secondary line-clamp-3">
            {body || t('tools.barkNotifier.bodyPlaceholder')}
          </div>

          {/* 时间 */}
          <div className="text-xs nb-text-secondary mt-1">
            {t('tools.barkNotifier.previewTime')}
          </div>
        </div>
      </div>
    </div>
  );
};

// 历史记录列表组件 - Neo-Brutalism 风格
const NotificationHistory: React.FC<{
  records: BarkNotificationRecord[];
  onDelete: (id: string) => void;
  onClearAll: () => void;
  onReuse: (record: BarkNotificationRecord) => void;
}> = ({ records, onDelete, onClearAll, onReuse }) => {
  const { t } = useTranslation();

  if (records.length === 0) {
    return (
      <div className="nb-card-static h-full flex flex-col items-center justify-center text-center p-6">
        <div className="p-4 rounded-full nb-border nb-shadow mb-4" style={{ backgroundColor: 'var(--nb-card)' }}>
          <span className="material-symbols-outlined text-4xl nb-text-secondary">history</span>
        </div>
        <p className="text-base font-bold nb-text mb-2">{t('tools.barkNotifier.noHistory')}</p>
        <p className="text-sm nb-text-secondary">{t('tools.barkNotifier.hint')}</p>
      </div>
    );
  }

  return (
    <div className="nb-card-static h-full flex flex-col p-4">
      {/* 头部操作栏 - Neo-Brutalism 风格 */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <h4 className="text-sm font-bold nb-text">
          {t('tools.barkNotifier.historyCount', { count: records.length, max: MAX_HISTORY_RECORDS })}
        </h4>
        <button
          onClick={onClearAll}
          className="nb-btn nb-btn-danger text-xs px-3 py-1"
        >
          {t('tools.barkNotifier.clearAll')}
        </button>
      </div>

      {/* 记录列表 - Neo-Brutalism 风格，占满剩余空间 */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-0">
        {records.map(record => (
          <div
            key={record.id}
            className="nb-card-static p-3 hover:shadow-[var(--nb-shadow-hover)] hover:-translate-y-[1px] transition-all"
            style={{ borderColor: record.status === 'success' ? 'var(--nb-accent-green)' : 'var(--nb-accent-pink)' }}
          >
            <div className="flex items-start justify-between gap-2">
              <div
                className="flex-1 min-w-0 cursor-pointer"
                onClick={() => onReuse(record)}
                title={t('tools.barkNotifier.reuseNotification')}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-sm nb-text truncate">
                    {record.title}
                  </span>
                  {record.status === 'success' ? (
                    <span className="nb-badge nb-badge-green text-xs px-1.5 py-0">✓</span>
                  ) : (
                    <span className="nb-badge nb-badge-pink text-xs px-1.5 py-0">✗</span>
                  )}
                </div>
                <p className="text-xs nb-text-secondary line-clamp-2 mb-1">
                  {record.body}
                </p>
                <div className="text-xs nb-text-secondary">
                  {new Date(record.timestamp).toLocaleString()}
                </div>
                {record.errorMessage && (
                  <div className="text-xs mt-1" style={{ color: 'var(--nb-accent-pink)' }}>
                    {record.errorMessage}
                  </div>
                )}
              </div>

              <button
                onClick={() => onDelete(record.id)}
                className="nb-btn nb-btn-ghost p-1.5 rounded-lg flex-shrink-0"
                title={t('common.delete')}
                style={{ color: 'var(--nb-accent-pink)' }}
              >
                <span className="material-symbols-outlined text-sm">delete</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Bark 通知工具组件
 */
export const BarkNotifierTool: React.FC<ToolComponentProps> = ({
  isExpanded,
  onToggleExpand,
}) => {
  const { t } = useTranslation();

  // 初始化密钥管理器
  const keyManager = useMemo(() => {
    // 执行数据迁移
    migrateOldConfig();
    return new BarkKeyManager();
  }, []);

  // 初始化定时任务服务
  const taskService = useMemo(() => new ScheduledTaskService(), []);

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');
  const [history, setHistory] = useState<BarkNotificationRecord[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [keysVersion, setKeysVersion] = useState(0); // 用于强制刷新
  const [selectedKeyIds, setSelectedKeyIds] = useState<string[]>([]); // 多选密钥

  // 新增：高级选项
  const [enableSound, setEnableSound] = useState(true);
  const [customIcon, setCustomIcon] = useState('');
  const [messageGroup, setMessageGroup] = useState('');

  // 定时任务相关状态
  const [activeTab, setActiveTab] = useState<'instant' | 'scheduled'>('instant');
  const [scheduledTasks, setScheduledTasks] = useState<ScheduledTask[]>([]);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<ScheduledTask | null>(null);

  // 执行历史相关状态
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyTaskTitle, setHistoryTaskTitle] = useState('');
  const [executionHistory, setExecutionHistory] = useState<TaskExecutionRecord[]>([]);

  // 获取当前密钥列表
  const keys = keyManager.getAllKeys();
  const defaultTitle = t('tools.barkNotifier.defaultTitle');

  // 初始化选中的密钥（如果为空且有密钥，默认选中第一个）
  useEffect(() => {
    if (keys.length > 0 && selectedKeyIds.length === 0) {
      const savedSelectedKey = keyManager.getSelectedKey();
      if (savedSelectedKey) {
        setSelectedKeyIds([savedSelectedKey.id]);
      } else {
        setSelectedKeyIds([keys[0].id]);
      }
    }
  }, [keys, selectedKeyIds.length, keyManager]);

  // 加载历史记录
  useEffect(() => {
    if (isExpanded) {
      setHistory(loadHistory());
      // 加载定时任务
      setScheduledTasks(taskService.getAllTasks());
    }
  }, [isExpanded, taskService]);

  // 处理密钥变更
  const handleKeysChange = useCallback(() => {
    setKeysVersion(v => v + 1);
  }, []);

  // 处理多选密钥
  const handleMultiSelect = useCallback((keyIds: string[]) => {
    setSelectedKeyIds(keyIds);
    // 同时更新 keyManager 的选中状态（保存第一个选中的作为默认）
    if (keyIds.length > 0) {
      try {
        keyManager.setSelectedKey(keyIds[0]);
      } catch (e) {
        console.error('Failed to set selected key:', e);
      }
    }
  }, [keyManager]);

  // 发送单个通知到指定密钥
  const sendToKey = async (key: { server: string; deviceKey: string }) => {
    let url = `${key.server}/${key.deviceKey}/${encodeURIComponent(title || defaultTitle)}/${encodeURIComponent(body || '')}`;

    const params = new URLSearchParams();
    if (!enableSound) params.append('sound', '');
    if (customIcon.trim()) params.append('icon', customIcon.trim());
    if (messageGroup.trim()) params.append('group', messageGroup.trim());

    const queryString = params.toString();
    if (queryString) url += `?${queryString}`;

    const response = await fetch(url);
    return response.json();
  };

  // 发送 Bark 通知（支持多选）
  const sendNotification = useCallback(async () => {
    // 检查是否有选中的密钥
    if (selectedKeyIds.length === 0) {
      setMessage(t('tools.barkNotifier.keys.noKeysAvailable'));
      setMessageType('error');
      return;
    }

    if (!title.trim() && !body.trim()) {
      setMessage(t('tools.barkNotifier.emptyContent'));
      setMessageType('error');
      return;
    }

    setIsSending(true);
    setMessage('');
    setMessageType('');

    // 获取选中的密钥配置
    const selectedKeys = keys.filter(k => selectedKeyIds.includes(k.id));

    // 并行发送到所有选中的密钥
    const results = await Promise.allSettled(
      selectedKeys.map(async (key) => {
        try {
          const data = await sendToKey(key);
          return { key, success: data.code === 200, error: data.message };
        } catch (e) {
          return { key, success: false, error: (e as Error).message };
        }
      })
    );

    // 统计结果
    const successCount = results.filter(
      r => r.status === 'fulfilled' && r.value.success
    ).length;
    const failedCount = results.length - successCount;

    // 构建选项记录
    const options: BarkNotificationOptions = {};
    if (!enableSound) options.sound = '';
    if (customIcon.trim()) options.icon = customIcon.trim();
    if (messageGroup.trim()) options.group = messageGroup.trim();

    if (failedCount === 0) {
      // 全部成功
      const updatedHistory = addHistoryRecord({
        title: title || defaultTitle,
        body: body || '',
        status: 'success',
        options: Object.keys(options).length > 0 ? options : undefined,
      });
      setHistory(updatedHistory);

      setMessage(
        selectedKeys.length > 1
          ? t('tools.barkNotifier.successMultiple', { count: successCount })
          : t('tools.barkNotifier.success')
      );
      setMessageType('success');
      setTitle('');
      setBody('');
    } else if (successCount === 0) {
      // 全部失败
      const failedResults = results
        .filter((r): r is PromiseFulfilledResult<{ key: typeof selectedKeys[0]; success: boolean; error?: string }> =>
          r.status === 'fulfilled' && !r.value.success
        )
        .map(r => r.value.error)
        .filter(Boolean)
        .join('; ');

      const updatedHistory = addHistoryRecord({
        title: title || defaultTitle,
        body: body || '',
        status: 'failed',
        errorMessage: failedResults || t('tools.barkNotifier.unknownError'),
        options: Object.keys(options).length > 0 ? options : undefined,
      });
      setHistory(updatedHistory);

      setMessage(t('tools.barkNotifier.error') + ': ' + (failedResults || t('tools.barkNotifier.unknownError')));
      setMessageType('error');
    } else {
      // 部分成功
      const updatedHistory = addHistoryRecord({
        title: title || defaultTitle,
        body: body || '',
        status: 'success',
        options: Object.keys(options).length > 0 ? options : undefined,
      });
      setHistory(updatedHistory);

      setMessage(t('tools.barkNotifier.partialSuccess', { success: successCount, failed: failedCount }));
      setMessageType('success');
      setTitle('');
      setBody('');
    }

    setIsSending(false);
  }, [selectedKeyIds, keys, title, body, enableSound, customIcon, messageGroup, defaultTitle, t]);



  // 删除历史记录
  const handleDeleteHistory = useCallback((id: string) => {
    const updated = deleteHistoryRecord(id);
    setHistory(updated);
  }, []);

  // 清空所有历史记录
  const handleClearAllHistory = useCallback(() => {
    if (confirm(t('tools.barkNotifier.deleteConfirm'))) {
      const updated = clearHistory();
      setHistory(updated);
    }
  }, [t]);

  // 重用历史记录
  const handleReuseHistory = useCallback((record: BarkNotificationRecord) => {
    setTitle(record.title);
    setBody(record.body);
  }, []);

  // 定时任务处理函数
  const handleCreateTask = useCallback(() => {
    setEditingTask(null);
    setIsTaskModalOpen(true);
  }, []);

  const handleEditTask = useCallback((task: ScheduledTask) => {
    setEditingTask(task);
    setIsTaskModalOpen(true);
  }, []);

  const handleSaveTask = useCallback((params: CreateTaskParams | UpdateTaskParams, taskId?: string) => {
    try {
      if (taskId) {
        taskService.updateTask(taskId, params as UpdateTaskParams);
        setMessage(t('tools.barkNotifier.scheduled.messages.updateSuccess'));
      } else {
        taskService.createTask(params as CreateTaskParams);
        setMessage(t('tools.barkNotifier.scheduled.messages.createSuccess'));
      }
      setMessageType('success');
      setScheduledTasks(taskService.getAllTasks());
    } catch (e) {
      setMessage((e as Error).message);
      setMessageType('error');
    }
  }, [taskService, t]);

  const handleDeleteTask = useCallback((taskId: string) => {
    const task = scheduledTasks.find(t => t.id === taskId);
    if (task && confirm(t('tools.barkNotifier.scheduled.list.deleteConfirm', { title: task.title }))) {
      try {
        taskService.deleteTask(taskId);
        setScheduledTasks(taskService.getAllTasks());
        setMessage(t('tools.barkNotifier.scheduled.messages.deleteSuccess'));
        setMessageType('success');
      } catch (e) {
        setMessage((e as Error).message);
        setMessageType('error');
      }
    }
  }, [taskService, scheduledTasks, t]);

  const handleToggleTaskStatus = useCallback((taskId: string) => {
    try {
      const updatedTask = taskService.toggleTaskStatus(taskId);
      setScheduledTasks(taskService.getAllTasks());
      setMessage(
        updatedTask.status === 'active'
          ? t('tools.barkNotifier.scheduled.messages.enableSuccess')
          : t('tools.barkNotifier.scheduled.messages.disableSuccess')
      );
      setMessageType('success');
    } catch (e) {
      setMessage((e as Error).message);
      setMessageType('error');
    }
  }, [taskService, t]);

  const handleViewTaskHistory = useCallback(async (taskId: string) => {
    const task = scheduledTasks.find(t => t.id === taskId);
    if (task) {
      setHistoryTaskTitle(task.title);
      const history = await taskService.getExecutionHistoryAsync(taskId);
      setExecutionHistory(history);
      setIsHistoryModalOpen(true);
    }
  }, [scheduledTasks, taskService]);

  return (
    <ToolCard
      tool={TOOL_METADATA[ToolId.BARK_NOTIFIER]}
      isExpanded={isExpanded}
      onToggleExpand={onToggleExpand}
    >
      <div className="h-full flex flex-col gap-4">
        {/* Tab 导航 */}
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={() => setActiveTab('instant')}
            className={`flex-1 px-4 py-2 rounded-lg nb-border transition-all ${
              activeTab === 'instant'
                ? 'nb-shadow'
                : 'opacity-70 hover:opacity-100'
            }`}
            style={{
              backgroundColor: activeTab === 'instant'
                ? 'var(--nb-accent-yellow)'
                : 'var(--nb-bg-card)',
            }}
          >
            <div className="flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-sm">send</span>
              <span className="font-medium text-sm">{t('tools.barkNotifier.send')}</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('scheduled')}
            className={`flex-1 px-4 py-2 rounded-lg nb-border transition-all ${
              activeTab === 'scheduled'
                ? 'nb-shadow'
                : 'opacity-70 hover:opacity-100'
            }`}
            style={{
              backgroundColor: activeTab === 'scheduled'
                ? 'var(--nb-accent-blue)'
                : 'var(--nb-bg-card)',
            }}
          >
            <div className="flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-sm">schedule</span>
              <span className="font-medium text-sm">
                {t('tools.barkNotifier.scheduled.title')}
                {scheduledTasks.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full nb-border" style={{ backgroundColor: 'var(--nb-accent-green)' }}>
                    {scheduledTasks.filter(t => t.status === 'active').length}
                  </span>
                )}
              </span>
            </div>
          </button>
        </div>

        {/* 消息提示 */}
        {message && (
          <div
            className={`nb-card-static p-3 flex-shrink-0 ${
              messageType === 'success' ? 'border-[color:var(--nb-accent-green)]' : 'border-[color:var(--nb-accent-pink)]'
            }`}
          >
            <p
              className={`text-sm ${
                messageType === 'success'
                  ? 'text-[color:var(--nb-accent-green)]'
                  : 'text-[color:var(--nb-accent-pink)]'
              }`}
            >
              {message}
            </p>
          </div>
        )}

        {/* 内容区域 */}
        <div className="flex-1 min-h-0">
          {activeTab === 'instant' ? (
            /* 即时发送 Tab */
            <div className="h-full grid grid-cols-2 gap-6">
              {/* 左侧：配置和发送 */}
              <div className="flex flex-col gap-4">
                {/* 密钥管理区 */}
                <div className="nb-card-static space-y-3 p-4 flex-shrink-0">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-main">
                      {t('tools.barkNotifier.keys.title')}
                    </h4>
                    <button
                      onClick={() => setIsModalOpen(true)}
                      className="nb-btn nb-btn-secondary text-xs px-3 py-1.5"
                    >
                      {t('tools.barkNotifier.keys.manage')}
                    </button>
                  </div>

                  <KeySelector
                    keys={keys}
                    selectedKeyIds={selectedKeyIds}
                    onMultiSelect={handleMultiSelect}
                    disabled={isSending}
                    multiSelect
                  />
                </div>

                {/* 使用说明 */}
                <div className="nb-card-static p-3 flex-shrink-0" style={{ borderColor: 'var(--nb-accent-blue)' }}>
                  <p className="text-xs" style={{ color: 'var(--nb-accent-blue)' }}>
                    {t('tools.barkNotifier.hint')}
                  </p>
                </div>

                {/* 预览区 */}
                <div className="flex-shrink-0">
                  <h4 className="text-sm font-medium text-main mb-2">
                    {t('tools.barkNotifier.preview')}
                  </h4>
                  <NotificationPreview title={title} body={body} />
                </div>

                {/* 通知内容 - 占据剩余空间 */}
                <div className="flex-1 flex flex-col gap-4 min-h-0">
                  {/* 高级选项 */}
                  <div className="nb-card-static flex-shrink-0 p-3 space-y-3">
                    <h5 className="text-xs font-medium nb-text-secondary mb-2">
                      {t('tools.barkNotifier.advancedOptions')}
                    </h5>

                    {/* 响铃开关 */}
                    <div className="flex items-center justify-between">
                      <label className="text-sm nb-text">
                        {t('tools.barkNotifier.enableSound')}
                      </label>
                      <label className="nb-toggle">
                        <input
                          type="checkbox"
                          checked={enableSound}
                          onChange={(e) => setEnableSound(e.target.checked)}
                          className="sr-only"
                        />
                        <div className={`nb-toggle-track ${enableSound ? 'active' : ''}`}>
                          <div className="nb-toggle-thumb"></div>
                        </div>
                      </label>
                    </div>

                    {/* 自定义图标 */}
                    <div>
                      <label className="block text-xs font-medium nb-text-secondary mb-1">
                        {t('tools.barkNotifier.customIcon')}
                      </label>
                      <input
                        type="text"
                        value={customIcon}
                        onChange={(e) => setCustomIcon(e.target.value)}
                        placeholder={t('tools.barkNotifier.customIconPlaceholder')}
                        className="nb-input w-full text-sm"
                      />
                    </div>

                    {/* 消息分组 */}
                    <div>
                      <label className="block text-xs font-medium nb-text-secondary mb-1">
                        {t('tools.barkNotifier.messageGroup')}
                      </label>
                      <input
                        type="text"
                        value={messageGroup}
                        onChange={(e) => setMessageGroup(e.target.value)}
                        placeholder={t('tools.barkNotifier.messageGroupPlaceholder')}
                        className="nb-input w-full text-sm"
                      />
                    </div>
                  </div>

                  <div className="flex-shrink-0">
                    <label className="block text-sm font-medium text-main mb-2">
                      {t('tools.barkNotifier.title')}
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      placeholder={t('tools.barkNotifier.titlePlaceholder')}
                      className="nb-input w-full text-sm"
                    />
                  </div>

                  <div className="flex-1 flex flex-col min-h-0">
                    <label className="block text-sm font-medium text-main mb-2 flex-shrink-0">
                      {t('tools.barkNotifier.body')}
                    </label>
                    <textarea
                      value={body}
                      onChange={e => setBody(e.target.value)}
                      placeholder={t('tools.barkNotifier.bodyPlaceholder')}
                      className="nb-input flex-1 text-sm resize-none"
                    />
                  </div>

                  {/* 发送按钮 */}
                  <button
                    onClick={sendNotification}
                    disabled={isSending || selectedKeyIds.length === 0}
                    className="nb-btn nb-btn-primary w-full px-4 py-3 text-base disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                  >
                    {isSending
                      ? t('tools.barkNotifier.sending')
                      : selectedKeyIds.length > 1
                        ? t('tools.barkNotifier.sendToMultiple', { count: selectedKeyIds.length })
                        : t('tools.barkNotifier.send')}
                  </button>
                </div>
              </div>

              {/* 右侧：历史记录 */}
              <div className="h-full min-h-0">
                <NotificationHistory
                  records={history}
                  onDelete={handleDeleteHistory}
                  onClearAll={handleClearAllHistory}
                  onReuse={handleReuseHistory}
                />
              </div>
            </div>
          ) : (
            /* 定时任务 Tab */
            <div className="h-full flex flex-col gap-4">
              {/* 操作栏 */}
              <div className="flex items-center justify-between flex-shrink-0">
                <h4 className="text-sm font-bold nb-text">
                  {t('tools.barkNotifier.scheduled.title')}
                </h4>
                <button
                  onClick={handleCreateTask}
                  className="nb-btn nb-btn-primary text-sm px-4 py-2"
                  disabled={keys.length === 0}
                >
                  <span className="material-symbols-outlined text-sm mr-1">add</span>
                  {t('tools.barkNotifier.scheduled.add')}
                </button>
              </div>

              {/* 任务列表 */}
              <div className="flex-1 min-h-0">
                <ScheduledTaskList
                  tasks={scheduledTasks}
                  onEdit={handleEditTask}
                  onDelete={handleDeleteTask}
                  onToggleStatus={handleToggleTaskStatus}
                  onViewHistory={handleViewTaskHistory}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 密钥管理模态框 */}
      <KeyManagementModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        keyManager={keyManager}
        onKeysChange={handleKeysChange}
      />

      {/* 定时任务模态框 */}
      <ScheduledTaskModal
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false);
          setEditingTask(null);
        }}
        onSave={handleSaveTask}
        editingTask={editingTask}
        keys={keys}
      />

      {/* 执行历史模态框 */}
      <ExecutionHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        taskTitle={historyTaskTitle}
        records={executionHistory}
      />
    </ToolCard>
  );
};
