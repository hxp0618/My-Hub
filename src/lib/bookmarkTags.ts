import { unwrapCodeFence } from './llmUtils';

export const sanitizeTagList = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();
  const tags: string[] = [];
  for (const item of value) {
    if (typeof item !== 'string') continue;
    const tag = item.trim();
    if (!tag || seen.has(tag)) continue;
    seen.add(tag);
    tags.push(tag);
  }
  return tags;
};

export const parseGeneratedTags = (content: string): string[] => (
  sanitizeTagList(unwrapCodeFence(content).split(','))
);
