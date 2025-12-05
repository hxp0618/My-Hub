import React from 'react';
import { useTranslation } from 'react-i18next';
import { TagStatistics } from '../../../types/tags';
import { getTagClassName } from '../../../utils/tagColorUtils';

interface TagStatisticsProps {
  statistics: TagStatistics | null;
  loading: boolean;
}

export const TagStatistics: React.FC<TagStatisticsProps> = ({ statistics, loading }) => {
  const { t } = useTranslation();

  const stats = [
    {
      label: t('tags.totalTags'),
      value: statistics?.totalTags ?? 0,
    },
    {
      label: t('tags.totalItems'),
      value: statistics?.totalItems ?? 0,
    },
    {
      label: t('tags.unusedTags'),
      value: statistics?.unusedTags ?? 0,
    },
  ];

  return (
    <div className="space-y-4">
      {/* Neo-Brutalism 风格统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map(({ label, value }) => (
          <div key={label} className="nb-card-static p-6">
            <div className="text-sm text-secondary">{label}</div>
            <div className="text-3xl font-bold text-[color:var(--nb-text)] mt-2">
              {loading ? <span className="animate-pulse">--</span> : value}
            </div>
          </div>
        ))}
      </div>
      {statistics?.topTags && statistics.topTags.length > 0 && (
        <div className="nb-card-static p-6">
          <div className="text-sm text-secondary mb-4">{t('tags.topTags')}</div>
          <div className="flex flex-wrap gap-3">
            {statistics.topTags.map((tag, index) => (
              <span
                key={tag.name}
                className={getTagClassName(index)}
              >
                {tag.name} · {t('tags.itemCount', { count: tag.count })}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
