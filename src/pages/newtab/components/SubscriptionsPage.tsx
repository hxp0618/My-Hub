/**
 * 订阅管理页面
 * 独立的订阅管理功能页面
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '../../../components/Modal';
import { ConfirmDialog } from '../../../components/ConfirmDialog';
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
import { SubscriptionList } from './tools/subscription/SubscriptionList';
import { SubscriptionForm } from './tools/subscription/SubscriptionForm';
import { Pagination } from './tools/subscription/Pagination';

export const SubscriptionsPage: React.FC = () => {
  const { t } = useTranslation();
  
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

  // 计算分页数据
  const paginationData = useMemo(() => {
    const pageSize = settings.pageSize || PAGE_SIZE_OPTIONS[0];
    const totalItems = subscriptions.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    
    // 确保当前页在有效范围内
    const validCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
    
    // 计算当前页的数据
    const startIndex = (validCurrentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const currentPageData = subscriptions.slice(startIndex, endIndex);
    
    return {
      pageSize,
      totalItems,
      totalPages,
      validCurrentPage,
      currentPageData,
    };
  }, [subscriptions, currentPage, settings.pageSize]);

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
      console.error('Failed to load subscription data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 处理页码变化
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
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
      console.error('Failed to update page size:', error);
    }
  }, [settings]);

  // 创建订阅
  const handleCreateSubscription = useCallback(async (data: CreateSubscriptionParams) => {
    try {
      await subscriptionService.createSubscription(data);
      await loadData();
      setShowFormModal(false);
      // 添加新订阅后跳转到第一页（因为排序后新订阅可能在前面）
      setCurrentPage(1);
    } catch (error) {
      console.error('Failed to create subscription:', error);
    }
  }, [loadData]);

  // 更新订阅
  const handleUpdateSubscription = useCallback(async (data: CreateSubscriptionParams) => {
    if (!editingSubscription) return;
    
    try {
      await subscriptionService.updateSubscription(editingSubscription.id, data);
      await loadData();
      setShowFormModal(false);
      setEditingSubscription(undefined);
    } catch (error) {
      console.error('Failed to update subscription:', error);
    }
  }, [editingSubscription, loadData]);

  // 删除订阅
  const handleDeleteSubscription = useCallback(async () => {
    if (!deleteConfirm) return;
    
    try {
      await subscriptionService.deleteSubscription(deleteConfirm.id);
      await loadData();
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Failed to delete subscription:', error);
    }
  }, [deleteConfirm, loadData]);

  // 切换启用状态
  const handleToggleEnabled = useCallback(async (subscription: Subscription) => {
    try {
      await subscriptionService.toggleEnabled(subscription.id);
      await loadData();
    } catch (error) {
      console.error('Failed to toggle subscription:', error);
    }
  }, [loadData]);

  // 续订
  const handleRenew = useCallback(async (subscription: Subscription) => {
    try {
      await subscriptionService.renewSubscription(subscription.id);
      await loadData();
    } catch (error) {
      console.error('Failed to renew subscription:', error);
    }
  }, [loadData]);

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
    } catch (error) {
      console.error('Failed to update settings:', error);
    }
  }, []);

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
            <div className="flex-1">
              <SubscriptionList
                subscriptions={paginationData.currentPageData}
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
              className={`relative w-10 h-5 rounded-full border-2 border-[var(--nb-border)] transition-colors ${
                settings.dailyReminder ? 'bg-[var(--nb-accent-green)]' : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              <span
                className={`absolute top-0 w-3.5 h-3.5 rounded-full bg-[var(--nb-border)] transition-transform ${
                  settings.dailyReminder ? 'left-5' : 'left-0.5'
                }`}
              />
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
        </div>
      </Modal>
    </div>
  );
};

export default SubscriptionsPage;
