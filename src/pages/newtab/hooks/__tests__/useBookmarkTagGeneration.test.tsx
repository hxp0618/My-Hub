import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { parseGeneratedTags, useBookmarkTagGeneration } from '../useBookmarkTagGeneration';

const mocks = vi.hoisted(() => ({
  getAllBookmarkTags: vi.fn(),
  buildTagGenerationPrompt: vi.fn(),
  sendMessage: vi.fn(),
  loggerError: vi.fn(),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      if (params?.count !== undefined) {
        return `${key}:${params.count}`;
      }
      if (params?.message !== undefined) {
        return `${key}:${params.message}`;
      }
      return key;
    },
  }),
}));

vi.mock('@src/db/indexedDB', () => ({
  getAllBookmarkTags: mocks.getAllBookmarkTags,
}));

vi.mock('@src/lib/tagGenerationPrompts', () => ({
  buildTagGenerationPrompt: mocks.buildTagGenerationPrompt,
}));

vi.mock('@src/services/llmService', () => ({
  sendMessage: mocks.sendMessage,
}));

vi.mock('@src/utils/logger', () => ({
  createLogger: () => ({
    error: mocks.loggerError,
  }),
}));

const HookHarness: React.FC<{
  title?: string;
  url?: string;
  onTagsGenerated?: (tags: string[]) => void | Promise<void>;
}> = ({ title = 'Example', url = 'https://example.com', onTagsGenerated = vi.fn() }) => {
  const {
    isGeneratingTags,
    generationStatusMessage,
    currentTagGenerationTitle,
    generateTags,
    cancelTagGeneration,
  } = useBookmarkTagGeneration({
    clearAfterMs: null,
    cancelClearAfterMs: null,
  });

  return (
    <div>
      <div data-testid="is-generating">{String(isGeneratingTags)}</div>
      <div data-testid="status">{generationStatusMessage}</div>
      <div data-testid="current-title">{currentTagGenerationTitle}</div>
      <button
        type="button"
        onClick={() => void generateTags({
          title,
          url,
          onTagsGenerated,
          successMessage: tags => `success:${tags.length}`,
          onValidationError: message => mocks.loggerError('validation', message),
          onError: (_error, message) => mocks.loggerError('error', message),
        })}
      >
        generate
      </button>
      <button type="button" onClick={cancelTagGeneration}>cancel</button>
    </div>
  );
};

describe('useBookmarkTagGeneration', () => {
  beforeEach(() => {
    mocks.getAllBookmarkTags.mockResolvedValue([{ tags: ['ai', 'tool'] }]);
    mocks.buildTagGenerationPrompt.mockReturnValue('system prompt');
    mocks.sendMessage.mockImplementation(async (_messages, handlers) => {
      handlers.onUpdate('```text\nai, chrome, devtools\n```');
      await handlers.onFinish();
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('parses comma-separated tags and strips code fences', () => {
    expect(parseGeneratedTags('```text\nai, chrome, ai, devtools\n```')).toEqual(['ai', 'chrome', 'devtools']);
    expect(parseGeneratedTags('ai, , chrome')).toEqual(['ai', 'chrome']);
    expect(parseGeneratedTags('   ')).toEqual([]);
  });

  it('generates tags and exposes success status', async () => {
    const onTagsGenerated = vi.fn();
    render(<HookHarness onTagsGenerated={onTagsGenerated} />);

    fireEvent.click(screen.getByRole('button', { name: 'generate' }));

    await waitFor(() => expect(onTagsGenerated).toHaveBeenCalledWith(['ai', 'chrome', 'devtools']));
    expect(mocks.buildTagGenerationPrompt).toHaveBeenCalledWith(['ai', 'tool']);
    expect(screen.getByTestId('is-generating')).toHaveTextContent('false');
    expect(screen.getByTestId('status')).toHaveTextContent('success:3');
    expect(screen.getByTestId('current-title')).toHaveTextContent('Example');
  });

  it('reports validation errors without calling the LLM service', async () => {
    render(<HookHarness title="" />);

    fireEvent.click(screen.getByRole('button', { name: 'generate' }));

    expect(mocks.sendMessage).not.toHaveBeenCalled();
    expect(screen.getByTestId('status')).toHaveTextContent('bookmarks.fillTitleUrl');
    expect(mocks.loggerError).toHaveBeenCalledWith('validation', 'bookmarks.fillTitleUrl');
  });

  it('cancels an active generation request', async () => {
    let capturedSignal: AbortSignal | undefined;
    mocks.sendMessage.mockImplementation(async (_messages, _handlers, signal) => {
      capturedSignal = signal;
      await new Promise(() => undefined);
    });

    render(<HookHarness />);

    fireEvent.click(screen.getByRole('button', { name: 'generate' }));
    await waitFor(() => expect(capturedSignal).toBeDefined());

    fireEvent.click(screen.getByRole('button', { name: 'cancel' }));

    expect(capturedSignal?.aborted).toBe(true);
    expect(screen.getByTestId('is-generating')).toHaveTextContent('false');
    expect(screen.getByTestId('status')).toHaveTextContent('bookmarks.tagGenerateCancelled');
  });

  it('maps LLM errors to a stable localized retry message by default', async () => {
    mocks.sendMessage.mockImplementation(async (_messages, handlers) => {
      handlers.onError(new Error('network down'));
    });

    render(<HookHarness />);

    fireEvent.click(screen.getByRole('button', { name: 'generate' }));

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('bookmarks.tagGenerateRetry'));
    expect(mocks.loggerError).toHaveBeenCalledWith('error', 'bookmarks.tagGenerateRetry');
    expect(screen.queryByText(/network down/)).not.toBeInTheDocument();
  });
});
