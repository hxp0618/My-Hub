import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { EnhancedBookmark } from '../../../types/bookmarks';
import { useTranslation } from 'react-i18next';

// =================================================================================
// Hooks
// =================================================================================

const useClickOutside = (ref: React.RefObject<any>, handler: () => void) => {
    useEffect(() => {
      const listener = (event: MouseEvent | TouchEvent) => {
        if (!ref.current || ref.current.contains(event.target as Node)) {
          return;
        }
        handler();
      };
      document.addEventListener('mousedown', listener);
      document.addEventListener('touchstart', listener);
      return () => {
        document.removeEventListener('mousedown', listener);
        document.removeEventListener('touchstart', listener);
      };
    }, [ref, handler]);
};


// =================================================================================
// Modals
// =================================================================================

const FolderModal: React.FC<{
    mode: 'create' | 'rename';
    folderName?: string;
    onSave: (name: string) => void;
    onClose: () => void;
}> = ({ mode, folderName, onSave, onClose }) => {
    const { t } = useTranslation();
    const [name, setName] = useState(folderName || '');

    const handleSave = () => {
        if (name.trim()) {
            onSave(name.trim());
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 bg-[rgba(36,36,37,0.35)] flex items-center justify-center z-50">
            <div className="nb-card-static w-full max-w-sm p-6">
                <h3 className="text-lg font-bold nb-text mb-6">{mode === 'create' ? t('bookmarks.newFolder') : t('bookmarks.renameFolder')}</h3>
                <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder={t('bookmarks.folderNamePlaceholder')}
                    className="nb-input w-full mt-2"
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                />
                <div className="flex justify-end space-x-4 mt-8">
                    <button onClick={onClose} className="nb-btn nb-btn-secondary px-5 py-2">{t('common.cancel')}</button>
                    <button onClick={handleSave} className="nb-btn nb-btn-primary px-5 py-2">{t('common.save')}</button>
                </div>
            </div>
        </div>
    );
};

const DeleteConfirmModal: React.FC<{
    folder: EnhancedBookmark;
    onConfirm: (strategy: 'deleteAll' | 'moveContents') => void;
    onClose: () => void;
}> = ({ folder, onConfirm, onClose }) => {
    const { t } = useTranslation();
    
    // 递归计算所有子项（包括子文件夹和书签）
    const countAllItems = (node: EnhancedBookmark): number => {
        if (!node.children || node.children.length === 0) return 0;
        
        return node.children.reduce((count, child) => {
            // 计算当前项 (1) + 递归计算子项
            return count + 1 + countAllItems(child);
        }, 0);
    };
    
    const totalItems = countAllItems(folder);
    
    return (
        <div className="fixed inset-0 bg-[rgba(36,36,37,0.35)] flex items-center justify-center z-50">
            <div className="nb-card-static w-full max-w-md p-6">
                <h3 className="text-lg font-bold nb-text mb-2">{t('bookmarks.deleteFolder')}</h3>
                <p className="nb-text-secondary mb-6">{t('bookmarks.deleteFolderConfirm', { folderName: folder.title })}</p>
                <div className="space-y-4">
                    <button
                        onClick={() => onConfirm('deleteAll')}
                        className="nb-btn nb-btn-danger w-full justify-start flex-col items-start gap-1 text-left"
                    >
                        <p className="font-semibold nb-text">{t('bookmarks.deleteFolderAndContents')}</p>
                        <p className="text-sm text-[color:var(--nb-border)]">
                            {totalItems === 0
                                ? t('bookmarks.deleteFolderAndContentsWarningEmpty')
                                : t('bookmarks.deleteFolderAndContentsWarning', { count: totalItems })
                            }
                        </p>
                    </button>
                    <button
                        onClick={() => onConfirm('moveContents')}
                        className="nb-btn nb-btn-secondary w-full justify-start flex-col items-start gap-1 text-left"
                    >
                        <p className="font-semibold nb-text">{t('bookmarks.deleteFolderKeepContents')}</p>
                        <p className="text-sm nb-text-secondary">{t('bookmarks.deleteFolderKeepContentsDesc')}</p>
                    </button>
                </div>
                <div className="flex justify-end mt-8">
                    <button onClick={onClose} className="nb-btn nb-btn-secondary px-5 py-2">{t('common.cancel')}</button>
                </div>
            </div>
        </div>
    );
};


// =================================================================================
// Main Component & Sub-components
// =================================================================================

interface BookmarkFolderTreeProps {
  nodes: EnhancedBookmark[];
  selectedFolderId: string;
  onSelectFolder: (id: string) => void;
  createFolder: (parentId: string, title: string) => Promise<void>;
  renameFolder: (id: string, newTitle: string) => Promise<void>;
  deleteFolder: (id: string, strategy: 'deleteAll' | 'moveContents') => Promise<void>;
  disableContextMenu?: boolean;
  moveFolder?: (id: string, newParentId: string) => Promise<void>;
  moveBookmark?: (id: string, newParentId: string) => Promise<void>;
  onDropComplete?: () => void;
}

interface FolderNodeProps {
    node: EnhancedBookmark;
    selectedFolderId: string;
    onSelectFolder: (id: string) => void;
    level: number;
    actions: {
      createFolder: (parentId: string, title: string) => Promise<void>;
      renameFolder: (id: string, newTitle: string) => Promise<void>;
      deleteFolder: (id: string, strategy: 'deleteAll' | 'moveContents') => Promise<void>;
    };
    disableContextMenu?: boolean;
    dragController: DragController;
}

type DraggedItem = {
  type: 'folder' | 'bookmark';
  id: string;
  parentId: string | null;
  title?: string;
};

interface DragController {
  enabled: boolean;
  allowFolderDrag: boolean;
  draggingId: string | null;
  dragOver: { id: string; isValid: boolean } | null;
  onFolderDragStart: (event: React.DragEvent<HTMLDivElement>, node: EnhancedBookmark) => void;
  onDragEnd: () => void;
  onDragOver: (event: React.DragEvent<HTMLDivElement>, node: EnhancedBookmark) => void;
  onDragLeave: (event: React.DragEvent<HTMLDivElement>, node: EnhancedBookmark) => void;
  onDrop: (event: React.DragEvent<HTMLDivElement>, node: EnhancedBookmark) => void;
}

const FolderNode: React.FC<FolderNodeProps> = ({
  node,
  selectedFolderId,
  onSelectFolder,
  level,
  actions,
  disableContextMenu,
  dragController,
}) => {
  const { t } = useTranslation();
  const isSelected = node.id === selectedFolderId;
  const hasChildren = node.children && node.children.some(child => child.url === undefined);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useClickOutside(menuRef, () => setMenuOpen(false));

  const [modal, setModal] = useState<'create' | 'rename' | 'delete' | null>(null);

  // 展开/收缩状态管理 - 默认展开第一级文件夹,并使用 localStorage 持久化
  const storageKey = `folder-expanded-${node.id}`;
  const [isExpanded, setIsExpanded] = useState(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored !== null) {
        return stored === 'true';
      }
    } catch (error) {
      console.error('Error reading folder state from localStorage:', error);
    }
    // 默认展开第一级文件夹
    return level === 0;
  });

  // 持久化展开状态
  const toggleExpanded = () => {
    const newState = !isExpanded;
    setIsExpanded(newState);
    try {
      localStorage.setItem(storageKey, String(newState));
    } catch (error) {
      console.error('Error saving folder state to localStorage:', error);
    }
  };

  const handleCreateFolder = async (name: string) => {
    await actions.createFolder(node.id, name);
    // 创建子文件夹后自动展开当前文件夹
    if (!isExpanded) {
      toggleExpanded();
    }
  };
  const handleRenameFolder = async (name: string) => {
    await actions.renameFolder(node.id, name);
  };
  const handleDeleteFolder = async (strategy: 'deleteAll' | 'moveContents') => {
    await actions.deleteFolder(node.id, strategy);
    setModal(null);
  };

  const isDragOver = dragController.enabled && dragController.dragOver?.id === node.id;
  const isDropAllowed = isDragOver ? dragController.dragOver?.isValid ?? false : false;
  const isDraggingSelf = dragController.enabled && dragController.draggingId === node.id;
  const isRootFolder = node.parentId === '0';
  const draggable = dragController.allowFolderDrag && !isRootFolder;
  const baseRowClasses =
    'nb-bg-card nb-border rounded-lg flex items-center py-2.5 px-3 text-sm transition-all shadow-[var(--nb-shadow-none,0px_0px_0px_0px_#242425)]';
  const selectedClasses = isSelected ? ' nb-selected font-semibold shadow-[var(--nb-shadow)]' : '';
  const dragHighlightClasses = !dragController.enabled
    ? ''
    : isDragOver
      ? (isDropAllowed
          ? ' border-[color:var(--nb-accent-green)] shadow-[var(--nb-shadow)]'
          : ' border-[color:var(--nb-accent-pink)] shadow-[var(--nb-shadow)]')
      : '';
  const draggingClasses = isDraggingSelf ? ' opacity-60' : '';
  const hoverClasses = isSelected ? '' : ' hover:shadow-[var(--nb-shadow)] hover:-translate-y-[1px]';
  const rowClasses = `${baseRowClasses}${selectedClasses}${dragHighlightClasses}${draggingClasses}${hoverClasses}`;

  const rowStyle = useMemo(() => ({ '--indent-level': String(level) } as React.CSSProperties), [level]);
  const indentGuides = useMemo(() => {
    if (level <= 0) return null;
    return Array.from({ length: level }).map((_, index) => (
      <span
        key={index}
        className="folder-indent-guide"
        style={{ '--guide-index': String(index) } as React.CSSProperties}
      />
    ));
  }, [level]);

  useEffect(() => {
    if (isDropAllowed && hasChildren && !isExpanded) {
      setIsExpanded(true);
    }
  }, [hasChildren, isDropAllowed, isExpanded]);

  return (
    <>
      <div className={`group relative ${menuOpen ? 'z-50' : ''}`}>
        <div
          className={`${rowClasses} folder-node-row cursor-pointer`}
          style={rowStyle}
          data-level={level}
          draggable={draggable}
          onClick={() => onSelectFolder(node.id)}
          onDragStart={draggable ? (event) => dragController.onFolderDragStart(event, node) : undefined}
          onDragEnd={draggable ? () => dragController.onDragEnd() : undefined}
          onDragOver={dragController.enabled ? (event) => dragController.onDragOver(event, node) : undefined}
          onDragLeave={dragController.enabled ? (event) => dragController.onDragLeave(event, node) : undefined}
          onDrop={dragController.enabled ? (event) => dragController.onDrop(event, node) : undefined}
        >
          {indentGuides}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!hasChildren) return;
              toggleExpanded();
            }}
            className={`mr-2 nb-btn nb-btn-secondary p-0 w-9 h-9 flex-shrink-0 ${
              hasChildren ? '' : 'opacity-40 cursor-not-allowed'
            }`}
            aria-label={isExpanded ? t('bookmarks.collapse') : t('bookmarks.expand')}
            disabled={!hasChildren}
          >
            <span
              className="material-symbols-outlined icon-linear text-base transition-transform"
              style={{ transform: hasChildren && isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
            >
              chevron_right
            </span>
          </button>
          <div className="flex items-center flex-1 min-w-0 nb-text">
            <span className="material-symbols-outlined icon-linear mr-3 text-base">
              folder
            </span>
            <span className="truncate">{node.title}</span>
          </div>
        </div>
        
        {!disableContextMenu && (
            <div className="absolute right-0 top-1/2 -translate-y-1/2" ref={menuRef}>
                <button 
                    className="nb-btn nb-btn-secondary p-2 w-10 h-10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => setMenuOpen(!menuOpen)}
                >
                    <span className="material-symbols-outlined icon-linear text-lg">more_horiz</span>
                </button>
                {menuOpen && (
                    <div
                        className="nb-dropdown absolute right-0 mt-2 w-56 z-[1000]"
                        onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
                        onMouseUp={(e) => { e.stopPropagation(); e.preventDefault(); }}
                        onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}
                        onContextMenu={(e) => { e.stopPropagation(); e.preventDefault(); }}
                    >
                        <div className="py-1 select-none">
                            <div onClick={() => { setModal('create'); setMenuOpen(false); }} className="nb-dropdown-item flex items-center px-4 py-2 text-sm cursor-pointer">
                                <span className="material-symbols-outlined icon-linear text-lg mr-3">create_new_folder</span>{t('bookmarks.newFolder')}
                            </div>
                            {node.unmodifiable !== 'managed' && node.parentId !== '0' && (
                                <>
                                    <div onClick={() => { setModal('rename'); setMenuOpen(false); }} className="nb-dropdown-item flex items-center px-4 py-2 text-sm cursor-pointer">
                                        <span className="material-symbols-outlined icon-linear text-lg mr-3">drive_file_rename_outline</span>{t('actions.rename')}
                                    </div>
                                    <div onClick={() => { setModal('delete'); setMenuOpen(false); }} className="nb-dropdown-item flex items-center px-4 py-2 text-sm cursor-pointer text-[color:var(--nb-accent-pink)]">
                                        <span className="material-symbols-outlined icon-linear text-lg mr-3">delete</span>{t('common.delete')}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>
        )}
      </div>
      {hasChildren && isExpanded && (
        <div className="transition-all duration-200 ease-in-out">
          {node.children &&
            node.children
              .filter(child => child.url === undefined) // Only render folders
              .map(childNode => (
                <FolderNode
                  key={childNode.id}
                  node={childNode}
                  selectedFolderId={selectedFolderId}
                  onSelectFolder={onSelectFolder}
                  level={level + 1}
                  actions={actions}
                  disableContextMenu={disableContextMenu}
                  dragController={dragController}
                />
              ))}
        </div>
      )}
      
      {modal === 'create' && <FolderModal mode="create" onSave={handleCreateFolder} onClose={() => setModal(null)} />}
      {modal === 'rename' && <FolderModal mode="rename" folderName={node.title} onSave={handleRenameFolder} onClose={() => setModal(null)} />}
      {modal === 'delete' && <DeleteConfirmModal folder={node} onConfirm={handleDeleteFolder} onClose={() => setModal(null)} />}
    </>
  );
};

export const BookmarkFolderTree: React.FC<BookmarkFolderTreeProps> = ({
  nodes,
  selectedFolderId,
  onSelectFolder,
  createFolder,
  renameFolder,
  deleteFolder,
  disableContextMenu,
  moveFolder,
  moveBookmark,
  onDropComplete,
}) => {
  const folders = nodes.filter(node => node.url === undefined);

  const folderMap = useMemo(() => {
    const map = new Map<string, EnhancedBookmark>();
    const collect = (node: EnhancedBookmark) => {
      if (node.url === undefined) {
        map.set(node.id, node);
        node.children?.forEach(child => collect(child as EnhancedBookmark));
      }
    };
    nodes.forEach(node => collect(node));
    return map;
  }, [nodes]);

  const [draggingItem, setDraggingItem] = useState<DraggedItem | null>(null);
  const [dragOverState, setDragOverState] = useState<{ id: string; isValid: boolean } | null>(null);

  const isDescendant = useCallback(
    (ancestorId: string, maybeDescendantId: string) => {
      const ancestor = folderMap.get(ancestorId);
      if (!ancestor?.children) {
        return false;
      }
      const stack = [...ancestor.children];
      while (stack.length) {
        const current = stack.pop();
        if (!current) continue;
        if (current.id === maybeDescendantId) {
          return true;
        }
        if (current.children) {
          stack.push(...current.children);
        }
      }
      return false;
    },
    [folderMap]
  );

  const resolvePayload = useCallback(
    (event: React.DragEvent<HTMLDivElement>): DraggedItem | null => {
      if (draggingItem) {
        return draggingItem;
      }
      const raw = event.dataTransfer.getData('application/myhub-node');
      if (!raw) {
        return null;
      }
      try {
        const parsed = JSON.parse(raw) as DraggedItem;
        return parsed;
      } catch (error) {
        console.warn('[BookmarkFolderTree] Failed to parse drag payload:', error);
        return null;
      }
    },
    [draggingItem]
  );

  const handleFolderDragStart = useCallback(
    (event: React.DragEvent<HTMLDivElement>, node: EnhancedBookmark) => {
      if (!moveFolder || node.parentId === '0') {
        return;
      }
      const payload: DraggedItem = {
        type: 'folder',
        id: node.id,
        parentId: node.parentId ?? null,
        title: node.title,
      };
      setDraggingItem(payload);
      event.dataTransfer.setData('application/myhub-node', JSON.stringify(payload));
      event.dataTransfer.effectAllowed = 'move';
    },
    [moveFolder]
  );

  const handleDragEnd = useCallback(() => {
    setDraggingItem(null);
    setDragOverState(null);
  }, []);

  const handleDragOver = useCallback(
    (event: React.DragEvent<HTMLDivElement>, node: EnhancedBookmark) => {
      if (!moveFolder && !moveBookmark) {
        return;
      }
      const payload = resolvePayload(event);
      if (!payload) {
        setDragOverState(null);
        return;
      }
      const isSelf = payload.type === 'folder' && payload.id === node.id;
      const invalidDescendant = payload.type === 'folder' ? isDescendant(payload.id, node.id) : false;
      const isValid =
        !isSelf &&
        !invalidDescendant &&
        ((payload.type === 'folder' && !!moveFolder) || (payload.type === 'bookmark' && !!moveBookmark));

      if (isValid) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
      } else {
        event.dataTransfer.dropEffect = 'none';
      }
      setDragOverState({ id: node.id, isValid });
    },
    [isDescendant, moveBookmark, moveFolder, resolvePayload]
  );

  const handleDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>, node: EnhancedBookmark) => {
    const nextTarget = event.relatedTarget as Node | null;
    if (!nextTarget || !event.currentTarget.contains(nextTarget)) {
      setDragOverState(current => (current?.id === node.id ? null : current));
    }
  }, []);

  const handleDrop = useCallback(
    async (event: React.DragEvent<HTMLDivElement>, node: EnhancedBookmark) => {
      if (!moveFolder && !moveBookmark) {
        return;
      }
      event.preventDefault();
      const payload = resolvePayload(event);
      setDragOverState(null);
      setDraggingItem(null);
      if (!payload) {
        return;
      }

      const isSelf = payload.type === 'folder' && payload.id === node.id;
      const invalidDescendant = payload.type === 'folder' ? isDescendant(payload.id, node.id) : false;
      if (isSelf || invalidDescendant) {
        return;
      }

      if (payload.type === 'folder') {
        if (!moveFolder || payload.parentId === node.id) {
          return;
        }
        try {
          await moveFolder(payload.id, node.id);
          onDropComplete?.();
        } catch (error) {
          console.error('[BookmarkFolderTree] Failed to move folder:', error);
        }
      } else if (payload.type === 'bookmark') {
        if (!moveBookmark || payload.parentId === node.id) {
          return;
        }
        try {
          await moveBookmark(payload.id, node.id);
          onDropComplete?.();
        } catch (error) {
          console.error('[BookmarkFolderTree] Failed to move bookmark:', error);
        }
      }
    },
    [isDescendant, moveBookmark, moveFolder, onDropComplete, resolvePayload]
  );

  const dragController: DragController = {
    enabled: Boolean(moveFolder || moveBookmark),
    allowFolderDrag: Boolean(moveFolder),
    draggingId: draggingItem?.type === 'folder' ? draggingItem.id : null,
    dragOver: dragOverState,
    onFolderDragStart: handleFolderDragStart,
    onDragEnd: handleDragEnd,
    onDragOver: handleDragOver,
    onDragLeave: handleDragLeave,
    onDrop: handleDrop,
  };

  return (
    <nav className="space-y-1 pr-4">
      {folders.map(node => (
        <FolderNode
          key={node.id}
          node={node}
          selectedFolderId={selectedFolderId}
          onSelectFolder={onSelectFolder}
          level={0}
          actions={{ createFolder, renameFolder, deleteFolder }}
          disableContextMenu={disableContextMenu}
          dragController={dragController}
        />
      ))}
    </nav>
  );
};
