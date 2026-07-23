import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  analyzeBookmarkHealth,
  BookmarkHealthIssue,
} from '../../../utils/bookmarkHealth';

export const BookmarkHealthOverview: React.FC<{
  report: ReturnType<typeof analyzeBookmarkHealth>;
  activeIssue: BookmarkHealthIssue | null;
  onSelectIssue: (issue: BookmarkHealthIssue) => void;
  onOpenOrganize: () => void;
  onRegenerateAllTags: () => void;
  onStartDeduplicate: () => void;
}> = ({
  report,
  activeIssue,
  onSelectIssue,
  onOpenOrganize,
  onRegenerateAllTags,
  onStartDeduplicate,
}) => {
  const { t } = useTranslation();
  const scoreTone = report.score >= 85
    ? 'bg-[color:var(--nb-accent-green)]'
    : report.score >= 65
      ? 'bg-[color:var(--nb-accent-yellow)]'
      : 'bg-[color:var(--nb-accent-pink)]';
  const cards = [
    {
      key: 'duplicates',
      issue: 'duplicates' as const,
      icon: 'content_copy',
      value: report.duplicateItems,
      label: t('bookmarks.health.duplicates'),
      hint: t('bookmarks.health.duplicateGroups', { count: report.duplicateGroups }),
      accent: 'bg-[color:var(--nb-accent-pink)]',
    },
    {
      key: 'untagged',
      issue: 'untagged' as const,
      icon: 'label_off',
      value: report.untagged,
      label: t('bookmarks.health.untagged'),
      hint: t('bookmarks.health.needTags'),
      accent: 'bg-[color:var(--nb-accent-blue)]',
    },
    {
      key: 'stale',
      issue: 'stale' as const,
      icon: 'schedule',
      value: report.stale,
      label: t('bookmarks.health.stale'),
      hint: t('bookmarks.health.staleHint'),
      accent: 'bg-[color:var(--nb-accent-yellow)]',
    },
    {
      key: 'invalid',
      issue: 'invalid' as const,
      icon: 'link_off',
      value: report.invalidUrls,
      label: t('bookmarks.health.invalidUrls'),
      hint: t('bookmarks.health.invalidHint'),
      accent: 'bg-[color:var(--nb-accent-green)]',
    },
  ];

  return (
    <section className="px-8 mt-6">
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-bold nb-text">{t('bookmarks.health.governanceTitle')}</h2>
          <p className="text-sm nb-text-secondary">{t('bookmarks.health.governanceDescription')}</p>
        </div>
        <div className="flex flex-wrap gap-2" aria-label={t('bookmarks.health.governanceActions')}>
          <button type="button" className="nb-btn nb-btn-primary px-3 py-2 text-xs" onClick={onOpenOrganize}>
            <span className="material-symbols-outlined text-base" aria-hidden="true">auto_awesome</span>
            {t('bookmarks.aiOrganizeBookmarks')}
          </button>
          <button type="button" className="nb-btn nb-btn-secondary px-3 py-2 text-xs" onClick={onRegenerateAllTags}>
            <span className="material-symbols-outlined text-base" aria-hidden="true">label</span>
            {t('bookmarks.regenerateAllTags')}
          </button>
          <button type="button" className="nb-btn nb-btn-secondary px-3 py-2 text-xs" onClick={onStartDeduplicate}>
            <span className="material-symbols-outlined text-base" aria-hidden="true">content_copy</span>
            {t('bookmarks.deduplicate')}
          </button>
        </div>
      </div>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-stretch">
        <div className="nb-card-static p-4 min-w-[180px] flex items-center gap-4">
          <div className={`w-12 h-12 flex items-center justify-center border-2 border-[color:var(--nb-border)] shadow-[var(--nb-shadow-sm)] ${scoreTone}`}>
            <span className="material-symbols-outlined text-[color:var(--nb-text-on-accent)]">health_and_safety</span>
          </div>
          <div>
            <div className="text-xs font-bold nb-text-secondary uppercase">{t('bookmarks.health.title')}</div>
            <div className="text-2xl font-black nb-text">{report.score}</div>
            <div className="text-xs nb-text-secondary">{t('bookmarks.health.total', { count: report.total })}</div>
          </div>
        </div>
        <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map(card => (
            <button
              key={card.key}
              type="button"
              onClick={() => onSelectIssue(card.issue)}
              className={`nb-card-subtle p-4 flex items-start gap-3 text-left transition-all ${
                activeIssue === card.issue ? 'shadow-[var(--nb-shadow-sm)] translate-x-[-1px] translate-y-[-1px]' : ''
              }`}
            >
              <div className={`w-9 h-9 flex-shrink-0 flex items-center justify-center border-2 border-[color:var(--nb-border)] shadow-[var(--nb-shadow-sm)] ${card.accent}`}>
                <span className="material-symbols-outlined text-[color:var(--nb-text-on-accent)] text-lg">{card.icon}</span>
              </div>
              <div className="min-w-0">
                <div className="text-xl font-black nb-text leading-none">{card.value}</div>
                <div className="text-sm font-bold nb-text mt-1">{card.label}</div>
                <div className="text-xs nb-text-secondary mt-1 truncate" title={card.hint}>{card.hint}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};
