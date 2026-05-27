import { getLLMSettings } from '../lib/llmUtils';
import { PROVIDERS, ProviderKey } from '../data/models';
import { createLogger } from '../utils/logger';
import { ChatMessage } from '../types/llm';
import i18n from '../i18n';

const logger = createLogger('[LLM Service]');
const SUPPORTED_PROMPT_API_OUTPUT_LANGUAGES = ['en', 'es', 'ja'] as const;
type PromptApiOutputLanguage = typeof SUPPORTED_PROMPT_API_OUTPUT_LANGUAGES[number];

type SendMessageCallbacks = {
    onUpdate: (chunk: string) => void;
    onFinish: (fullText?: string) => void; // Can receive the full text in non-stream mode
    onError: (error: Error) => void;
};

type SendMessageOptions = {
    stream?: boolean;
};

export type LLMServiceErrorCode =
    | 'promptApiUnavailable'
    | 'geminiUnavailable'
    | 'apiRequestFailed'
    | 'streamUnavailable'
    | 'invalidResponse'
    | 'networkError'
    | 'unknownError';

export class LLMServiceError extends Error {
    code: LLMServiceErrorCode;
    status?: number;

    constructor(code: LLMServiceErrorCode, options: { status?: number } = {}) {
        super(i18n.t(`llmService.errors.${code}`, options));
        this.name = 'LLMServiceError';
        this.code = code;
        this.status = options.status;
    }
}

export interface SseChunkParseResult {
    contents: string[];
    invalidPayloads: string[];
    done: boolean;
    buffer: string;
}

const getDeltaContent = (value: unknown): string | null => {
    if (!value || typeof value !== 'object') return null;
    const choices = (value as { choices?: unknown }).choices;
    if (!Array.isArray(choices)) return null;
    const firstChoice = choices[0];
    if (!firstChoice || typeof firstChoice !== 'object') return null;
    const delta = (firstChoice as { delta?: unknown }).delta;
    if (!delta || typeof delta !== 'object') return null;
    const content = (delta as { content?: unknown }).content;
    return typeof content === 'string' ? content : null;
};

export const parseSseChunk = (
    chunk: string,
    previousBuffer = '',
    flush = false
): SseChunkParseResult => {
    const combined = previousBuffer + chunk;
    const lines = combined.split(/\r?\n/);
    const hasTrailingNewline = /\r?\n$/.test(combined);
    const buffer = flush || hasTrailingNewline ? '' : (lines.pop() ?? '');
    const completeLines = lines;
    const contents: string[] = [];
    const invalidPayloads: string[] = [];
    let done = false;

    for (const rawLine of completeLines) {
        const line = rawLine.trim();
        if (!line.startsWith('data:')) continue;

        const dataStr = line.slice(5).trim();
        if (!dataStr) continue;
        if (dataStr === '[DONE]') {
            done = true;
            continue;
        }

        try {
            const content = getDeltaContent(JSON.parse(dataStr));
            if (content) {
                contents.push(content);
            }
        } catch {
            invalidPayloads.push(dataStr);
        }
    }

    return { contents, invalidPayloads, done, buffer };
};

const getPromptApiSessionOptions = (): LanguageModelCreateOptions => {
    const currentLanguage = i18n.language.split('-')[0].toLowerCase();
    const outputLanguage = SUPPORTED_PROMPT_API_OUTPUT_LANGUAGES.includes(
        currentLanguage as PromptApiOutputLanguage
    )
        ? currentLanguage
        : 'en';

    // Chrome Prompt API currently accepts en/es/ja output declarations only.
    return {
        expectedOutputs: [{ type: 'text', languages: [outputLanguage] }],
    };
};

const getSafeSettingsForLog = (settings: ReturnType<typeof getLLMSettings>) => ({
    ...settings,
    apiKey: settings.apiKey ? '[redacted]' : '',
    providers: Object.fromEntries(
        Object.entries(settings.providers || {}).map(([providerId, provider]) => [
            providerId,
            {
                ...provider,
                apiKey: provider.apiKey ? '[redacted]' : '',
            },
        ])
    ),
});

const toLLMServiceError = (error: unknown): LLMServiceError => {
    if (error instanceof LLMServiceError) return error;
    if (error instanceof TypeError && error.message.toLowerCase().includes('fetch')) {
        return new LLMServiceError('networkError');
    }
    return new LLMServiceError('unknownError');
};

async function tryGeminiNano(
    messages: ChatMessage[],
    callbacks: SendMessageCallbacks,
    abortSignal: AbortSignal | undefined,
    options: SendMessageOptions
) {
    if (typeof LanguageModel === 'undefined' || typeof LanguageModel.availability !== 'function') {
        throw new LLMServiceError('promptApiUnavailable');
    }
    const promptApiOptions = getPromptApiSessionOptions();
    const availability = await LanguageModel.availability(promptApiOptions);
    if (availability !== 'available') {
        throw new LLMServiceError('geminiUnavailable');
    }

    logger.info('[GeminiNano] Using Gemini Nano (Prompt API).');
    logger.debug('[GeminiNano] Input message count:', messages.length);

    const session = await LanguageModel.create(promptApiOptions);

    try {
        if (options.stream) {
            const stream = session.promptStreaming(messages, { signal: abortSignal });
            for await (const chunk of stream) {
                callbacks.onUpdate(chunk);
            }
            logger.info('[GeminiNano][Stream] finished');
            callbacks.onFinish();
        } else {
            const result = await session.prompt(messages, { signal: abortSignal });
            logger.info('[GeminiNano][NonStream] result received', { length: result.length });
            callbacks.onFinish(result);
        }
    } finally {
        session.destroy();
    }
}

