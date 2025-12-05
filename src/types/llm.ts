/**
 * Message role types for LLM conversations
 */
export type MessageRole = 'system' | 'user' | 'assistant';

/**
 * Message structure for LLM API requests
 */
export interface ChatMessage {
  role: MessageRole;
  content: string;
}

export interface LLMSettings {
  prioritizeGeminiNano: boolean;
  selectedProvider: string;
  selectedModel: string;
  apiKey: string;
  customApiUrl?: string;
  customModel?: string;
  providers: Record<string, ProviderConfig>;
}

export interface ProviderConfig {
  name: string;
  baseUrl: string;
  websiteUrl?: string;
  apiKey: string;
  selectedModel: string;
  customModel?: string;
  models: Array<{ value: string; label: string }>;
}
