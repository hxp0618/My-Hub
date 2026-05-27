declare module '*.svg' {
  import React = require('react');
  export const ReactComponent: React.SFC<React.SVGProps<SVGSVGElement>>;
  const src: string;
  export default src;
}

declare module '*.json' {
  const content: string;
  export default content;
}

declare module 'turndown' {
  type TurndownFilter = string | string[] | ((node: Node) => boolean);

  interface TurndownRule {
    filter: TurndownFilter;
    replacement: (content: string, node: Node) => string;
  }

  export default class TurndownService {
    constructor(options?: Record<string, unknown>);
    keep(filter: string | string[]): void;
    remove(filter: string | string[]): void;
    addRule(key: string, rule: TurndownRule): void;
    turndown(input: string): string;
  }
}

interface LanguageModel {
  availability(options?: LanguageModelCreateOptions): Promise<'available' | 'unavailable' | 'downloading' | 'downloadable'>;
  create(options?: LanguageModelCreateOptions): Promise<LanguageModelSession>;
  params(): Promise<LanguageModelParams>;
}

interface LanguageModelExpectedContent {
  type: 'text' | 'image' | 'audio';
  languages?: string[];
}

interface LanguageModelExpectedOutput {
  type: 'text';
  languages?: string[];
}

interface LanguageModelCreateOptions {
  signal?: AbortSignal;
  topK?: number;
  temperature?: number;
  initialPrompts?: unknown[];
  expectedInputs?: LanguageModelExpectedContent[];
  expectedOutputs?: LanguageModelExpectedOutput[];
}

interface LanguageModelParams {
  defaultTopK: number;
  maxTopK: number;
  defaultTemperature: number;
  maxTemperature: number;
}

interface LanguageModelSession {
  prompt(messages: unknown[], options?: { signal?: AbortSignal }): Promise<string>;
  promptStreaming(messages: unknown[], options?: { signal?: AbortSignal }): AsyncIterable<string>;
  destroy(): void;
  inputUsage: number;
  inputQuota: number;
  clone(options?: { signal?: AbortSignal }): Promise<LanguageModelSession>;
  append(messages: unknown[]): Promise<void>;
  measureInputUsage(options?: { responseConstraint?: unknown, omitResponseConstraintInput?: boolean }): Promise<{ totalTokens: number }>;
}

declare const LanguageModel: LanguageModel;
