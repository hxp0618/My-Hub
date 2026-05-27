import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import TagInput from '../../../components/TagInput';
import BookmarkTree from '../../../components/BookmarkTree';
import { addBookmarkTag, getAllBookmarkTags } from '@src/db/indexedDB';
import { sendMessage } from '@src/services/llmService';
import { parseGeneratedTags } from '@src/lib/bookmarkTags';
import { buildTagGenerationPrompt } from '@src/lib/tagGenerationPrompts';
import { getBookmarkSuggestionSystemPrompt } from '@src/lib/bookmarkSuggestionPrompts';
import { extractJsonString, unwrapCodeFence } from '@src/lib/llmUtils';
import { sanitizeBookmarkSuggestionResult } from '@src/lib/bookmarkSuggestionResult';
import { findFolderIdByTitle, simplifyBookmarkTree } from '@src/utils/bookmarkUtils';
import type { ChatMessage } from '@src/types/llm';
import { createLogger } from '@src/utils/logger';
import { autoSuggestBookmark } from '@src/utils/storageManager';

const logger = createLogger('[AddBookmarkForm]');

interface AddBookmarkFormProps {
  initialUrl?: string;
  initialTitle?: string;
  onSuccess?: () => void;
}

const AddBookmarkForm: React.FC<AddBookmarkFormProps> = ({ initialUrl, initialTitle, onSuccess }) => {
  const { t } = useTranslation();
  const [title, setTitle] = useState(initialTitle || '');
  const [url, setUrl] = useState(initialUrl || '');
  const [tags, setTags] = useState<string[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [defaultFolderId, setDefaultFolderId] = useState<string>('');

  useEffect(() => {
    // Set default folder to the bookmarks bar
    chrome.bookmarks.getTree((tree) => {
        const bookmarksBar = tree[0]?.children?.[0];
        if (bookmarksBar?.id) {
          setDefaultFolderId(bookmarksBar.id);
          setSelectedFolder(bookmarksBar.id);
        }
    });

    if (!initialUrl && !initialTitle) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          const tabTitle = tabs[0].title || '';
          const tabUrl = tabs[0].url || '';
          setTitle(tabTitle);
          setUrl(tabUrl);
          handleAutoSuggest(tabTitle, tabUrl);
        }
      });
    } else if (initialUrl && initialTitle) {
        handleAutoSuggest(initialTitle, initialUrl);
    }
    // 初始化时只根据传入 URL/标题触发一次自动建议，避免输入过程反复发起 AI 请求。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialUrl, initialTitle]);

  const handleAutoSuggest = (currentTitle: string, currentUrl: string) => {
    const autoSuggestEnabled = autoSuggestBookmark.get();
    if (autoSuggestEnabled && currentTitle && currentUrl) {
      handleGenerateSuggestions(currentTitle, currentUrl);
    }
  };

  const handleGenerateSuggestions = async (currentTitle: string, currentUrl: string) => {
    setIsGenerating(true);
    setStatusMessage(t('aiSuggestion.generating'));
    const controller = new AbortController();
    setAbortController(controller);

    try {
      const [allTags, bookmarkTree] = await Promise.all([
        getAllBookmarkTags(),
        chrome.bookmarks.getTree(),
      ]);

      const allExistingTags = Array.from(new Set(allTags.flatMap(b => b.tags)));
      // Start simplifying from the children of the root to provide a cleaner structure to the LLM
      const simplifiedTree = simplifyBookmarkTree(bookmarkTree[0]?.children || []);
      const foldersJson = JSON.stringify(simplifiedTree, null, 2);

      const systemPrompt = getBookmarkSuggestionSystemPrompt(allExistingTags, foldersJson);
      const userMessage = `标题: "${currentTitle}"\nURL: "${currentUrl}"`;

      const messages: ChatMessage[] = [{ role: 'system', content: systemPrompt }, { role: 'user', content: userMessage }];

      let generatedContent = '';
      await sendMessage(
        messages,
        {
          onUpdate: (chunk: string) => { generatedContent += chunk; },
          onFinish: () => {
            try {
              const jsonStr = extractJsonString(generatedContent);
              if (!jsonStr) {
                throw new Error(t('aiSuggestion.invalidJson'));
              }
              const result = sanitizeBookmarkSuggestionResult(JSON.parse(jsonStr));
              const { tags: suggestedTags, folder: suggestedFolder } = result;

              setTags(suggestedTags);

              if (suggestedFolder) {
                const folderId = findFolderIdByTitle(bookmarkTree, suggestedFolder);
                if (folderId) {
                  setSelectedFolder(folderId);
                } else {
                  logger.warn('Suggested folder not found. Using default.');
                  setSelectedFolder(defaultFolderId);
                }
              } else {
                setSelectedFolder(defaultFolderId);
              }
              setStatusMessage(t('aiSuggestion.success'));
            } catch (error) {
              logger.error('Failed to parse LLM response', error);
              setStatusMessage(t('aiSuggestion.parseError'));
              handleGenerateTags(); // Fallback to only generating tags
            }
            setIsGenerating(false);
            setAbortController(null);
          },
          onError: (error: Error) => {
            logger.error('AI suggestion generation failed', error);
            setStatusMessage(t('aiSuggestion.error'));
            setIsGenerating(false);
            setAbortController(null);
          },
        },
        controller.signal
      );
    } catch (error) {
      logger.error('AI suggestion request failed', error);
      setStatusMessage(t('aiSuggestion.error'));
      setIsGenerating(false);
      setAbortController(null);
    }
  };


  const handleGenerateTags = async () => {
    if (!title || !url) {
      setStatusMessage(t('bookmarks.fillTitleUrl'));
      return;
    }

    setIsGenerating(true);
    setStatusMessage(t('bookmarks.generatingTags'));

    // 创建新的 AbortController
    const controller = new AbortController();
    setAbortController(controller);

    try {
      // 获取现有的标签数据
      const existingBookmarkTags = await getAllBookmarkTags();
      const allExistingTags = Array.from(new Set(
        existingBookmarkTags.flatMap(bookmark => bookmark.tags)
      ));

      // 构建系统提示词
      const systemPrompt = buildTagGenerationPrompt(allExistingTags);

      // 构建用户消息
      const userMessage = `标题: "${title}"\nURL: "${url}"`;

      const messages: ChatMessage[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ];

      let generatedContent = '';

      await sendMessage(
        messages,
        {
          onUpdate: (chunk: string) => {
            generatedContent += chunk;
          },
          onFinish: () => {
            const finalContent = unwrapCodeFence(generatedContent);
            if (finalContent) {
              const generatedTags = parseGeneratedTags(finalContent);

              setTags(generatedTags);
              setStatusMessage(t('tagGeneration.successMessage', { count: generatedTags.length }));
            } else {
              setStatusMessage(t('bookmarks.tagGenerateFailed'));
            }
            setIsGenerating(false);
            setAbortController(null);
          },
          onError: (error: Error) => {
            logger.error('Failed to generate tags', error);
            setStatusMessage(t('bookmarks.tagGenerateRetry'));
            setIsGenerating(false);
            setAbortController(null);
          },
        },
        controller.signal
      );
    } catch (error) {
      logger.error('Tag generation request failed', error);
      setStatusMessage(t('bookmarks.tagGenerateRetry'));
      setIsGenerating(false);
      setAbortController(null);
    }
  };

  const handleCancelGeneration = () => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
      setIsGenerating(false);
      setStatusMessage(t('bookmarks.tagGenerateCancelled'));
    }
  };

  const handleSave = async () => {
    if (!title || !url) {
      setStatusMessage(t('bookmarks.fillTitleUrl'));
      return;
    }

    try {
      await chrome.bookmarks.create({
        parentId: selectedFolder,
        title,
        url,
      });

      // 使用表单中的 URL 作为主键保存标签
      if (tags.length > 0) {
        await addBookmarkTag({ url: url, tags });
      }

      setStatusMessage(t('bookmarks.addSuccess'));
      if (onSuccess) {
        onSuccess();
      } else {
        setTimeout(() => window.close(), 1000);
      }

    } catch (error) {
      logger.error('Error saving bookmark', error);
      setStatusMessage(t('bookmarks.addError'));
    }
  };

  return (
    <div className="nb-bg nb-text min-h-full flex flex-col gap-4">
      <div className="nb-card-static p-6 space-y-5">
        <h1 className="text-2xl font-black uppercase tracking-tight">{t('modal.addBookmark')}</h1>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-2 nb-text">{t('bookmarks.title_label')}</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="nb-input w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2 nb-text">{t('bookmarks.url_label')}</label>
            <input
              type="text"
              value={url}
              onChange={e => setUrl(e.target.value)}
              className="nb-input w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2 nb-text">{t('bookmarks.folder_label')}</label>
            <BookmarkTree selectedFolder={selectedFolder} setSelectedFolder={setSelectedFolder} />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-semibold nb-text">{t('bookmarks.tags_label')}</label>
              {isGenerating ? (
                <button
                  onClick={handleCancelGeneration}
                  className="nb-btn nb-btn-danger text-xs px-3 py-1"
                >
                  {t('common.cancel')}
                </button>
              ) : (
                <button
                  onClick={() => handleGenerateTags()}
                  disabled={!title || !url}
                  className="nb-btn nb-btn-secondary text-xs px-3 py-1 disabled:opacity-60"
                >
                  {t('bookmarks.generateAI')}
                </button>
              )}
            </div>
            <TagInput tags={tags} setTags={setTags} />
          </div>
        </div>
      </div>

      <button
        onClick={handleSave}
        className="nb-btn nb-btn-primary w-full py-3 text-base font-bold"
      >
        {t('common.save')}
      </button>

      {statusMessage && <p className="text-center text-sm nb-text-secondary">{statusMessage}</p>}
    </div>
  );
};

export default AddBookmarkForm;
