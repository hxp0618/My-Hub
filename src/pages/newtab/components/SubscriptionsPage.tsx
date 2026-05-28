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
  parsePageSizeOption,
} from '../../../types/subscription';
import { subscriptionService, compareSubscriptions } from '../../../services/SubscriptionService';
import { getSubscriptionSettings, setSubscriptionSettings } from '../../../db/indexedDB';
import { subscriptionConfigExporter } from '../../../services/SubscriptionConfigExporter';
import type { ImportValidationIssue } from '../../../services/SubscriptionConfigExporter';
import { SubscriptionList } from './tools/subscription/SubscriptionList';
import {
  SubscriptionForm,
  parseSubscriptionReminderDays,
} from './tools/subscription/SubscriptionForm';
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
    const pageSize = parsePageSizeOption(settings.pageSize, PAGE_SIZE_OPTIONS[0]);
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
    <div className="subscriptions-page-shell nb-bg nb-text">
      {/* 页面标题 */}
      <header className="subscriptions-page-header nb-card-static">
        <div className="subscriptions-page-title-group">
          <div className="subscriptions-page-title-main">
            <span className="material-symbols-outlined text-3xl text-[var(--nb-accent-yellow)]">
              subscriptions
            </span>
            <h1 className="text-2xl font-bold nb-text">
              {t('subscriptions.title')}
            </h1>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="subscriptions-page-actions">
          <button
            type="button"
            onClick={() => setShowSettingsModal(true)}
            className="subscriptions-page-icon-button nb-btn nb-btn-ghost"
            title={t('subscriptions.settings')}
            aria-label={t('subscriptions.settings')}
          >
            <span className="material-symbols-outlined text-sm">settings</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setEditingSubscription(undefined);
              setShowFormModal(true);
            }}
            className="subscriptions-page-add-button nb-btn nb-btn-primary"
          >
            <span className="material-symbols-outlined text-sm mr-1">add</span>
            {t('subscriptions.add')}
          </button>
        </div>
      </header>

      {/* 内容区域 */}
      <div className="subscriptions-page-content">
        {loading ? (
          <div className="subscriptions-page-loading">
            <span className="material-symbols-outlined animate-spin text-4xl nb-text-secondary">
              progress_activity
            </span>
          </div>
        ) : (
          <>
            <section className="subscriptions-page-overview" aria-label={t('subscriptions.calendar.overview')}>
              <div className="subscriptions-summary-grid">
                {summaryCards.map((card) => (
                  <div key={card.key} className="subscriptions-summary-card nb-card-static">
                    <div className={`subscriptions-summary-icon ${card.colorClass}`}>
                      <span className="material-symbols-outlined text-xl text-[var(--nb-border)]">
                        {card.icon}
                      </span>
                    </div>
                    <div className="subscriptions-summary-copy">
                      <div className="subscriptions-summary-value nb-text">
                        {card.value}
                      </div>
                      <div className="subscriptions-summary-label nb-text-secondary">
                        {card.label}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="subscriptions-calendar-card nb-card-static">
                <div className="subscriptions-calendar-header">
                  <div className="subscriptions-calendar-title">
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
                      className="subscriptions-calendar-clear nb-btn nb-btn-ghost px-3 py-1.5 text-sm"
                      onClick={() => {
                        setSelectedMonthKey(null);
                        setCurrentPage(1);
                      }}
                    >
                      {t('subscriptions.calendar.clearFilter')}
                    </button>
                  )}
                </div>

                <div className="subscriptions-calendar-grid">
                  {calendarMonths.map((month) => {
                    const hasSubscriptions = month.subscriptions.length > 0;
                    const isSelected = selectedMonthKey === month.key;
                    const monthLabel = formatMonthLabel(month.startDate);

                    return (
                      <button
                        key={month.key}
                        type="button"
                        disabled={!hasSubscriptions}
                        onClick={() => hasSubscriptions && handleMonthSelect(month.key)}
                        aria-pressed={isSelected}
                        aria-label={hasSubscriptions
                          ? t('subscriptions.calendar.filterByMonth', {
                            month: monthLabel,
                            count: month.subscriptions.length,
                          })
                          : t('subscriptions.calendar.emptyMonthLabel', { month: monthLabel })
                        }
                        className={`subscriptions-calendar-month nb-card-subtle ${
                          isSelected
                            ? 'is-selected'
                            : hasSubscriptions
                              ? 'has-subscriptions'
                              : 'is-empty'
                        }`}
                      >
                        <div className="subscriptions-calendar-month-header">
                          <div>
                            <div className="text-sm font-bold nb-text">
                              {monthLabel}
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
                              <span className="nb-badge nb-badge-pink" title={t('subscriptions.calendar.expired')}>
                                {month.expiredCount}
                              </span>
                            )}
                            {month.upcomingCount > 0 && (
                              <span className="nb-badge nb-badge-green" title={t('subscriptions.calendar.next30Days')}>
                                {month.upcomingCount}
                              </span>
                            )}
                            {month.disabledCount > 0 && (
                              <span className="nb-badge nb-badge-yellow" title={t('subscriptions.disabled')}>
                                {month.disabledCount}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="subscriptions-calendar-items">
                          {month.subscriptions.slice(0, 3).map((subscription) => (
                            <div key={subscription.id} className="subscriptions-calendar-item">
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
            </section>

            <section className="subscriptions-list-section" aria-label={t('subscriptions.tabs.list')}>
              <SubscriptionList
                subscriptions={paginationData.currentPageData}
                emptyTitle={selectedMonthKey ? t('subscriptions.calendar.filterEmpty') : undefined}
                emptyHint={selectedMonthKey ? t('subscriptions.calendar.filterEmptyHint') : undefined}
                onEdit={handleEdit}
                onDelete={(sub) => setDeleteConfirm(sub)}
                onToggleEnabled={handleToggleEnabled}
                onRenew={handleRenew}
              />
            </section>
            
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
        <div className="subscriptions-settings-panel">
          {/* 每日重复提醒 */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium nb-text">{t('subscriptions.dailyReminder')}</p>
              <p className="text-xs nb-text-secondary mt-1">
                {t('subscriptions.dailyReminderHint')}
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleUpdateSettings({ ...settings, dailyReminder: !settings.dailyReminder })}
              className="nb-toggle"
              aria-label={t('subscriptions.dailyReminder')}
              aria-pressed={settings.dailyReminder}
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
              onChange={(e) => handleUpdateSettings({
                ...settings,
                defaultReminderDays: parseSubscriptionReminderDays(
                  e.target.value,
                  settings.defaultReminderDays
                ),
              })}
              className="nb-input w-full text-sm"
              aria-label={t('subscriptions.defaultReminderDays')}
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

            <div className="subscriptions-backup-actions">
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
