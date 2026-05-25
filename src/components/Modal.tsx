import React from 'react';
import { useTranslation } from 'react-i18next';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  widthClass?: string;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, widthClass = 'max-w-md' }) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 modal-overlay flex items-center justify-center z-50 transition-theme p-4"
      onClick={onClose}
    >
      <div
        className={`nb-card-static p-8 w-full ${widthClass} animate-modal-appear rounded-none shadow-[10px_10px_0px_0px_var(--nb-border)] relative overflow-hidden`}
        onClick={e => e.stopPropagation()}
        style={{
          border: `${3}px solid var(--nb-border)`
        }}
      >
        {/* 装饰性元素 */}
        <div className="absolute -top-4 -right-4 w-16 h-16 bg-[color:var(--nb-accent-yellow)] border-2 border-[color:var(--nb-border)] opacity-20 rounded-full nb-float pointer-events-none"></div>
        <div className="absolute -bottom-6 -left-6 w-20 h-20 bg-[color:var(--nb-accent-pink)] border-3 border-[color:var(--nb-border)] opacity-15 pointer-events-none nb-sticker-2" style={{ borderRadius: '30% 70% 70% 30% / 30% 30% 70% 70%' }}></div>

        {/* 标题区域 - 增强版 */}
        <div className="flex justify-between items-start mb-6 pb-5 relative">
          {/* 装饰性背景条 */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-[color:var(--nb-accent-blue)] border-t-2 border-[color:var(--nb-border)]"></div>

          <div className="flex-1 relative z-10">
            <h3 className="text-2xl font-black nb-text uppercase tracking-tight inline-block relative">
              {title}
              {/* 装饰性小方块 */}
              <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-2 h-2 bg-[color:var(--nb-accent-pink)] border border-[color:var(--nb-border)]"></div>
            </h3>
          </div>

          {/* 关闭按钮 - Neo-Brutalism 风格 */}
          <button
            onClick={onClose}
            className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-[color:var(--nb-card)] border-3 border-[color:var(--nb-border)] shadow-[3px_3px_0px_0px_var(--nb-border)] hover:shadow-[1px_1px_0px_0px_var(--nb-border)] hover:translate-x-[2px] hover:translate-y-[2px] active:shadow-none active:translate-x-[3px] active:translate-y-[3px] transition-all duration-100 relative z-10"
            aria-label={t('common.close')}
          >
            <span className="material-symbols-outlined text-xl nb-text">close</span>
          </button>
        </div>

        <div className="nb-text relative z-10">
          {children}
        </div>
      </div>
    </div>
  );
};
