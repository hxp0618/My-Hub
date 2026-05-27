import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '../../../components/Modal';
import { EnhancedBookmark } from '../../../types/bookmarks';
import { BookmarkFolderTree } from './BookmarkFolderTree';
import { sendMessage } from '../../../services/llmService';
import { getBookmarkOrganizationSystemPrompt } from '../../../lib/bookmarkOrganizationPrompts';
import { parseGeneratedBookmarkTreeResponse } from '../../../lib/generatedBookmarkTree';
import { extractFolderStructure, GeneratedNode, extractBookmarksForLlm } from '../utils';
import { createLogger } from '../../../utils/logger';

const logger = createLogger('[AutoOrganizeModal]');

const debugLog = (...args: unknown[]) => {
  logger.debug(...args);
};

const errorLog = (...args: unknown[]) => {
  logger.error(...args);
};

const getErrorType = (error: unknown): string => (
  error instanceof Error ? error.name : typeof error
);

let tempIdCounter = 0;
// This function converts the LLM's raw tree to a display-friendly, editable tree
const mapRawTreeToDisplayTree = (nodes: GeneratedNode[], parentId: string, bookmarksMap: Map<string, EnhancedBookmark>): EnhancedBookmark[] => {
    return nodes.map((node, index) => {
        if (node.id) { // It's a bookmark
            return bookmarksMap.get(node.id) || { id: node.id, title: 'Unknown Bookmark', url: '#', parentId, index, syncing: false };
        }
        if (node.title) { // It's a folder
            const tempId = `temp-folder-${++tempIdCounter}`;
            return {
                id: tempId,
                title: node.title,
                parentId,
                index,
                children: node.children ? mapRawTreeToDisplayTree(node.children, tempId, bookmarksMap) : [],
                syncing: false,
            };
        }
        return null;
    }).filter(Boolean) as EnhancedBookmark[];
};

// This function converts the edited tree back to the format for the Chrome API
const mapDisplayTreeToRawTree = (nodes: EnhancedBookmark[]): GeneratedNode[] => {
    return nodes.map(node => {
        if (node.url) { // It's a bookmark, return its ID
             return { id: node.id };
        }
        // It's a folder, return title and children
        return {
            title: node.title,
            children: node.children ? mapDisplayTreeToRawTree(node.children) : []
        };
    });
};


interface AutoOrganizeModalProps {
  isOpen: boolean;
  onClose: (refresh?: boolean) => void;
  bookmarks: EnhancedBookmark[];
  createFolder: (parentId: string, title: string) => Promise<void>;
  renameFolder: (id: string, newTitle: string) => Promise<void>;
  deleteFolder: (id: string, strategy: 'deleteAll' | 'moveContents') => Promise<void>;
  isBulkUpdating: boolean;
  applyBookmarkOrganization: (tree: GeneratedNode[]) => Promise<void>;
}

