/**
 * 订阅管理页面
 * 独立的订阅管理功能页面
 */
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '../../../components/Modal';
import { ConfirmDialog } from '../../../components/ConfirmDialog';
import { useToastContext } from '../../../contexts/ToastContext';
import {
  Subscription,
  CreateSubscriptionParams,
  SubscriptionSettings,
  DEFAULT_SUBSCRIPTION_SETTINGS,
  PageSizeOption,
  PAGE_SIZE_OPTIONS,
} from '../../../types/subscription';
import { subscriptionService, compareSubscriptions } from '../../../services/SubscriptionService';
import { getSubscriptionSettings, setSubscriptionSettings } from '../../../db/indexedDB';
import { subscriptionConfigExporter } from '../../../services/SubscriptionConfigExporter';
import type { ImportValidationIssue } from '../../../services/SubscriptionConfigExporter';
import { SubscriptionList } from './tools/subscription/SubscriptionList';
import { SubscriptionForm } from './tools/subscription/SubscriptionForm';
import { Pagination } from './tools/subscription/Pagination';
import {
  buildSubscriptionCalendar,
  filterSubscriptionsByMonth,
  getSubscriptionCalendarSummary,
} from '../../../utils/subscriptionCalendar';
import { getSubscriptionErrorMessageKey } from '../../../utils/subscriptionErrorMessages';
import { createLogger } from '../../../utils/logger';

const logger = createLogger('[SubscriptionsPage]');

