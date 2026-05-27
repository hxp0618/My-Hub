import { EnhancedBookmark } from '../types/bookmarks';
import { sendMessage } from './llmService';
import { extractJsonString } from '../lib/llmUtils';
import { getBookmarkOrganizeSystemPrompt, getBookmarkOrganizeUserPrompt } from '../lib/bookmarkOrganizePrompts';
import { sanitizeTagList } from '../lib/bookmarkTags';
import { getAllBookmarkTags } from '../db/indexedDB';
import { BookmarkOrganization } from '../types/bookmarks';
import i18n from '../i18n';
import { createLogger } from '../utils/logger';

const logger = createLogger('[BookmarkOrganizeService]');

const debugLog = (...args: unknown[]) => {
  logger.debug(...args);
};

const warnLog = (...args: unknown[]) => {
  logger.warn(...args);
};

const errorLog = (...args: unknown[]) => {
  logger.error(...args);
};

const getOrganizeStatus = (key: string, options?: Record<string, unknown>) => {
  return i18n.t(`organizeProgress.${key}`, options);
};

const getErrorCodeForLog = (error: unknown): string => (
  error instanceof Error ? error.name : typeof error
);

export interface OrganizeResult {
  id: string;
  tags: string[];
  folder: string | null;
}

export interface FolderStructureNode {
  id: string;
  title: string;
  children: FolderStructureNode[];
}

export interface OrganizeProgress {
  currentBatch: number;
  totalBatches: number;
  processedCount: number;
  totalCount: number;
  currentStatus: string;
}

export type OrganizeProgressCallback = (progress: OrganizeProgress) => void;

const isRecord = (value: unknown): value is Record<string, unknown> => (
  !!value && typeof value === 'object' && !Array.isArray(value)
);

export const sanitizeOrganizeResults = (value: unknown): OrganizeResult[] => {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item): OrganizeResult[] => {
    if (!isRecord(item) || typeof item.id !== 'string') return [];

    const folder = item.folder === null || item.folder === undefined
      ? null
      : typeof item.folder === 'string'
        ? item.folder.trim() || null
        : null;

    return [{
      id: item.id,
      tags: sanitizeTagList(item.tags),
      folder,
    }];
  });
};

/**
 * 获取根目录中的书签（只包含直接在根目录中的书签，不包括子文件夹中的）
 */
export const getRootBookmarks = (bookmarks: EnhancedBookmark[]): EnhancedBookmark[] => {
  debugLog('开始提取根目录书签');
  
  const rootBookmarks: EnhancedBookmark[] = [];
  
  // 顶级书签数组通常包含“书签栏”（id '1'）和“其他书签”（id '2'）
  for (const topLevelFolder of bookmarks) {
    if (topLevelFolder.children) {
      for (const node of topLevelFolder.children) {
        // 我们只想要顶级文件夹正下方的书签（带有URL）。
        if (node.url) {
          rootBookmarks.push(node);
        }
      }
    }
  }
  
  debugLog('根目录书签提取完成，共', rootBookmarks.length, '个');
  return rootBookmarks;
};

/**
 * 获取所有现有文件夹的结构
 */
export const getFoldersStructure = (bookmarks: EnhancedBookmark[]): FolderStructureNode[] => {
  debugLog('开始提取文件夹结构');
  
  const extractFolders = (nodes: EnhancedBookmark[]): FolderStructureNode[] => {
    const folders: FolderStructureNode[] = [];
    
    for (const node of nodes) {
      if (!node.url) {
        // 这是一个文件夹
        const folder = {
          id: node.id,
          title: node.title,
          children: node.children ? extractFolders(node.children) : []
        };
        folders.push(folder);
      }
    }
    
    return folders;
  };
  
  const structure = extractFolders(bookmarks);
  debugLog('文件夹结构提取完成，共', structure.length, '个顶级文件夹');
  return structure;
};

/**
 * 批量整理书签
 */