/**
 * 向 LLM 发送消息并获取流式响应
 * @param messages 聊天消息列表
 * @param callbacks 事件回调函数
 * @param abortSignal AbortSignal to abort the request
 */
export async function sendMessage(
  messages: ChatMessage[],
  callbacks: SendMessageCallbacks,
  abortSignal?: AbortSignal,
  options: SendMessageOptions = { stream: true }
) {
  const settings = getLLMSettings();
  logger.info('Sending message with settings:', getSafeSettingsForLog(settings));

  if (settings.prioritizeGeminiNano) {
      try {
          logger.info('Prioritizing Gemini Nano. Will attempt Prompt API first.');
          await tryGeminiNano(messages, callbacks, abortSignal, options);
          return; // Gemini Nano succeeded, so we're done.
      } catch (error) {
          logger.warn('Gemini Nano failed, falling back to configured LLM.', toLLMServiceError(error).code);
          // Fall through to the cloud LLM logic below.
      }
  }

  if (!settings.selectedProvider || !settings.apiKey) {
    const error = new Error(i18n.t('llmService.noProviderOrKey'));
    logger.error('Error:', error);
    return callbacks.onError(error);
  }

  let baseUrl = '';
  let model = '';

  // 获取 baseUrl 和 model
  if (settings.selectedProvider === 'custom') {
    baseUrl = settings.customApiUrl || '';
    model = settings.selectedModel === 'custom' ? (settings.customModel || '') : settings.selectedModel;
  } else {
    const provider = PROVIDERS[settings.selectedProvider as ProviderKey];
    if (!provider) {
      return callbacks.onError(new Error(i18n.t('llmService.providerNotFound', { provider: settings.selectedProvider })));
    }
    baseUrl = provider.baseUrl;
    model = settings.selectedModel === 'custom' ? (settings.customModel || '') : settings.selectedModel;
  }

  if (!baseUrl) {
    return callbacks.onError(new Error(i18n.t('llmService.noApiUrl')));
  }

  if (!model) {
    return callbacks.onError(new Error(i18n.t('llmService.noModelSelected')));
  }

  const requestBody = {
    model: model,
    messages: messages,
    stream: options.stream,
  };

  logger.info('[Cloud] Using provider:', settings.selectedProvider, 'baseUrl:', baseUrl, 'model:', model);
  logger.debug('[Cloud] Request summary:', {
    messageCount: messages.length,
    stream: options.stream,
  });


  try {
    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.apiKey}`,
      },
      body: JSON.stringify(requestBody),
      signal: abortSignal,
    });

    if (!response.ok) {
        await response.text().catch(() => '');
        throw new LLMServiceError('apiRequestFailed', { status: response.status });
    }

    if (options.stream) {
        if (!response.body) {
            throw new LLMServiceError('streamUnavailable');
        }
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let streamBuffer = '';

        const applyParsedStreamChunk = (parsed: SseChunkParseResult): boolean => {
            streamBuffer = parsed.buffer;
            if (parsed.invalidPayloads.length > 0) {
                logger.error('Error parsing stream data chunk', { count: parsed.invalidPayloads.length });
            }
            for (const content of parsed.contents) {
                logger.debug('[Cloud][Stream] content chunk received', { length: content.length });
                callbacks.onUpdate(content);
            }
            if (parsed.done) {
                logger.info('Stream finished (DONE marker).');
                callbacks.onFinish();
                return true;
            }
            return false;
        };

        const processStream = async () => {
          while (true) {
            if (abortSignal?.aborted) {
                reader.cancel();
                break;
            }

            const { done, value } = await reader.read();
            if (done) {
              const parsed = parseSseChunk('', streamBuffer, true);
              if (applyParsedStreamChunk(parsed)) {
                return;
              }
              logger.info('Stream finished.');
              callbacks.onFinish();
              break;
            }

            const chunk = decoder.decode(value, { stream: true });
            logger.debug('[Cloud][Stream] chunk received', { length: chunk.length });
            const parsed = parseSseChunk(chunk, streamBuffer);
            if (applyParsedStreamChunk(parsed)) {
                return;
            }
          }
        };

        processStream().catch(err => {
            if (!abortSignal?.aborted) {
                const normalizedError = toLLMServiceError(err);
                logger.error('Stream processing error:', normalizedError.code);
                callbacks.onError(normalizedError);
            } else {
                logger.info('Stream processing aborted as expected.');
                // 确保在中止时也能正常结束
                callbacks.onFinish();
            }
        });
    } else {
        // Handle non-streaming response
        const data = await response.json();
        const content = data?.choices?.[0]?.message?.content;
        if (typeof content !== 'string') {
            throw new LLMServiceError('invalidResponse');
        }
        logger.info('[Cloud][NonStream] content received', { length: content.length });
        callbacks.onFinish(content);
    }
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
        logger.info('Request aborted by user.');
        // Don't call onError for user-initiated aborts
        return;
    }
    const normalizedError = toLLMServiceError(error);
    logger.error('Fetch request failed:', normalizedError.code);
    callbacks.onError(normalizedError);
  }
}
