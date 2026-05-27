import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getAllBookmarkTags } from '@src/db/indexedDB';
import { parseGeneratedTags } from '@src/lib/bookmarkTags';
import { buildTagGenerationPrompt } from '@src/lib/tagGenerationPrompts';
import { sendMessage } from '@src/services/llmService';
import type { ChatMessage } from '@src/types/llm';
import { createLogger } from '@src/utils/logger';
export { parseGeneratedTags } from '@src/lib/bookmarkTags';

const logger = createLogger('[BookmarkTagGeneration]');

type TagGenerationMessage = string | ((tags: string[]) => string);
type TagGenerationErrorMessage = string | ((error: Error) => string);

interface GenerateTagsOptions {
  title: string;
  url?: string;
  displayTitle?: string;
  onTagsGenerated: (tags: string[]) => void | Promise<void>;
  successMessage?: TagGenerationMessage;
  emptyMessage?: string;
  errorMessage?: TagGenerationErrorMessage;
  unexpectedErrorMessage?: string;
  onValidationError?: (message: string) => void;
  onSuccess?: (tags: string[], message: string) => void;
  onEmpty?: (message: string) => void;
  onError?: (error: Error, message: string) => void;
}

interface UseBookmarkTagGenerationOptions {
  clearAfterMs?: number | null;
  cancelClearAfterMs?: number | null;
}

export const useBookmarkTagGeneration = ({
  clearAfterMs = 2000,
  cancelClearAfterMs = 1000,
}: UseBookmarkTagGenerationOptions = {}) => {
  const { t } = useTranslation();
  const [isGeneratingTags, setIsGeneratingTags] = useState(false);
  const [currentTagGenerationTitle, setCurrentTagGenerationTitle] = useState<string | null>(null);
  const [generationStatusMessage, setGenerationStatusMessage] = useState('');
  const [tagGenerationAbortController, setTagGenerationAbortController] = useState<AbortController | null>(null);
  const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (clearTimerRef.current) {
      clearTimeout(clearTimerRef.current);
      clearTimerRef.current = null;
    }
  }, []);

  const scheduleClear = useCallback((delayMs: number | null) => {
    clearTimer();

    if (delayMs === null) {
      return;
    }

    clearTimerRef.current = setTimeout(() => {
      setCurrentTagGenerationTitle(null);
      setGenerationStatusMessage('');
      clearTimerRef.current = null;
    }, delayMs);
  }, [clearTimer]);

  const completeGeneration = useCallback((message: string, delayMs: number | null) => {
    setGenerationStatusMessage(message);
    setIsGeneratingTags(false);
    setTagGenerationAbortController(null);
    scheduleClear(delayMs);
  }, [scheduleClear]);

  const generateTags = useCallback(async ({
    title,
    url,
    displayTitle,
    onTagsGenerated,
    successMessage,
    emptyMessage,
    errorMessage,
    unexpectedErrorMessage,
    onValidationError,
    onSuccess,
    onEmpty,
    onError,
  }: GenerateTagsOptions) => {
    if (!title || !url) {
      const message = t('bookmarks.fillTitleUrl');
      setGenerationStatusMessage(message);
      onValidationError?.(message);
      return;
    }

    clearTimer();
    setCurrentTagGenerationTitle(displayTitle || title);
    setIsGeneratingTags(true);
    setGenerationStatusMessage(t('bookmarks.generatingTags'));

    const controller = new AbortController();
    setTagGenerationAbortController(controller);

    try {
      const existingBookmarkTags = await getAllBookmarkTags();
      const allExistingTags = Array.from(new Set(
        existingBookmarkTags.flatMap((bookmark: { tags: string[] }) => bookmark.tags)
      ));

      const messages: ChatMessage[] = [
        { role: 'system', content: buildTagGenerationPrompt(allExistingTags) },
        { role: 'user', content: t('tagGeneration.promptTemplate', { title, url }) },
      ];

      let generatedContent = '';

      await sendMessage(
        messages,
        {
          onUpdate: (chunk: string) => {
            generatedContent += chunk;
          },
          onFinish: async () => {
            const generatedTags = parseGeneratedTags(generatedContent);

            if (generatedTags.length === 0) {
              const message = emptyMessage || t('bookmarks.tagGenerateFailed');
              completeGeneration(message, clearAfterMs);
              onEmpty?.(message);
              return;
            }

            await onTagsGenerated(generatedTags);

            const message = typeof successMessage === 'function'
              ? successMessage(generatedTags)
              : successMessage || t('tagGeneration.successMessage', { count: generatedTags.length });

            completeGeneration(message, clearAfterMs);
            onSuccess?.(generatedTags, message);
          },
          onError: (error: Error) => {
            logger.error('Failed to generate bookmark tags', error);
            const message = typeof errorMessage === 'function'
              ? errorMessage(error)
              : errorMessage || t('bookmarks.tagGenerateRetry');

            completeGeneration(message, clearAfterMs);
            onError?.(error, message);
          },
        },
        controller.signal
      );
    } catch (error) {
      const normalizedError = error instanceof Error ? error : new Error(String(error));
      logger.error('Unexpected bookmark tag generation error', normalizedError);
      const message = unexpectedErrorMessage || t('bookmarks.tagGenerateRetry');

      completeGeneration(message, clearAfterMs);
      onError?.(normalizedError, message);
    }
  }, [clearAfterMs, clearTimer, completeGeneration, t]);

  const cancelTagGeneration = useCallback(() => {
    if (!tagGenerationAbortController) {
      return;
    }

    tagGenerationAbortController.abort();
    setTagGenerationAbortController(null);
    setIsGeneratingTags(false);
    setGenerationStatusMessage(t('bookmarks.tagGenerateCancelled'));
    scheduleClear(cancelClearAfterMs);
  }, [cancelClearAfterMs, scheduleClear, t, tagGenerationAbortController]);

  useEffect(() => () => {
    clearTimer();
    tagGenerationAbortController?.abort();
  }, [clearTimer, tagGenerationAbortController]);

  return {
    isGeneratingTags,
    currentTagGenerationTitle,
    generationStatusMessage,
    generateTags,
    cancelTagGeneration,
  };
};