export const organizeBookmarksBatch = async (
  bookmarks: EnhancedBookmark[],
  allBookmarks: EnhancedBookmark[],
  onProgress: OrganizeProgressCallback,
  onBatchOrganized: (plan: BookmarkOrganization[]) => Promise<void>,
  abortSignal?: AbortSignal
): Promise<void> => {
  debugLog('开始批量整理书签');
  
  // 获取根目录书签
  const rootBookmarks = getRootBookmarks(bookmarks);
  
  if (rootBookmarks.length === 0) {
    debugLog('没有找到根目录书签，结束处理');
    onProgress({
      currentBatch: 1,
      totalBatches: 1,
      processedCount: 0,
      totalCount: 0,
      currentStatus: getOrganizeStatus('noRootBookmarks')
    });
    return;
  }
  
  // 获取现有标签和文件夹结构
  const existingTags = await getAllBookmarkTags();
  const allTags = Array.from(new Set(existingTags.flatMap(bt => bt.tags)));
  const foldersStructure = getFoldersStructure(allBookmarks);
  
  debugLog('现有标签数量:', allTags.length);
  
  // 分批处理，每批20个
  const batchSize = 20;
  const batches: EnhancedBookmark[][] = [];
  
  for (let i = 0; i < rootBookmarks.length; i += batchSize) {
    batches.push(rootBookmarks.slice(i, i + batchSize));
  }
  
  debugLog('分批处理，共', batches.length, '批，每批最多', batchSize, '个');
  
  const systemPrompt = getBookmarkOrganizeSystemPrompt(allTags, JSON.stringify(foldersStructure));
  let processedCount = 0;
  
  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    if (abortSignal?.aborted) {
      debugLog('用户取消了操作, 中止处理');
      return;
    }
    
    const batch = batches[batchIndex];
    const currentBatch = batchIndex + 1;
    
    debugLog('处理第', currentBatch, '批，共', batch.length, '个书签');
    
    onProgress({
      currentBatch,
      totalBatches: batches.length,
      processedCount,
      totalCount: rootBookmarks.length,
      currentStatus: getOrganizeStatus('processingBatch', { batch: currentBatch, count: batch.length })
    });
    
    try {
      // 准备批次数据
      const batchData = batch.map(bookmark => ({
        id: bookmark.id,
        title: bookmark.title,
        url: bookmark.url!
      }));
      
      const userPrompt = getBookmarkOrganizeUserPrompt(batchData);
      
      debugLog('发送批次数据到LLM，书签数量:', batchData.length);
      
      // 发送到LLM
      const result = await new Promise<OrganizeResult[]>((resolve, reject) => {
        let fullResponse = '';
        
        sendMessage(
          [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          {
            onUpdate: (chunk: string) => {
              fullResponse += chunk;
            },
            onFinish: (finalText?: string) => {
              const responseText = finalText || fullResponse;
              debugLog('收到LLM响应，长度:', responseText.length);
              
              try {
                const jsonStr = extractJsonString(responseText);
                if (!jsonStr) {
                  throw new Error('invalidModelJson');
                }
                const parsedResult = sanitizeOrganizeResults(JSON.parse(jsonStr));
                debugLog('LLM响应解析完成，结果数量:', parsedResult.length);
                resolve(parsedResult);
              } catch (error) {
                errorLog('解析LLM响应失败', { errorType: getErrorCodeForLog(error) });
                reject(new Error(getOrganizeStatus('parseModelResponseFailed')));
              }
            },
            onError: (error: Error) => {
              errorLog('LLM请求失败', { errorType: getErrorCodeForLog(error) });
              reject(error);
            }
          },
          abortSignal,
          { stream: true }
        );
      });
      
      debugLog('第', currentBatch, '批处理完成，结果数量:', result.length);
      
      // 创建一个从 id 到 url 的映射，以便将 url 添加到整理计划中
      const idToUrlMap = new Map(batch.map(b => [b.id, b.url!]));
      
      // 应用整理结果
      onProgress({
        currentBatch,
        totalBatches: batches.length,
        processedCount,
        totalCount: rootBookmarks.length,
        currentStatus: getOrganizeStatus('applyingBatch', { batch: currentBatch })
      });
      
      const plan = generateOrganizePlan(result, foldersStructure, idToUrlMap);
      await onBatchOrganized(plan);
      
      processedCount += batch.length;
      
      debugLog('第', currentBatch, '批应用完成，已处理', processedCount, '个书签');
      
    } catch (error) {
      errorLog('处理批次时发生错误', { batch: currentBatch, errorType: getErrorCodeForLog(error) });
      
      onProgress({
        currentBatch,
        totalBatches: batches.length,
        processedCount,
        totalCount: rootBookmarks.length,
        currentStatus: getOrganizeStatus('batchError', { batch: currentBatch })
      });
      
      // 继续处理下一批，不中断整个流程
      processedCount += batch.length;
    }
  }
  
  onProgress({
    currentBatch: batches.length,
    totalBatches: batches.length,
    processedCount: rootBookmarks.length,
    totalCount: rootBookmarks.length,
    currentStatus: getOrganizeStatus('allDone')
  });
  
  debugLog('批量整理完成');
};

/**
 * 根据LLM结果生成整理计划
 */
const generateOrganizePlan = (
  results: OrganizeResult[],
  foldersStructure: FolderStructureNode[],
  idToUrlMap: Map<string, string>
): BookmarkOrganization[] => {
  debugLog('开始生成整理计划');

  const organizationPlan: BookmarkOrganization[] = [];
  const folderMap = new Map<string, string>();
  
  const buildFolderMap = (folders: FolderStructureNode[]) => {
    for (const folder of folders) {
      folderMap.set(folder.title, folder.id);
      if (folder.children.length > 0) {
        buildFolderMap(folder.children);
      }
    }
  };
  
  buildFolderMap(foldersStructure);

  for (const result of results) {
    const url = idToUrlMap.get(result.id);
    if (!url) {
      warnLog('找不到整理结果对应书签的 URL，跳过此书签');
      continue;
    }

    const planItem: BookmarkOrganization = { bookmarkId: result.id, url };

    // 移动操作
    if (result.folder && folderMap.has(result.folder)) {
      planItem.newParentId = folderMap.get(result.folder)!;
    } else if (result.folder) {
      warnLog('找不到整理结果中指定的文件夹');
    }
    // 标签更新
    if (result.tags && result.tags.length > 0) {
      planItem.tags = result.tags;
    }

    // 只有在有实际操作时才添加到计划中
    if (planItem.newParentId || (planItem.tags && planItem.tags.length > 0)) {
        // 如果这是一个仅包含标签更新的计划项，我们需要确保 URL 存在
        if (planItem.tags && planItem.tags.length > 0 && !planItem.url) {
            warnLog('尝试为一个没有 URL 的书签添加标签，已跳过');
        } else {
            organizationPlan.push(planItem);
        }
    }
  }
  
  debugLog('整理计划生成完成，共', organizationPlan.length, '项');
  return organizationPlan;
};
