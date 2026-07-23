import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ToolCard } from '../../../../components/ToolCard';
import { useCopyToClipboard } from '../../../../hooks/useCopyToClipboard';
import { createToolInvocation } from '../../../../types/toolInvocation';
import { TOOL_METADATA, ToolComponentProps, ToolId } from '../../../../types/tools';
import { detectToolIntents, getToolIntentInvocationInput, runToolIntent, type ToolIntent } from '../../../../utils/toolIntent';

export const SmartToolRouter: React.FC<ToolComponentProps> = ({
  isExpanded,
  onToggleExpand,
  onOpenTool,
}) => {
  const { t } = useTranslation();
  const { copy } = useCopyToClipboard();
  const [input, setInput] = useState('');
  const [selectedIntentId, setSelectedIntentId] = useState<string | null>(null);

  const intents = useMemo(() => detectToolIntents(input), [input]);
  const selectedIntent = useMemo<ToolIntent | null>(() => {
    if (intents.length === 0) return null;
    return intents.find(intent => intent.id === selectedIntentId) ?? intents[0];
  }, [intents, selectedIntentId]);

  const preview = useMemo(() => (
    selectedIntent ? runToolIntent(selectedIntent, input) : null
  ), [input, selectedIntent]);
  const previewIntents = useMemo(() => {
    if (!preview?.success) return [];
    return detectToolIntents(preview.output)
      .filter(intent => intent.id !== selectedIntent?.id);
  }, [preview, selectedIntent?.id]);

  const handleOpenTool = () => {
    if (!selectedIntent) return;

    onOpenTool?.(
      selectedIntent.toolId,
      createToolInvocation(
        selectedIntent.toolId,
        getToolIntentInvocationInput(selectedIntent, input),
        selectedIntent.mode,
        'smart-router',
      ),
    );
  };

  const handleCopyPreview = () => {
    if (preview?.success) {
      copy(preview.output);
    }
  };

  const handleOpenPreviewWithTool = (intent: ToolIntent) => {
    if (!preview?.success) return;

    onOpenTool?.(
      intent.toolId,
      createToolInvocation(intent.toolId, preview.output, intent.mode, 'smart-router'),
    );
  };

  return (
    <ToolCard
      tool={TOOL_METADATA[ToolId.SMART_TOOL_ROUTER]}
      isExpanded={isExpanded}
      onToggleExpand={onToggleExpand}
    >
      <div className="h-full grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.85fr)] gap-4 min-h-0">
        <div className="flex flex-col min-h-0">
          <label className="block text-sm font-bold nb-text mb-2">
            {t('tools.smartToolRouter.inputLabel')}
          </label>
          <textarea
            value={input}
            onChange={event => {
              setInput(event.target.value);
              setSelectedIntentId(null);
            }}
            placeholder={t('tools.smartToolRouter.inputPlaceholder')}
            className="nb-input flex-1 font-mono text-sm resize-none"
          />
        </div>

        <div className="flex flex-col gap-4 min-h-0">
          <section className="nb-card-static p-4 flex-shrink-0">
            <h3 className="text-sm font-bold nb-text mb-3">
              {t('tools.smartToolRouter.recommendations')}
            </h3>

            {!input.trim() && (
              <p className="text-sm nb-text-secondary">{t('tools.smartToolRouter.emptyInput')}</p>
            )}

            {input.trim() && intents.length === 0 && (
              <p className="text-sm nb-text-secondary">{t('tools.smartToolRouter.noSuggestions')}</p>
            )}

            <div className="space-y-2">
              {intents.map(intent => {
                const isSelected = selectedIntent?.id === intent.id;
                return (
                  <button
                    key={intent.id}
                    type="button"
                    onClick={() => setSelectedIntentId(intent.id)}
                    className={`w-full text-left border-2 p-3 transition-all ${
                      isSelected
                        ? 'border-[color:var(--nb-border)] bg-[color:var(--nb-accent-yellow)] text-[color:var(--nb-text-on-accent)] shadow-[var(--nb-shadow-sm)]'
                        : 'border-[color:var(--nb-border)] bg-[color:var(--nb-card)] hover:shadow-[var(--nb-shadow-sm)]'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-base" aria-hidden="true">
                        {TOOL_METADATA[intent.toolId].icon}
                      </span>
                      <span className="font-bold">{t(intent.titleKey)}</span>
                    </span>
                    <span className="mt-1 block text-xs opacity-80">
                      {t(intent.descriptionKey)}
                    </span>
                    <span className="mt-2 inline-block text-xs font-bold">
                      {t('tools.smartToolRouter.intentConfidence', {
                        confidence: Math.round(intent.confidence * 100),
                      })}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="nb-card-static p-4 flex-1 min-h-0 flex flex-col">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h3 className="text-sm font-bold nb-text">
                {t('tools.smartToolRouter.preview')}
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyPreview}
                  disabled={!preview?.success}
                  className="nb-btn nb-btn-secondary text-xs"
                >
                  {t('tools.smartToolRouter.copyPreview')}
                </button>
                <button
                  type="button"
                  onClick={handleOpenTool}
                  disabled={!selectedIntent}
                  className="nb-btn nb-btn-primary text-xs"
                >
                  {t('tools.smartToolRouter.openTool')}
                </button>
              </div>
            </div>

            <pre className="flex-1 min-h-0 overflow-auto whitespace-pre-wrap break-words nb-bg nb-border p-3 font-mono text-sm nb-text">
              {preview
                ? (preview.success ? preview.output : t(preview.errorKey))
                : t('tools.smartToolRouter.noSuggestions')}
            </pre>

            {previewIntents.length > 0 && (
              <div className="mt-3 flex-shrink-0">
                <h4 className="text-xs font-bold nb-text-secondary mb-2">
                  {t('tools.smartToolRouter.previewNextSteps')}
                </h4>
                <div className="flex flex-wrap gap-2">
                  {previewIntents.map(intent => (
                    <button
                      key={intent.id}
                      type="button"
                      onClick={() => handleOpenPreviewWithTool(intent)}
                      className="nb-btn nb-btn-secondary text-xs"
                    >
                      {t('tools.smartToolRouter.openPreviewWithTool', {
                        name: t(intent.titleKey),
                      })}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </ToolCard>
  );
};
