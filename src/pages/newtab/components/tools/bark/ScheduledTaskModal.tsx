/**
 * 定时任务创建/编辑模态框组件
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ScheduledTask,
  ScheduledTaskType,
  CreateTaskParams,
  UpdateTaskParams,
  ScheduledTaskOptions,
} from '../../../../../types/scheduledTask';
import { BarkKey } from '../../../../../types/bark';
import { KeySelector } from './KeySelector';
import { CronConfigPanel } from './CronConfigPanel';
import { validateCreateParams } from '../../../../../utils/scheduledTaskValidator';
import { Modal } from '../../../../../components/Modal';

interface ScheduledTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (params: CreateTaskParams | UpdateTaskParams, taskId?: string) => void;
  editingTask?: ScheduledTask | null;
  keys: BarkKey[];
}

/**
 * 日期时间选择器组件
 */
const DateTimePicker: React.FC<{
  value: number | undefined;
  onChange: (timestamp: number) => void;
  minDate?: Date;
}> = ({ value, onChange, minDate }) => {
  // 转换时间戳为本地日期时间字符串
  const dateTimeValue = useMemo(() => {
    if (!value) return '';
    const date = new Date(value);
    // 格式化为 YYYY-MM-DDTHH:mm
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }, [value]);

  // 最小日期时间
  const minDateTime = useMemo(() => {
    const min = minDate || new Date();
    min.setMinutes(min.getMinutes() + 2); // 至少 2 分钟后
    const year = min.getFullYear();
    const month = String(min.getMonth() + 1).padStart(2, '0');
    const day = String(min.getDate()).padStart(2, '0');
    const hours = String(min.getHours()).padStart(2, '0');
    const minutes = String(min.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }, [minDate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dateTime = new Date(e.target.value);
    if (!isNaN(dateTime.getTime())) {
      onChange(dateTime.getTime());
    }
  };

  return (
    <input
      type="datetime-local"
      value={dateTimeValue}
      onChange={handleChange}
      min={minDateTime}
      className="nb-input w-full text-sm"
    />
  );
};

/**
 * 定时任务模态框主组件
 */
export const ScheduledTaskModal: React.FC<ScheduledTaskModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingTask,
  keys,
}) => {
  const { t } = useTranslation();

  // 表单状态
  const [taskType, setTaskType] = useState<ScheduledTaskType>('one-time');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [selectedKeyIds, setSelectedKeyIds] = useState<string[]>([]);
  const [scheduledTime, setScheduledTime] = useState<number | undefined>();
  const [cronExpression, setCronExpression] = useState('0 9 * * *');
  
  // 高级选项
  const [enableSound, setEnableSound] = useState(true);
  const [customIcon, setCustomIcon] = useState('');
  const [messageGroup, setMessageGroup] = useState('');
  
  // 验证错误
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 是否为编辑模式
  const isEditing = !!editingTask;

  // 初始化表单（编辑模式）
  useEffect(() => {
    if (editingTask) {
      setTaskType(editingTask.type);
      setTitle(editingTask.title);
      setBody(editingTask.body);
      setSelectedKeyIds(editingTask.targetKeyIds);
      setScheduledTime(editingTask.scheduledTime);
      setCronExpression(editingTask.cronExpression || '0 9 * * *');
      setEnableSound(editingTask.options?.sound !== '');
      setCustomIcon(editingTask.options?.icon || '');
      setMessageGroup(editingTask.options?.group || '');
    } else {
      // 重置表单
      setTaskType('one-time');
      setTitle('');
      setBody('');
      setSelectedKeyIds(keys.length > 0 ? [keys[0].id] : []);
      setScheduledTime(undefined);
      setCronExpression('0 9 * * *');
      setEnableSound(true);
      setCustomIcon('');
      setMessageGroup('');
    }
    setErrors({});
  }, [editingTask, keys, isOpen]);

  // 验证表单
  const validateForm = useCallback((): boolean => {
    const params: CreateTaskParams = {
      type: taskType,
      title,
      body,
      targetKeyIds: selectedKeyIds,
      scheduledTime: taskType === 'one-time' ? scheduledTime : undefined,
      cronExpression: taskType === 'recurring' ? cronExpression : undefined,
    };

    const result = validateCreateParams(params);
    
    if (!result.valid) {
      const newErrors: Record<string, string> = {};
      for (const error of result.errors) {
        newErrors[error.field] = t(error.message);
      }
      setErrors(newErrors);
      return false;
    }

    setErrors({});
    return true;
  }, [taskType, title, body, selectedKeyIds, scheduledTime, cronExpression, t]);

  // 保存任务
  const handleSave = useCallback(() => {
    if (!validateForm()) return;

    const options: ScheduledTaskOptions = {};
    if (!enableSound) options.sound = '';
    if (customIcon.trim()) options.icon = customIcon.trim();
    if (messageGroup.trim()) options.group = messageGroup.trim();

    if (isEditing && editingTask) {
      // 更新任务
      const updateParams: UpdateTaskParams = {
        title,
        body,
        targetKeyIds: selectedKeyIds,
        options: Object.keys(options).length > 0 ? options : undefined,
      };
      
      if (taskType === 'one-time') {
        updateParams.scheduledTime = scheduledTime;
      } else {
        updateParams.cronExpression = cronExpression;
      }
      
      onSave(updateParams, editingTask.id);
    } else {
      // 创建任务
      const createParams: CreateTaskParams = {
        type: taskType,
        title,
        body,
        targetKeyIds: selectedKeyIds,
        options: Object.keys(options).length > 0 ? options : undefined,
        scheduledTime: taskType === 'one-time' ? scheduledTime : undefined,
        cronExpression: taskType === 'recurring' ? cronExpression : undefined,
      };
      
      onSave(createParams);
    }

    onClose();
  }, [
    validateForm, isEditing, editingTask, taskType, title, body,
    selectedKeyIds, scheduledTime, cronExpression, enableSound,
    customIcon, messageGroup, onSave, onClose
  ]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing
        ? t('tools.barkNotifier.scheduled.editTask')
        : t('tools.barkNotifier.scheduled.createTask')}
      widthClass="max-w-2xl"
    >
      {/* 表单内容 */}
      <div className="space-y-5 max-h-[70vh] overflow-y-auto pr-2">
        {/* 任务类型选择 */}
        {!isEditing && (
          <div>
            <label className="block text-sm font-medium nb-text mb-2">
              {t('tools.barkNotifier.scheduled.taskType')}
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setTaskType('one-time')}
                className={`flex-1 px-4 py-3 rounded-lg nb-border transition-all ${
                  taskType === 'one-time'
                    ? 'nb-shadow'
                    : 'opacity-70 hover:opacity-100'
                }`}
                style={{
                  backgroundColor: taskType === 'one-time'
                    ? 'var(--nb-accent-blue)'
                    : 'var(--nb-bg-card)',
                }}
              >
                <div className="flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined">event</span>
                  <span className="font-medium">
                    {t('tools.barkNotifier.scheduled.type.one-time')}
                  </span>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setTaskType('recurring')}
                className={`flex-1 px-4 py-3 rounded-lg nb-border transition-all ${
                  taskType === 'recurring'
                    ? 'nb-shadow'
                    : 'opacity-70 hover:opacity-100'
                }`}
                style={{
                  backgroundColor: taskType === 'recurring'
                    ? 'var(--nb-accent-yellow)'
                    : 'var(--nb-bg-card)',
                }}
              >
                <div className="flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined">repeat</span>
                  <span className="font-medium">
                    {t('tools.barkNotifier.scheduled.type.recurring')}
                  </span>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* 通知标题 */}
        <div>
          <label className="block text-sm font-medium nb-text mb-2">
            {t('tools.barkNotifier.title')} *
          </label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder={t('tools.barkNotifier.titlePlaceholder')}
            className={`nb-input w-full ${errors.title ? 'border-[var(--nb-accent-pink)]' : ''}`}
          />
          {errors.title && (
            <p className="text-xs mt-1" style={{ color: 'var(--nb-accent-pink)' }}>
              {errors.title}
            </p>
          )}
        </div>

        {/* 通知内容 */}
        <div>
          <label className="block text-sm font-medium nb-text mb-2">
            {t('tools.barkNotifier.body')} *
          </label>
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder={t('tools.barkNotifier.bodyPlaceholder')}
            rows={3}
            className={`nb-input w-full resize-none ${errors.body ? 'border-[var(--nb-accent-pink)]' : ''}`}
          />
          {errors.body && (
            <p className="text-xs mt-1" style={{ color: 'var(--nb-accent-pink)' }}>
              {errors.body}
            </p>
          )}
        </div>

        {/* 目标设备 */}
        <div>
          <label className="block text-sm font-medium nb-text mb-2">
            {t('tools.barkNotifier.keys.title')} *
          </label>
          <KeySelector
            keys={keys}
            selectedKeyIds={selectedKeyIds}
            onMultiSelect={setSelectedKeyIds}
            multiSelect
          />
          {errors.targetKeyIds && (
            <p className="text-xs mt-1" style={{ color: 'var(--nb-accent-pink)' }}>
              {errors.targetKeyIds}
            </p>
          )}
        </div>

        {/* 时间配置 */}
        <div>
          <label className="block text-sm font-medium nb-text mb-2">
            {taskType === 'one-time'
              ? t('tools.barkNotifier.scheduled.scheduledTime')
              : t('tools.barkNotifier.scheduled.cronExpression')} *
          </label>
          
          {taskType === 'one-time' ? (
            <div>
              <DateTimePicker
                value={scheduledTime}
                onChange={setScheduledTime}
              />
              {errors.scheduledTime && (
                <p className="text-xs mt-1" style={{ color: 'var(--nb-accent-pink)' }}>
                  {errors.scheduledTime}
                </p>
              )}
            </div>
          ) : (
            <div>
              <CronConfigPanel
                value={cronExpression}
                onChange={setCronExpression}
                previewCount={5}
              />
              {errors.cronExpression && (
                <p className="text-xs mt-1" style={{ color: 'var(--nb-accent-pink)' }}>
                  {errors.cronExpression}
                </p>
              )}
            </div>
          )}
        </div>

        {/* 高级选项 */}
        <div className="nb-card-static p-4 space-y-3">
          <h4 className="text-sm font-medium nb-text-secondary">
            {t('tools.barkNotifier.advancedOptions')}
          </h4>
          
          {/* 响铃开关 */}
          <div className="flex items-center justify-between">
            <label className="text-sm nb-text">
              {t('tools.barkNotifier.enableSound')}
            </label>
            <label className="nb-toggle">
              <input
                type="checkbox"
                checked={enableSound}
                onChange={e => setEnableSound(e.target.checked)}
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
              onChange={e => setCustomIcon(e.target.value)}
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
              onChange={e => setMessageGroup(e.target.value)}
              placeholder={t('tools.barkNotifier.messageGroupPlaceholder')}
              className="nb-input w-full text-sm"
            />
          </div>
        </div>
      </div>

      {/* 底部按钮 */}
      <div className="flex justify-end gap-3 mt-6 pt-4 border-t-2 border-[var(--nb-border)]">
        <button
          onClick={onClose}
          className="nb-btn nb-btn-secondary px-6 py-2"
        >
          {t('common.cancel')}
        </button>
        <button
          onClick={handleSave}
          className="nb-btn nb-btn-primary px-6 py-2"
        >
          {isEditing ? t('common.save') : t('tools.barkNotifier.scheduled.create')}
        </button>
      </div>
    </Modal>
  );
};
