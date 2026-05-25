import React from 'react';
import { useTranslation } from 'react-i18next';
import { TagStatistics as TagStatisticsData } from '../../../types/tags';
import { getTagClassName } from '../../../utils/tagColorUtils';

interface TagStatisticsProps {
  statistics: TagStatisticsData | null;
  loading: boolean;
}

export const TagStatistics: React.FC<TagStatisticsProps> = ({ statistics, loading }) => {
  const { t } = useTranslation();

  const stats = [
    {
      label: t('tags.totalTags'),
      value: statistics?.totalTags ?? 0,
      icon: 'label',
      color: 'bg-[color:var(--nb-accent-yellow)]',
    },
    {
      label: t('tags.totalItems'),
      value: statistics?.totalItems ?? 0,
      icon: 'bookmark',
      color: 'bg-[color:var(--nb-accent-blue)]',
    },
    {
      label: t('tags.unusedTags'),
      value: statistics?.unusedTags ?? 0,
      icon: 'label_off',
      color: 'bg-[color:var(--nb-accent-pink)]',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Neo-Brutalism 风格统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {stats.map(({ label, value, icon, color }, index) => (
          <div 
            key={label} 
            className={`nb-card p-6 relative overflow-hidden ${['nb-sticker-1', 'nb-sticker-2', 'nb-sticker-3'][index]}`}
          >
            {/* 装饰性角落 */}
            <div className={`absolute -top-2 -right-2 w-8 h-8 ${color} border-2 border-[color:var(--nb-border)] opacity-60`}></div>
            
            <div className="flex items-start gap-4">
              {/* 图标容器 */}
              <div className={`w-12 h-12 flex items-center justify-center ${color} border-3 border-[color:var(--nb-border)] shadow-[3px_3px_0px_0px_var(--nb-border)] flex-shrink-0`}>
                <span className="material-symbols-outlined text-xl nb-text">{icon}</span>
              </div>
              
              <div className="flex-1">
                <div className="text-xs font-bold nb-text-secondary uppercase tracking-wide mb-1">{label}</div>
                <div className="text-4xl font-black nb-text">
                  {loading ? (
                    <div className="w-16 h-10 bg-[color:var(--nb-border)]/20 animate-pulse"></div>
                  ) : (
                    value
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* 热门标签 - Neo-Brutalism 风格 */}
      {statistics?.topTags && statistics.topTags.length > 0 && (
        <div className="nb-card-static p-6 shadow-[6px_6px_0px_0px_var(--nb-border)] relative overflow-hidden">
          {/* 装饰性元素 */}
          <div className="absolute -bottom-4 -right-4 w-20 h-20 bg-[color:var(--nb-accent-green)]/20 border-3 border-[color:var(--nb-border)]/30 nb-sticker-3 pointer-events-none" style={{ borderRadius: '30% 70% 70% 30% / 30% 30% 70% 70%' }}></div>
          
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 flex items-center justify-center bg-[color:var(--nb-accent-green)] border-3 border-[color:var(--nb-border)] shadow-[3px_3px_0px_0px_var(--nb-border)]">
              <span className="material-symbols-outlined text-lg nb-text">trending_up</span>
            </div>
            <h3 className="text-sm font-black nb-text uppercase tracking-tight">{t('tags.topTags')}</h3>
          </div>
          
          <div className="flex flex-wrap gap-3 relative z-10">
            {statistics.topTags.map((tag, index) => (
              <span
                key={tag.name}
                className={getTagClassName(index, 'shadow-[3px_3px_0px_0px_var(--nb-border)] hover:shadow-[1px_1px_0px_0px_var(--nb-border)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all duration-100 cursor-default')}
              >
                <span className="font-bold uppercase">{tag.name}</span>
                <span className="mx-1.5 opacity-60">·</span>
                <span className="font-medium">{t('tags.itemCount', { count: tag.count })}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
