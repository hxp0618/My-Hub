// Content script for extracting page content
// Listens for messages from extension pages to extract and process page content

/**
 * 智能提取页面主要内容
 */
function extractPageContent() {
  try {
    // 尝试多个常见内容选择器
    const selectors = [
      'article',
      '[role="main"]',
      'main',
      '.article',
      '.post',
      '.content',
      '#content',
      '.entry-content',
      '.post-content',
      '.main-content',
      '.post-body',
      '#main-content',
    ];

    let mainContent: Element | null = null;
    for (const selector of selectors) {
      mainContent = document.querySelector(selector);
      if (mainContent && (mainContent.textContent?.length || 0) > 500) {
        break;
      }
    }

    // 如果还是找不到，使用 body
    if (!mainContent) {
      mainContent = document.body;
    }

    // 克隆并清理
    const clone = mainContent.cloneNode(true) as Element;

    // 移除不需要的元素
    const unwanted = clone.querySelectorAll(
      'script, style, noscript, iframe, ' +
      'nav, header, footer, aside, ' +
      '.sidebar, .advertisement, .ad, ' +
      '[class*="ad-"], [id*="ad-"], ' +
      '[class*="comment"], [id*="comment"], ' +
      '.menu, .navigation, .related, .share'
    );
    unwanted.forEach(el => el.remove());

    return {
      success: true,
      html: clone.innerHTML,
      title: document.title,
      text: clone.textContent || '',
      url: window.location.href,
    };
  } catch (error) {
    return {
      success: false,
      error: (error as Error).message,
    };
  }
}

/**
 * 监听来自扩展的消息
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[Reading List] Received message:', request);

  // 响应 ping 检查
  if (request.action === 'ping') {
    console.log('[Reading List] Responding to ping');
    sendResponse({ ready: true });
    return true;
  }

  // 处理内容提取
  if (request.action === 'extractContent') {
    try {
      const result = extractPageContent();
      console.log('[Reading List] Extraction result:', result.success ? 'success' : 'failed',
                  result.success ? `(${result.html.length} chars)` : result.error);
      sendResponse(result);
    } catch (error) {
      console.error('[Reading List] Extraction error:', error);
      sendResponse({
        success: false,
        error: (error as Error).message,
      });
    }
    return true; // 保持消息通道开放
  }

  return false; // 不是我们的消息
});

console.log('[Reading List] Content script loaded and ready');

