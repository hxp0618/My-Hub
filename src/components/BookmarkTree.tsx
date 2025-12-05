import React, { useEffect, useState } from 'react';

interface BookmarkTreeProps {
  selectedFolder: string;
  setSelectedFolder: (folderId: string) => void;
}

const BookmarkTree: React.FC<BookmarkTreeProps> = ({ selectedFolder, setSelectedFolder }) => {
  const [bookmarkTree, setBookmarkTree] = useState<chrome.bookmarks.BookmarkTreeNode[]>([]);

  useEffect(() => {
    chrome.bookmarks.getTree(tree => {
      setBookmarkTree(tree[0].children || []);
    });
  }, []);

  const renderOptions = (nodes: chrome.bookmarks.BookmarkTreeNode[], level = 0): React.ReactNode[] => {
    return nodes.flatMap(node => {
      if (node.children) { // It's a folder
        const prefix = '\u00A0\u00A0'.repeat(level);
        return [
          <option key={node.id} value={node.id}>
            {prefix}{node.title}
          </option>,
          ...renderOptions(node.children, level + 1),
        ];
      }
      return [];
    });
  };

  return (
    <select
      value={selectedFolder}
      onChange={e => setSelectedFolder(e.target.value)}
      className="nb-input w-full appearance-none"
    >
      {renderOptions(bookmarkTree)}
    </select>
  );
};

export default BookmarkTree;
