/**
 * 剪贴板工具函数
 * 提供复制文本到剪贴板的功能
 */

/**
 * 复制文本到剪贴板
 * @param text 要复制的文本
 * @returns Promise<boolean> 复制是否成功
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
  if (!text) return false;

  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);

    // 降级方案：使用 document.execCommand
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);

      return successful;
    } catch (fallbackError) {
      console.error('Fallback copy method also failed:', fallbackError);
      return false;
    }
  }
};