export const SubscriptionsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const toast = useToastContext();
  const toastRef = useRef(toast);
  const importFileInputRef = useRef<HTMLInputElement>(null);
  
  // 状态
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  
  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  
  // 模态框状态
  const [showFormModal, setShowFormModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState<Subscription | undefined>();
  const [deleteConfirm, setDeleteConfirm] = useState<Subscription | null>(null);
  const [settings, setSettings] = useState<SubscriptionSettings>(DEFAULT_SUBSCRIPTION_SETTINGS);
  const [selectedMonthKey, setSelectedMonthKey] = useState<string | null>(null);
  const [importConfirmFile, setImportConfirmFile] = useState<File | null>(null);

  useEffect(() => {
    toastRef.current = toast;
  }, [toast]);

  const calendarMonths = useMemo(
    () => buildSubscriptionCalendar(subscriptions, Date.now(), 6),
    [subscriptions]
  );

  const calendarSummary = useMemo(
    () => getSubscriptionCalendarSummary(subscriptions, Date.now()),
    [subscriptions]
  );

  const visibleSubscriptions = useMemo(
    () => filterSubscriptionsByMonth(subscriptions, selectedMonthKey),
    [subscriptions, selectedMonthKey]
  );

  const selectedMonth = useMemo(
    () => calendarMonths.find((month) => month.key === selectedMonthKey),
    [calendarMonths, selectedMonthKey]
  );

  // 计算分页数据
  const paginationData = useMemo(() => {
    const pageSize = settings.pageSize || PAGE_SIZE_OPTIONS[0];
    const totalItems = visibleSubscriptions.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    
    // 确保当前页在有效范围内
    const validCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
    
    // 计算当前页的数据
    const startIndex = (validCurrentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const currentPageData = visibleSubscriptions.slice(startIndex, endIndex);
    
    return {
      pageSize,
      totalItems,
      totalPages,
      validCurrentPage,
      currentPageData,
    };
  }, [visibleSubscriptions, currentPage, settings.pageSize]);

  // 当分页数据变化时，自动调整当前页
  useEffect(() => {
    if (currentPage !== paginationData.validCurrentPage) {
      setCurrentPage(paginationData.validCurrentPage);
    }
  }, [currentPage, paginationData.validCurrentPage]);

  // 加载数据
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const subs = await subscriptionService.getAllSubscriptions();
      // 排序订阅
      const sortedSubs = subs.sort((a, b) => compareSubscriptions(a, b, Date.now()));
      setSubscriptions(sortedSubs);
      
      // 加载设置
      const subSettings = await getSubscriptionSettings();
      setSettings(subSettings);
    } catch (error) {
      logger.error('Failed to load subscription data', error);
      toastRef.current.error(t('subscriptions.feedback.loadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 处理页码变化
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const handleMonthSelect = useCallback((monthKey: string) => {
    setSelectedMonthKey((current) => current === monthKey ? null : monthKey);
    setCurrentPage(1);
  }, []);

  // 处理每页数量变化
  const handlePageSizeChange = useCallback(async (newPageSize: PageSizeOption) => {
    const newSettings = { ...settings, pageSize: newPageSize };
    try {
      await setSubscriptionSettings(newSettings);
      setSettings(newSettings);
      // 重置到第一页
      setCurrentPage(1);
    } catch (error) {
      logger.error('Failed to update page size', error);
      toast.error(t('subscriptions.feedback.settingsError'));
    }
  }, [settings, t, toast]);

  // 创建订阅
  const handleCreateSubscription = useCallback(async (data: CreateSubscriptionParams) => {
    try {
      await subscriptionService.createSubscription(data);
      await loadData();
      setShowFormModal(false);
      // 添加新订阅后跳转到第一页（因为排序后新订阅可能在前面）
      setCurrentPage(1);
      toast.success(t('subscriptions.feedback.createSuccess'));
    } catch (error) {
      logger.error('Failed to create subscription', error);
      toast.error(t(getSubscriptionErrorMessageKey(error)));
    }
  }, [loadData, t, toast]);

  // 更新订阅
  const handleUpdateSubscription = useCallback(async (data: CreateSubscriptionParams) => {
    if (!editingSubscription) return;
    
    try {
      await subscriptionService.updateSubscription(editingSubscription.id, data);
      await loadData();
      setShowFormModal(false);
      setEditingSubscription(undefined);
      toast.success(t('subscriptions.feedback.updateSuccess'));
    } catch (error) {
      logger.error('Failed to update subscription', error);
      toast.error(t(getSubscriptionErrorMessageKey(error)));
    }
  }, [editingSubscription, loadData, t, toast]);

  // 删除订阅
  const handleDeleteSubscription = useCallback(async () => {
    if (!deleteConfirm) return;
    
    try {
      await subscriptionService.deleteSubscription(deleteConfirm.id);
      await loadData();
      setDeleteConfirm(null);
      toast.success(t('subscriptions.feedback.deleteSuccess'));
    } catch (error) {
      logger.error('Failed to delete subscription', error);
      toast.error(t(getSubscriptionErrorMessageKey(error)));
    }
  }, [deleteConfirm, loadData, t, toast]);

  // 切换启用状态
  const handleToggleEnabled = useCallback(async (subscription: Subscription) => {
    try {
      await subscriptionService.toggleEnabled(subscription.id);
      await loadData();
      toast.success(
        t(subscription.isEnabled
          ? 'subscriptions.feedback.disableSuccess'
          : 'subscriptions.feedback.enableSuccess')
      );
    } catch (error) {
      logger.error('Failed to toggle subscription', error);
      toast.error(t(getSubscriptionErrorMessageKey(error)));
    }
  }, [loadData, t, toast]);

  // 续订
  const handleRenew = useCallback(async (subscription: Subscription) => {
    try {
      await subscriptionService.renewSubscription(subscription.id);
      await loadData();
      toast.success(t('subscriptions.feedback.renewSuccess'));
    } catch (error) {
      logger.error('Failed to renew subscription', error);
      toast.error(t(getSubscriptionErrorMessageKey(error, 'renew')));
    }
  }, [loadData, t, toast]);

  // 编辑订阅
  const handleEdit = useCallback((subscription: Subscription) => {
    setEditingSubscription(subscription);
    setShowFormModal(true);
  }, []);

  // 更新设置
  const handleUpdateSettings = useCallback(async (newSettings: SubscriptionSettings) => {
    try {
      await setSubscriptionSettings(newSettings);
      setSettings(newSettings);
      toast.success(t('subscriptions.feedback.settingsSuccess'));
    } catch (error) {
      logger.error('Failed to update settings', error);
      toast.error(t('subscriptions.feedback.settingsError'));
    }
  }, [t, toast]);

  const handleExportConfig = useCallback(async () => {
    try {
      const blob = await subscriptionConfigExporter.exportAsBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');

      link.href = url;
      link.download = subscriptionConfigExporter.generateExportFilename();
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success(t('subscriptions.backup.exportSuccess'));
    } catch (error) {
      logger.error('Failed to export subscription config', error);
      toast.error(t('subscriptions.backup.exportError'));
    }
  }, [t, toast]);

  const getImportIssueMessage = useCallback((issue: ImportValidationIssue) => {
    return t(`subscriptions.backup.validation.${issue.code}`, issue.values);
  }, [t]);

  const handleImportFileSelected = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    event.target.value = '';

    if (!file) {
      return;
    }

    try {
      const content = await file.text();
      const validation = subscriptionConfigExporter.validateImport(content);

      if (!validation.valid) {
        const firstIssue = validation.issues[0];
        toast.error(firstIssue ? getImportIssueMessage(firstIssue) : t('subscriptions.backup.importError'));
        return;
      }

      setImportConfirmFile(file);
    } catch (error) {
      logger.error('Failed to read subscription backup file', error);
      toast.error(t('subscriptions.backup.importReadError'));
    }
  }, [getImportIssueMessage, t, toast]);

  const handleConfirmImport = useCallback(async () => {
    if (!importConfirmFile) return;

    try {
      const result = await subscriptionConfigExporter.importFromFile(importConfirmFile, 'merge');

      if (!result.success) {
        const firstIssue = result.issues?.[0];
        toast.error(
          firstIssue
            ? getImportIssueMessage(firstIssue)
            : t('subscriptions.backup.importError')
        );
        return;
      }

      await loadData();
      setImportConfirmFile(null);
      toast.success(t('subscriptions.backup.importSuccess', {
        imported: result.importedCount,
        skipped: result.skippedCount,
      }));
    } catch (error) {
      logger.error('Failed to import subscription config', error);
      toast.error(t('subscriptions.backup.importError'));
    }
  }, [getImportIssueMessage, importConfirmFile, loadData, t, toast]);

  const dateLocale = i18n.language === 'zh-CN' ? 'zh-CN' : 'en-US';

  const formatMonthLabel = useCallback((timestamp: number) => {
    return new Date(timestamp).toLocaleDateString(dateLocale, {
      year: 'numeric',
      month: 'short',
    });
  }, [dateLocale]);

  const formatShortDate = useCallback((timestamp: number) => {
    return new Date(timestamp).toLocaleDateString(dateLocale, {
      month: 'short',
      day: 'numeric',
    });
  }, [dateLocale]);

  const summaryCards = [
    {
      key: 'expired',
      icon: 'priority_high',
      label: t('subscriptions.calendar.expired'),
      value: calendarSummary.expired,
      colorClass: 'bg-[color:var(--nb-accent-pink)]',
    },
    {
      key: 'thisMonth',
      icon: 'calendar_month',
      label: t('subscriptions.calendar.thisMonth'),
      value: calendarSummary.thisMonth,
      colorClass: 'bg-[color:var(--nb-accent-yellow)]',
    },
    {
      key: 'next30Days',
      icon: 'event_upcoming',
      label: t('subscriptions.calendar.next30Days'),
      value: calendarSummary.next30Days,
      colorClass: 'bg-[color:var(--nb-accent-blue)]',
    },
    {
      key: 'enabled',
      icon: 'toggle_on',
      label: t('subscriptions.calendar.enabled'),
      value: calendarSummary.enabled,
      colorClass: 'bg-[color:var(--nb-accent-green)]',
    },
  ];

  return (
    <div className="p-8 h-full flex flex-col">
      {/* 页面标题 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-3xl text-[var(--nb-accent-yellow)]">
            subscriptions
          </span>
          <h1 className="text-2xl font-bold nb-text">
            {t('subscriptions.title')}
          </h1>
        </div>
        
        {/* 操作按钮 */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSettingsModal(true)}
            className="nb-btn nb-btn-ghost"
            title={t('subscriptions.settings')}
          >
            <span className="material-symbols-outlined text-sm">settings</span>
          </button>
          <button
            onClick={() => {
              setEditingSubscription(undefined);
              setShowFormModal(true);
            }}
            className="nb-btn nb-btn-primary"
          >
            <span className="material-symbols-outlined text-sm mr-1">add</span>
            {t('subscriptions.add')}
          </button>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-auto flex flex-col">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <span className="material-symbols-outlined animate-spin text-4xl nb-text-secondary">
              progress_activity
            </span>
          </div>
        ) : (
          <>
            <div className="mb-5 space-y-4">
              <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
                {summaryCards.map((card) => (
                  <div key={card.key} className="nb-card-static p-4 flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg border-2 border-[var(--nb-border)] flex items-center justify-center ${card.colorClass}`}>
                      <span className="material-symbols-outlined text-xl text-[var(--nb-border)]">
                        {card.icon}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <div className="text-2xl font-bold nb-text leading-none">
                        {card.value}
                      </div>
                      <div className="text-xs font-semibold nb-text-secondary mt-1 truncate">
                        {card.label}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="nb-card-static p-4">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-xl text-[var(--nb-accent-blue)]">
                      date_range
                    </span>
                    <h2 className="text-base font-bold nb-text">
                      {t('subscriptions.calendar.overview')}
                    </h2>
                    {selectedMonth && (
                      <span className="nb-badge nb-badge-blue">
                        {t('subscriptions.calendar.filterTitle', {
                          month: formatMonthLabel(selectedMonth.startDate),
                        })}
                      </span>
                    )}
                  </div>
                  {selectedMonthKey && (
                    <button
                      type="button"
                      className="nb-btn nb-btn-ghost px-3 py-1.5 text-sm"
                      onClick={() => {
                        setSelectedMonthKey(null);
                        setCurrentPage(1);
                      }}
                    >
                      {t('subscriptions.calendar.clearFilter')}
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-3">
                  {calendarMonths.map((month) => {
                    const hasSubscriptions = month.subscriptions.length > 0;
                    const isSelected = selectedMonthKey === month.key;

                    return (
                      <button
                        key={month.key}
                        type="button"
                        onClick={() => hasSubscriptions && handleMonthSelect(month.key)}
                        className={`text-left nb-card-subtle p-4 transition-all ${
                          isSelected
                            ? 'bg-[color:var(--nb-accent-yellow)] shadow-[2px_2px_0px_0px_var(--nb-border)] translate-x-[1px] translate-y-[1px]'
                            : hasSubscriptions
                              ? 'bg-[color:var(--nb-card)] hover:shadow-[2px_2px_0px_0px_var(--nb-border)] hover:translate-x-[1px] hover:translate-y-[1px]'
                              : 'bg-[color:var(--nb-bg)] opacity-70 cursor-default'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div>
                            <div className="text-sm font-bold nb-text">
                              {formatMonthLabel(month.startDate)}
                            </div>
                            <div className="text-xs nb-text-secondary mt-1">
                              {hasSubscriptions
                                ? t('subscriptions.calendar.monthCount', { count: month.subscriptions.length })
                                : t('subscriptions.calendar.monthEmpty')
                              }
                            </div>
                          </div>
                          <div className="flex gap-1">
                            {month.expiredCount > 0 && (
                              <span className="nb-badge nb-badge-pink">
                                {month.expiredCount}
                              </span>
                            )}
                            {month.upcomingCount > 0 && (
                              <span className="nb-badge nb-badge-green">
                                {month.upcomingCount}
                              </span>
                            )}
                            {month.disabledCount > 0 && (
                              <span className="nb-badge nb-badge-yellow">
                                {month.disabledCount}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="space-y-2">
                          {month.subscriptions.slice(0, 3).map((subscription) => (
                            <div key={subscription.id} className="flex items-center justify-between gap-3 text-xs">
                              <span className="font-medium nb-text truncate">
                                {subscription.name}
                              </span>
                              <span className="nb-text-secondary flex-shrink-0">
                                {formatShortDate(subscription.expiryDate)}
                              </span>
                            </div>
                          ))}
                          {month.subscriptions.length > 3 && (
                            <div className="text-xs font-semibold nb-text-secondary">
                              {t('subscriptions.calendar.moreItems', {
                                count: month.subscriptions.length - 3,
                              })}
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex-1">
              <SubscriptionList
                subscriptions={paginationData.currentPageData}
                emptyTitle={selectedMonthKey ? t('subscriptions.calendar.filterEmpty') : undefined}
                emptyHint={selectedMonthKey ? t('subscriptions.calendar.filterEmptyHint') : undefined}
                onEdit={handleEdit}
                onDelete={(sub) => setDeleteConfirm(sub)}
                onToggleEnabled={handleToggleEnabled}
                onRenew={handleRenew}
              />
            </div>
            
            {/* 分页组件 */}
            <Pagination
              currentPage={paginationData.validCurrentPage}
              totalPages={paginationData.totalPages}
              totalItems={paginationData.totalItems}
              pageSize={paginationData.pageSize}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
            />
          </>
        )}
      </div>

      {/* 订阅表单模态框 */}
      <Modal
        isOpen={showFormModal}
        onClose={() => {
          setShowFormModal(false);
          setEditingSubscription(undefined);
        }}
        title={editingSubscription 
          ? t('subscriptions.edit')
          : t('subscriptions.add')
        }
      >
        <SubscriptionForm
          subscription={editingSubscription}
          defaultReminderDays={7}
          onSubmit={editingSubscription ? handleUpdateSubscription : handleCreateSubscription}
          onCancel={() => {
            setShowFormModal(false);
            setEditingSubscription(undefined);
          }}
        />
      </Modal>

      {/* 删除确认对话框 */}
      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDeleteSubscription}
        title={t('subscriptions.delete')}
        message={t('subscriptions.deleteConfirm', {
          name: deleteConfirm?.name
        })}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        danger
      />

      {/* 设置模态框 */}
      <Modal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        title={t('subscriptions.settings')}
      >
        <div className="space-y-4">
          {/* 每日重复提醒 */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium nb-text">{t('subscriptions.dailyReminder')}</p>
              <p className="text-xs nb-text-secondary mt-1">
                {t('subscriptions.dailyReminderHint')}
              </p>
            </div>
            <button
              onClick={() => handleUpdateSettings({ ...settings, dailyReminder: !settings.dailyReminder })}
              className="nb-toggle"
            >
              <span className={`nb-toggle-track ${settings.dailyReminder ? 'active' : ''}`}>
                <span className="nb-toggle-thumb" />
              </span>
            </button>
          </div>

          {/* 默认提醒天数 */}
          <div>
            <label className="block text-sm font-medium nb-text mb-2">
              {t('subscriptions.defaultReminderDays')}
            </label>
            <select
              value={settings.defaultReminderDays}
              onChange={(e) => handleUpdateSettings({ ...settings, defaultReminderDays: parseInt(e.target.value) })}
              className="nb-input w-full text-sm"
            >
              {[1, 3, 5, 7, 14, 30].map((days) => (
                <option key={days} value={days}>
                  {t('subscriptions.daysOption', { days })}
                </option>
              ))}
            </select>
          </div>

          {/* 备份与恢复 */}
          <div className="nb-border-t pt-4">
            <div className="mb-3">
              <p className="text-sm font-medium nb-text">{t('subscriptions.backup.title')}</p>
              <p className="text-xs nb-text-secondary mt-1">
                {t('subscriptions.backup.description')}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="nb-btn nb-btn-info"
                onClick={handleExportConfig}
              >
                <span className="material-symbols-outlined text-sm">download</span>
                {t('subscriptions.backup.export')}
              </button>
              <button
                type="button"
                className="nb-btn nb-btn-ghost"
                onClick={() => importFileInputRef.current?.click()}
              >
                <span className="material-symbols-outlined text-sm">upload</span>
                {t('subscriptions.backup.importMerge')}
              </button>
            </div>

            <input
              ref={importFileInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={handleImportFileSelected}
            />
          </div>
        </div>
      </Modal>

      {/* 导入确认对话框 */}
      <ConfirmDialog
        isOpen={!!importConfirmFile}
        onClose={() => setImportConfirmFile(null)}
        onConfirm={handleConfirmImport}
        title={t('subscriptions.backup.importConfirmTitle')}
        message={t('subscriptions.backup.importConfirmMessage', {
          name: importConfirmFile?.name || '',
        })}
        confirmText={t('subscriptions.backup.importMerge')}
        cancelText={t('common.cancel')}
      />
    </div>
  );
};

export default SubscriptionsPage;
