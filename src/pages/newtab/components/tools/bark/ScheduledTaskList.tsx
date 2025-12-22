/**
 * 定时任务列表组件
 * 显示所有定时任务，支持编辑、删除、启用/禁用操作
 */

import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ScheduledTask, ScheduledTaskStatus } from '../../../../../types/scheduledTask';

interface ScheduledTaskListProps {
  tasks: ScheduledTask[];
  onEdit: (task: ScheduledTask) => void;
  onDelete: (taskId: string) => void;
  onToggleStatus: (taskId: string) => void;
  onViewHistory: (taskId: string) => void;
}

/**
 * 获取状态徽章样式
 */
const getStatusBadgeStyle = (status: ScheduledTaskStatus) => {
  switch (status) {
    case 'active':
      return {
        bg: 'var(--nb-accent-green)',
        text: 'var(--nb-text)',
      };
    case 'paused':
      return {
        bg: 'var(--nb-accent-yellow)',
        text: 'var(--nb-text)',
      };
    case 'completed':
      return {
        bg: 'var(--nb-accent-blue)',
        text: 'var(--nb-text)',
      };
    case 'failed':
      return {
        bg: 'var(--nb-accent-pink)',
        text: 'var(--nb-text)',
      };
    default:
      return {
        bg: 'var(--nb-bg-base)',
        text: 'var(--nb-text)',
      };
  }
};

/**
 * 格式化下次执行时间
 */
const formatNextExecutionTime = (timestamp?: number): string => {
  if (!timestamp) return '-';
  return new Date(timestamp).toLocaleString();
};

/**
 * 单个任务项组件
 */
const TaskItem: React.FC<{
  task: ScheduledTask;
  onEdit: () => void;
  onDelete: () => void;
  onToggleStatus: () => void;
  onViewHistory: () => void;
}> = ({ task, onEdit, onDelete, onToggleStatus, onViewHistory }) => {
  const { t } = useTranslation();
  const statusStyle = getStatusBadgeStyle(task.status);

  const canToggle = task.status === 'active' || task.status === 'paused';

  return (
    <div
      className="nb-card-static p-4 hover:shadow-[var(--nb-shadow-hover)] hover:-translate-y-[1px] transition-all"
    >
      <div className="flex items-start justify-between gap-3">
        {/* 左侧：任务信息 */}
        <div className="flex-1 min-w-0">
          {/* 标题和类型 */}
          <div className="flex items-center gap-2 mb-1">
            <span className="font-bold text-sm nb-text truncate">
              {task.title}
            </span>
            {/* 类型徽章 */}
            <span
              className="nb-badge text-xs px-2 py-0.5"
              style={{
                backgroundColor: task.type === 'one-time' ? 'var(--nb-accent-blue)' : 'var(--nb-accent-yellow)',
              }}
            >
              {t(`tools.barkNotifier.scheduled.type.${task.type}`)}
            </span>
            {/* 状态徽章 */}
            <span
              className="nb-badge text-xs px-2 py-0.5"
              style={{
                backgroundColor: statusStyle.bg,
                color: statusStyle.text,
              }}
            >
              {t(`tools.barkNotifier.scheduled.status.${task.status}`)}
            </span>
          </div>

          {/* 内容预览 */}
          <p className="text-xs nb-text-secondary line-clamp-1 mb-2">
            {task.body}
          </p>

          {/* 时间信息 */}
          <div className="flex items-center gap-4 text-xs nb-text-secondary">
            {/* 下次执行时间 */}
            <div className="flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">schedule</span>
              <span>
                {task.status === 'completed'
                  ? t('tools.barkNotifier.scheduled.completed')
                  : task.nextExecutionTime
                    ? formatNextExecutionTime(task.nextExecutionTime)
                    : '-'}
              </span>
            </div>

            {/* Cron 表达式（周期性任务） */}
            {task.type === 'recurring' && task.cronExpression && (
              <div className="flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">repeat</span>
                <span className="font-mono">{task.cronExpression}</span>
              </div>
            )}
          </div>
        </div>

        {/* 右侧：操作按钮 */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* 查看历史 */}
          <button
            onClick={onViewHistory}
            className="nb-btn nb-btn-ghost p-2 rounded-lg"
            title={t('tools.barkNotifier.scheduled.viewHistory')}
          >
            <span className="material-symbols-outlined text-sm">history</span>
          </button>

          {/* 启用/禁用 */}
          {canToggle && (
            <button
              onClick={onToggleStatus}
              className="nb-btn nb-btn-ghost p-2 rounded-lg"
              title={task.status === 'active'
                ? t('tools.barkNotifier.scheduled.pause')
                : t('tools.barkNotifier.scheduled.resume')}
            >
              <span className="material-symbols-outlined text-sm">
                {task.status === 'active' ? 'pause' : 'play_arrow'}
              </span>
            </button>
          )}

          {/* 编辑 */}
          <button
            onClick={onEdit}
            className="nb-btn nb-btn-ghost p-2 rounded-lg"
            title={t('common.edit')}
          >
            <span className="material-symbols-outlined text-sm">edit</span>
          </button>

          {/* 删除 */}
          <button
            onClick={onDelete}
            className="nb-btn nb-btn-ghost p-2 rounded-lg"
            style={{ color: 'var(--nb-accent-pink)' }}
            title={t('common.delete')}
          >
            <span className="material-symbols-outlined text-sm">delete</span>
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * 定时任务列表组件
 */
export const ScheduledTaskList: React.FC<ScheduledTaskListProps> = ({
  tasks,
  onEdit,
  onDelete,
  onToggleStatus,
  onViewHistory,
}) => {
  const { t } = useTranslation();

  // 按状态和创建时间排序
  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => {
      // 优先级：active > paused > failed > completed
      const statusOrder: Record<ScheduledTaskStatus, number> = {
        active: 0,
        paused: 1,
        failed: 2,
        completed: 3,
      };
      const statusDiff = statusOrder[a.status] - statusOrder[b.status];
      if (statusDiff !== 0) return statusDiff;
      
      // 同状态按创建时间降序
      return b.createdAt - a.createdAt;
    });
  }, [tasks]);

  if (tasks.length === 0) {
    return (
      <div className="nb-card-static h-full flex flex-col items-center justify-center text-center p-6">
        <div
          className="p-4 rounded-full nb-border nb-shadow mb-4"
          style={{ backgroundColor: 'var(--nb-card)' }}
        >
          <span className="material-symbols-outlined text-4xl nb-text-secondary">
            schedule
          </span>
        </div>
        <p className="text-base font-bold nb-text mb-2">
          {t('tools.barkNotifier.scheduled.noTasks')}
        </p>
        <p className="text-sm nb-text-secondary">
          {t('tools.barkNotifier.scheduled.noTasksHint')}
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* 头部 */}
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <h4 className="text-sm font-bold nb-text">
          {t('tools.barkNotifier.scheduled.taskCount', { count: tasks.length })}
        </h4>
      </div>

      {/* 任务列表 */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-0">
        {sortedTasks.map(task => (
          <TaskItem
            key={task.id}
            task={task}
            onEdit={() => onEdit(task)}
            onDelete={() => onDelete(task.id)}
            onToggleStatus={() => onToggleStatus(task.id)}
            onViewHistory={() => onViewHistory(task.id)}
          />
        ))}
      </div>
    </div>
  );
};
