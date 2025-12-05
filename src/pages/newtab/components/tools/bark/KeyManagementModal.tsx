/**
 * 密钥管理模态框组件
 * 提供密钥配置的完整管理界面
 * Neo-Brutalism 风格适配
 */

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BarkKeyConfig } from '../../../../../types/bark';
import { BarkKeyManager } from '../../../../../services/BarkKeyManager';
import { KeyList } from './KeyList';
import { KeyForm } from './KeyForm';
import { Modal } from '../../../../../components/Modal';
import { ConfirmDialog } from '../../../../../components/ConfirmDialog';
import { maskDeviceKey } from '../../../../../utils/barkKeyManager';

interface KeyManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  keyManager: BarkKeyManager;
  onKeysChange: () => void;
}

type ModalView = 'list' | 'add' | 'edit';

export const KeyManagementModal: React.FC<KeyManagementModalProps> = ({
  isOpen,
  onClose,
  keyManager,
  onKeysChange,
}) => {
  const { t } = useTranslation();
  
  const [view, setView] = useState<ModalView>('list');
  const [editingKey, setEditingKey] = useState<BarkKeyConfig | null>(null);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');
  const [pendingDeleteKey, setPendingDeleteKey] = useState<BarkKeyConfig | null>(null);
  const [testingKeyId, setTestingKeyId] = useState<string | null>(null);

  const keys = keyManager.getAllKeys();
  const selectedKeyId = keyManager.getSelectedKey()?.id || null;
  const selectedKey = keyManager.getSelectedKey();

  const showMessage = (text: string, type: 'success' | 'error') => {
    setMessage(text);
    setMessageType(type);
    setTimeout(() => {
      setMessage('');
      setMessageType('');
    }, 3000);
  };

  useEffect(() => {
    if (isOpen) {
      setView('list');
      setEditingKey(null);
      setMessage('');
      setMessageType('');
      setPendingDeleteKey(null);
      setTestingKeyId(null);
    }
  }, [isOpen]);

  // 处理添加密钥
  const handleAdd = () => {
    setView('add');
    setEditingKey(null);
    setMessage('');
    setMessageType('');
  };

  // 处理编辑密钥
  const handleEdit = (key: BarkKeyConfig) => {
    setView('edit');
    setEditingKey(key);
    setMessage('');
    setMessageType('');
  };

  // 处理删除密钥
  const handleDelete = (keyId: string) => {
    const key = keys.find(k => k.id === keyId);
    if (!key) return;

    setMessage('');
    setMessageType('');
    setPendingDeleteKey(key);
  };

  // 处理测试密钥
  const handleTest = async (keyId: string) => {
    setTestingKeyId(keyId);
    setMessage('');
    setMessageType('');
    
    try {
      const success = await keyManager.testKey(keyId);
      if (success) {
        showMessage(t('tools.barkNotifier.keys.testSuccess'), 'success');
      } else {
        showMessage(t('tools.barkNotifier.keys.testFailed'), 'error');
      }
    } catch (e) {
      showMessage(t('tools.barkNotifier.keys.testFailed'), 'error');
    } finally {
      setTestingKeyId(null);
    }
  };

  // 处理选择密钥
  const handleSelect = (keyId: string) => {
    try {
      keyManager.setSelectedKey(keyId);
      onKeysChange();
    } catch (e) {
      console.error('Failed to select key:', e);
    }
  };

  // 处理表单提交
  const handleSubmit = (data: Omit<BarkKeyConfig, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      if (view === 'add') {
        keyManager.addKey(data);
      } else if (view === 'edit' && editingKey) {
        keyManager.updateKey(editingKey.id, data);
      }
      
      onKeysChange();
      setView('list');
      showMessage(t('tools.barkNotifier.keys.saveSuccess'), 'success');
    } catch (e) {
      const error = e as Error;
      const errorKey = error.message;
      showMessage(
        t(`tools.barkNotifier.keys.${errorKey}`) || t('tools.barkNotifier.keys.saveFailed'),
        'error'
      );
    }
  };

  // 处理取消
  const handleCancel = () => {
    setView('list');
    setEditingKey(null);
    setMessage('');
    setMessageType('');
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        handleCancel();
        onClose();
      }}
      title={t('tools.barkNotifier.keys.title')}
      widthClass="max-w-4xl"
    >
      <div className="space-y-4">
        {/* 顶部操作栏 - Neo-Brutalism 风格 */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-sm nb-text-secondary">
            <span className="material-symbols-outlined text-lg" style={{ color: 'var(--nb-accent-blue)' }}>key_vertical</span>
            <span className="nb-text font-medium">{t('tools.barkNotifier.keys.manage')}</span>
            <span className="nb-badge nb-badge-blue">
              {keys.length}
            </span>
            {selectedKey && (
              <span className="flex items-center gap-1 text-xs nb-text-secondary">
                <span className="material-symbols-outlined text-sm" style={{ color: 'var(--nb-accent-green)' }}>task_alt</span>
                <span className="truncate max-w-[140px]">
                  {selectedKey.label}
                </span>
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {view !== 'list' && (
              <button
                onClick={handleCancel}
                className="nb-btn nb-btn-secondary px-3 py-1.5 text-xs"
              >
                {t('common.cancel')}
              </button>
            )}
            <button
              onClick={handleAdd}
              className="nb-btn nb-btn-primary px-4 py-2 text-sm flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-base">add</span>
              {t('tools.barkNotifier.keys.add')}
            </button>
          </div>
        </div>

        {/* 消息提示 - Neo-Brutalism 风格 */}
        {message && (
          <div
            className={`flex items-start gap-2 p-3 nb-border rounded-lg animate-fade-in-up ${
              messageType === 'success'
                ? 'nb-badge-green'
                : 'nb-badge-pink'
            }`}
            style={{ 
              boxShadow: 'var(--nb-shadow-hover)',
              backgroundColor: messageType === 'success' ? 'var(--nb-accent-green)' : 'var(--nb-accent-pink)'
            }}
          >
            <span className="material-symbols-outlined text-base nb-text">
              {messageType === 'success' ? 'task_alt' : 'error'}
            </span>
            <p className="text-sm flex-1 nb-text font-medium">{message}</p>
            <button
              onClick={() => {
                setMessage('');
                setMessageType('');
              }}
              className="nb-text hover:opacity-70 transition-opacity"
              aria-label={t('common.close') || 'close'}
            >
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          </div>
        )}

        <div className="grid md:grid-cols-[1.1fr_0.9fr] gap-4">
          {/* 左侧：密钥列表 - Neo-Brutalism 风格 */}
          <div className="nb-card-static p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-bold nb-text">
                {t('tools.barkNotifier.keys.title')}
              </h4>
              <span className="text-xs nb-text-secondary">
                {t('tools.barkNotifier.keys.select')}
              </span>
            </div>
            <div className="max-h-[55vh] overflow-y-auto pr-1">
              <KeyList
                keys={keys}
                selectedKeyId={selectedKeyId}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onTest={handleTest}
                onSelect={handleSelect}
                isTesting={Boolean(testingKeyId)}
                testingKeyId={testingKeyId}
              />
            </div>
          </div>

          {/* 右侧：表单 - Neo-Brutalism 风格 */}
          <div
            className={`nb-card-static p-4 ${
              view === 'list'
                ? 'flex items-center justify-center'
                : ''
            }`}
            style={view === 'list' ? { 
              borderStyle: 'dashed',
              backgroundColor: 'var(--nb-bg)'
            } : undefined}
          >
            {view === 'list' ? (
              <div className="text-center space-y-2">
                <div className="flex justify-center">
                  <div className="p-3 rounded-full nb-border nb-shadow" style={{ backgroundColor: 'var(--nb-card)' }}>
                    <span className="material-symbols-outlined text-3xl nb-text-secondary">gesture</span>
                  </div>
                </div>
                <p className="font-bold nb-text">{t('tools.barkNotifier.keys.manage')}</p>
                <p className="text-xs nb-text-secondary">{t('tools.barkNotifier.keys.emptyStateHint')}</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4 pb-3 nb-border-b">
                  <div className="flex items-center gap-2">
                    <div 
                      className="p-1.5 rounded-lg nb-border"
                      style={{ backgroundColor: view === 'add' ? 'var(--nb-accent-green)' : 'var(--nb-accent-blue)' }}
                    >
                      <span className="material-symbols-outlined text-base nb-text">
                        {view === 'add' ? 'add_circle' : 'edit'}
                      </span>
                    </div>
                    <div>
                      <div className="text-sm font-bold nb-text">
                        {view === 'add'
                          ? t('tools.barkNotifier.keys.add')
                          : t('tools.barkNotifier.keys.edit')}
                      </div>
                      {view === 'edit' && editingKey && (
                        <div className="text-xs nb-text-secondary truncate">
                          {maskDeviceKey(editingKey.deviceKey)} | {editingKey.server}
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={handleCancel}
                    className="nb-btn nb-btn-ghost p-1.5 rounded-lg"
                    aria-label={t('common.cancel')}
                  >
                    <span className="material-symbols-outlined text-sm">close</span>
                  </button>
                </div>
                <KeyForm
                  mode={view}
                  initialData={editingKey || undefined}
                  onSubmit={handleSubmit}
                  onCancel={handleCancel}
                />
              </>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={Boolean(pendingDeleteKey)}
        onClose={() => setPendingDeleteKey(null)}
        onConfirm={() => {
          if (!pendingDeleteKey) return;
          try {
            keyManager.deleteKey(pendingDeleteKey.id);
            onKeysChange();
            showMessage(t('tools.barkNotifier.keys.deleteSuccess'), 'success');
          } catch (e) {
            showMessage(t('tools.barkNotifier.keys.saveFailed'), 'error');
          } finally {
            setPendingDeleteKey(null);
          }
        }}
        title={t('tools.barkNotifier.keys.delete')}
        message={
          pendingDeleteKey
            ? t('tools.barkNotifier.keys.deleteConfirm', { label: pendingDeleteKey.label })
            : ''
        }
        confirmText={t('tools.barkNotifier.keys.delete')}
        cancelText={t('common.cancel')}
        danger
      />
    </Modal>
  );
};