export const AutoOrganizeModal: React.FC<AutoOrganizeModalProps> = ({ 
    isOpen, 
    onClose, 
    bookmarks,
    isBulkUpdating,
    applyBookmarkOrganization,
}) => {
  const { t } = useTranslation();
  const [editableGeneratedTree, setEditableGeneratedTree] = useState<EnhancedBookmark[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const finalIsLoading = isLoading || isBulkUpdating;

  const handleGenerate = async () => {
    debugLog('handleGenerate: Starting...');
    setIsLoading(true);
    setError(null);
    setEditableGeneratedTree(null);

    if (abortControllerRef.current) {
        abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    const bookmarksToOrganize = extractBookmarksForLlm(bookmarks);
    debugLog('handleGenerate: Found bookmarks to organize.', Object.keys(bookmarksToOrganize).length);

    if (Object.keys(bookmarksToOrganize).length === 0) {
        setError(t('organizeAiModal.noBookmarks'));
        setIsLoading(false);
        return;
    }
    
    const folderStructure = extractFolderStructure(bookmarks);
    debugLog('handleGenerate: Extracted existing folder structure.', folderStructure.length);

    const systemPrompt = getBookmarkOrganizationSystemPrompt(JSON.stringify(folderStructure, null, 2));
    const userPrompt = `Here is the list of my bookmarks. Please organize them for me:\n\n${JSON.stringify(bookmarksToOrganize, null, 2)}`;
    
    debugLog('handleGenerate: Sending prompts to LLM.');

    try {
        await sendMessage(
            [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            {
                onUpdate: () => {}, // Not used in non-streaming mode
                onFinish: (fullResponse) => {
                    debugLog('handleGenerate: Received response from LLM.', fullResponse?.length ?? 0);
                    if (!fullResponse) {
                        setError(t('organizeAiModal.emptyResponse'));
                        setIsLoading(false);
                        return;
                    }
                    try {
                        debugLog('handleGenerate: Attempting to parse generated tree.');
                        const bookmarksMap = new Map<string, EnhancedBookmark>();
                        const flattenAndMap = (nodes: EnhancedBookmark[]) => {
                          for (const node of nodes) {
                            if (node.url) bookmarksMap.set(node.id, node);
                            if (node.children) flattenAndMap(node.children);
                          }
                        };
                        flattenAndMap(bookmarks);

                        const organizedTree = parseGeneratedBookmarkTreeResponse(fullResponse, new Set(bookmarksMap.keys()));
                        debugLog('handleGenerate: Successfully parsed generated tree.', organizedTree.length);

                        // Merge top-level folders that don't exist into "Bookmarks Bar"
                        const existingTopLevelFolders = folderStructure.map(f => f.title);
                        existingTopLevelFolders.push('Bookmarks bar', 'Other bookmarks', '书签栏', '其他书签');

                        const bookmarksBarNode: GeneratedNode = { title: 'Bookmarks bar', children: [] };
                        const finalTree: GeneratedNode[] = [];
                        let foundBookmarksBar = false;
                        let otherBookmarksNode: GeneratedNode | null = null;

                        for (const node of organizedTree) {
                            if (node.title && existingTopLevelFolders.includes(node.title)) {
                                if (node.title === 'Bookmarks bar' || node.title === '书签栏') {
                                    bookmarksBarNode.children!.push(...(node.children || []));
                                    if (!foundBookmarksBar) {
                                        finalTree.push(bookmarksBarNode);
                                        foundBookmarksBar = true;
                                    }
                                } else if (node.title === 'Other bookmarks' || node.title === '其他书签') {
                                    // Handle 'Other Bookmarks' separately
                                    if (!otherBookmarksNode) {
                                        otherBookmarksNode = { title: node.title, children: [] };
                                        finalTree.push(otherBookmarksNode);
                                    }
                                    otherBookmarksNode.children!.push(...(node.children || []));
                                } else {
                                    finalTree.push(node);
                                }
                            } else if(node.children) {
                                bookmarksBarNode.children!.push(...node.children);
                                if (!foundBookmarksBar) {
                                    finalTree.push(bookmarksBarNode);
                                    foundBookmarksBar = true;
                                }
                            }
                        }
                        if (!foundBookmarksBar && bookmarksBarNode.children!.length > 0) {
                            finalTree.push(bookmarksBarNode);
                        }

                        tempIdCounter = 0; // Reset counter for unique IDs
                        setEditableGeneratedTree(mapRawTreeToDisplayTree(finalTree, '0', bookmarksMap));
                    } catch (error) {
                        errorLog('handleGenerate: Failed to parse LLM response.', { errorType: getErrorType(error) });
                        setError(t('errors.aiParseFailed.message'));
                    } finally {
                        setIsLoading(false);
                    }
                },
                onError: (err) => {
                    errorLog('handleGenerate: LLM Error callback.', { errorType: getErrorType(err) });
                    setError(t('organizeAiModal.generateError'));
                    setIsLoading(false);
                },
            },
            abortControllerRef.current.signal,
            { stream: false }
        );
    } catch (err) {
        if ((err as Error).name !== 'AbortError') {
            errorLog('handleGenerate: Failed to send message.', { errorType: getErrorType(err) });
            setError(t('organizeAiModal.generateError'));
            setIsLoading(false);
        }
    }
  };
  
  const handleApplyChanges = async () => {
    if (!editableGeneratedTree) return;
    debugLog('handleApplyChanges: Starting to apply new structure.', editableGeneratedTree.length);
    setIsLoading(true);
    setError(null);
    try {
        const rawTreeToApply = mapDisplayTreeToRawTree(editableGeneratedTree);
        debugLog('handleApplyChanges: Mapped raw tree to apply.', rawTreeToApply.length);
        await applyBookmarkOrganization(rawTreeToApply);
        debugLog('handleApplyChanges: Successfully applied new structure.');
        onClose(); // No need to pass true, refresh is handled by the hook
    } catch (error) {
        errorLog('handleApplyChanges: Failed to apply new bookmark tree.', { errorType: getErrorType(error) });
        setError(t('organizeAiModal.applyError'));
    } finally {
        setIsLoading(false);
    }
  };

  const handleClose = () => {
      if (abortControllerRef.current) {
          abortControllerRef.current.abort();
      }
      onClose();
  }

  const handleInMemoryRename = async (id: string, newTitle: string) => {
    setEditableGeneratedTree(prevTree => {
        if (!prevTree) return null;
        const newTree = JSON.parse(JSON.stringify(prevTree)); // Deep copy
        const rename = (nodes: EnhancedBookmark[]): boolean => {
            for (const node of nodes) {
                if (node.id === id) {
                    node.title = newTitle;
                    return true;
                }
                if (node.children && rename(node.children)) return true;
            }
            return false;
        };
        rename(newTree);
        return newTree;
    });
  };

  const handleInMemoryDelete = async (id: string) => {
    setEditableGeneratedTree(prevTree => {
        if (!prevTree) return null;
        const deleteNode = (nodes: EnhancedBookmark[], targetId: string): EnhancedBookmark[] => {
            return nodes.filter(node => {
                if (node.id === targetId) return false;
                if (node.children) {
                    node.children = deleteNode(node.children, targetId);
                }
                return true;
            });
        };
        return deleteNode(JSON.parse(JSON.stringify(prevTree)), id);
    });
  };

  const handleInMemoryCreate = async (parentId: string, title: string) => {
    setEditableGeneratedTree(prevTree => {
        if (!prevTree) return null;
        const newTree = JSON.parse(JSON.stringify(prevTree)); // Deep copy
        const newNode: EnhancedBookmark = {
            id: `temp-folder-${++tempIdCounter}`,
            title,
            parentId,
            index: 0,
            children: [],
            syncing: false
        };
        const add = (nodes: EnhancedBookmark[]): boolean => {
            for (const node of nodes) {
                if (node.id === parentId) {
                    node.children = node.children ? [...node.children, newNode] : [newNode];
                    node.children.forEach((child, index) => child.index = index);
                    return true;
                }
                if (node.children && add(node.children)) return true;
            }
            return false;
        };
        add(newTree);
        return newTree;
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={t('organizeAiModal.title')} widthClass="max-w-4xl">
        {error && (
          <div className="mb-4 p-3 nb-border bg-[color:var(--nb-accent-pink)] text-sm nb-text">
            {error}
          </div>
        )}
        <div className="flex space-x-6 h-[60vh]">
            <div className="w-1/2 h-full overflow-y-auto nb-border rounded-none p-4 nb-bg-card">
                <h4 className="text-lg font-semibold mb-2">{t('organizeAiModal.currentStructure')}</h4>
                <BookmarkFolderTree nodes={bookmarks} selectedFolderId="" onSelectFolder={() => {}} disableContextMenu={true} createFolder={async () => {}} renameFolder={async () => {}} deleteFolder={async () => {}} />
            </div>
            <div className="w-1/2 h-full overflow-y-auto nb-border rounded-none p-4 nb-bg-halftone">
                <h4 className="text-lg font-semibold mb-2">{t('organizeAiModal.generatedStructure')}</h4>
                {finalIsLoading && !editableGeneratedTree && (
                  <div className="flex items-center justify-center h-full nb-text-secondary">
                    <p>{t('organizeAiModal.generating')}</p>
                  </div>
                )}
                {editableGeneratedTree ? (
                     <BookmarkFolderTree nodes={editableGeneratedTree} selectedFolderId="" onSelectFolder={() => {}} disableContextMenu={false} createFolder={handleInMemoryCreate} renameFolder={handleInMemoryRename} deleteFolder={handleInMemoryDelete} />
                ) : (
                    !finalIsLoading && (
                      <div className="flex items-center justify-center h-full nb-text-secondary">
                        <p>{t('organizeAiModal.startHint')}</p>
                      </div>
                    )
                )}
            </div>
        </div>
        <div className="flex justify-end space-x-4 mt-6">
            <button onClick={handleClose} className="nb-btn nb-btn-secondary px-5 py-2" disabled={finalIsLoading}>{t('organizeAiModal.cancel')}</button>
            {editableGeneratedTree ? (
                <>
                    <button onClick={handleGenerate} className="nb-btn nb-btn-secondary px-5 py-2" disabled={finalIsLoading}>{finalIsLoading ? t('organizeAiModal.regenerating') : t('organizeAiModal.regenerate')}</button>
                    <button onClick={handleApplyChanges} className="nb-btn nb-btn-primary px-5 py-2" disabled={finalIsLoading}>{finalIsLoading ? t('organizeAiModal.applying') : t('organizeAiModal.apply')}</button>
                </>
            ) : (
                <button onClick={handleGenerate} className="nb-btn nb-btn-primary px-5 py-2" disabled={finalIsLoading}>{finalIsLoading ? t('organizeAiModal.generating') : t('organizeAiModal.start')}</button>
            )}
        </div>
    </Modal>
  );
};
