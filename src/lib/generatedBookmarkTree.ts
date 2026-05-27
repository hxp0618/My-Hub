import type { GeneratedNode } from '../pages/newtab/utils';
import { extractJsonString } from './llmUtils';
import { jsonrepair } from 'jsonrepair';

export type GeneratedBookmarkTreeParseErrorCode =
  | 'emptyResponse'
  | 'invalidJson'
  | 'emptyTree';

export class GeneratedBookmarkTreeParseError extends Error {
  code: GeneratedBookmarkTreeParseErrorCode;

  constructor(code: GeneratedBookmarkTreeParseErrorCode) {
    super(code);
    this.name = 'GeneratedBookmarkTreeParseError';
    this.code = code;
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> => (
  !!value && typeof value === 'object' && !Array.isArray(value)
);

const getJsonCandidate = (responseText: string): string => {
  const parsedCandidate = extractJsonString(responseText);
  if (parsedCandidate) return parsedCandidate;

  const arrayStart = responseText.indexOf('[');
  const arrayEnd = responseText.lastIndexOf(']');
  if (arrayStart !== -1 && arrayEnd > arrayStart) {
    return responseText.slice(arrayStart, arrayEnd + 1);
  }

  const objectStart = responseText.indexOf('{');
  const objectEnd = responseText.lastIndexOf('}');
  if (objectStart !== -1 && objectEnd > objectStart) {
    return responseText.slice(objectStart, objectEnd + 1);
  }

  return responseText;
};

const sanitizeGeneratedNode = (
  value: unknown,
  validBookmarkIds: Set<string>,
  usedBookmarkIds: Set<string>,
): GeneratedNode | null => {
  if (!isRecord(value)) return null;

  if (typeof value.id === 'string') {
    if (!validBookmarkIds.has(value.id) || usedBookmarkIds.has(value.id)) return null;
    usedBookmarkIds.add(value.id);
    return { id: value.id };
  }

  if (typeof value.title !== 'string') return null;
  const title = value.title.trim();
  if (!title) return null;

  return {
    title,
    children: sanitizeGeneratedBookmarkTree(value.children, validBookmarkIds, usedBookmarkIds),
  };
};

export const sanitizeGeneratedBookmarkTree = (
  value: unknown,
  validBookmarkIds: Set<string>,
  usedBookmarkIds = new Set<string>(),
): GeneratedNode[] => {
  if (!Array.isArray(value)) return [];

  return value.flatMap((node): GeneratedNode[] => {
    const sanitized = sanitizeGeneratedNode(node, validBookmarkIds, usedBookmarkIds);
    return sanitized ? [sanitized] : [];
  });
};

export const parseGeneratedBookmarkTreeResponse = (
  responseText: string | undefined,
  validBookmarkIds: Set<string>,
): GeneratedNode[] => {
  if (!responseText?.trim()) {
    throw new GeneratedBookmarkTreeParseError('emptyResponse');
  }

  try {
    const jsonCandidate = getJsonCandidate(responseText);
    const repairedJson = jsonrepair(jsonCandidate);
    const parsed = JSON.parse(repairedJson);
    if (!Array.isArray(parsed)) {
      throw new GeneratedBookmarkTreeParseError('invalidJson');
    }

    const tree = sanitizeGeneratedBookmarkTree(parsed, validBookmarkIds);
    if (tree.length === 0) {
      throw new GeneratedBookmarkTreeParseError('emptyTree');
    }

    return tree;
  } catch (error) {
    if (error instanceof GeneratedBookmarkTreeParseError) {
      throw error;
    }
    throw new GeneratedBookmarkTreeParseError('invalidJson');
  }
};
