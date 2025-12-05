import React, { useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ToolCard } from '../../../../components/ToolCard';
import { TOOL_METADATA, ToolId, ToolComponentProps } from '../../../../types/tools';
import {
  HttpMethod,
  HTTP_METHODS,
  HeaderEntry,
  ResponseState,
  METHODS_WITH_BODY,
} from '../../../../types/http';
import {
  isValidUrl,
  isValidJson,
  getStatusColor,
  sendHttpRequest,
  headersToRecord,
  formatJson,
  formatSize,
  formatTime,
  isJsonContent,
} from '../../../../utils/httpUtils';
import { generateCurl } from '../../../../utils/curlUtils';
import { CurlParseSuccess } from '../../../../types/curl';
import { useHttpHistory } from '../../../../hooks/useHttpHistory';
import { CurlImportModal } from '../../../../components/CurlImportModal';

/**
 * HTTP URL 测试工具组件
 */
export const HTTPUrlTesterTool: React.FC<ToolComponentProps> = ({
  isExpanded,
  onToggleExpand,
}) => {
  const { t } = useTranslation();
  const { history, addEntry, removeEntry, clearAll, restoreEntry } = useHttpHistory();

  // 请求状态
  const [url, setUrl] = useState('');
  const [method, setMethod] = useState<HttpMethod>('GET');
  const [headers, setHeaders] = useState<HeaderEntry[]>([
    { key: '', value: '', enabled: true },
  ]);
  const [body, setBody] = useState('');

  // 响应状态
  const [response, setResponse] = useState<ResponseState | null>(null);
  const [loading, setLoading] = useState(false);

  // curl 导入对话框状态
  const [showCurlImport, setShowCurlImport] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  // 验证状态
  const urlError = useMemo(() => {
    if (!url.trim()) return null;
    return isValidUrl(url) ? null : t('tools.httpTester.invalidUrl');
  }, [url, t]);

  const bodyError = useMemo(() => {
    if (!body.trim() || !METHODS_WITH_BODY.includes(method)) return null;
    const result = isValidJson(body);
    return result.valid ? null : result.error;
  }, [body, method]);

  const canSend = useMemo(() => {
    return url.trim() && !urlError && !bodyError && !loading;
  }, [url, urlError, bodyError, loading]);

  // 是否显示请求体
  const showBody = METHODS_WITH_BODY.includes(method);

  // 添加请求头
  const addHeader = useCallback(() => {
    setHeaders((prev) => [...prev, { key: '', value: '', enabled: true }]);
  }, []);

  // 更新请求头
  const updateHeader = useCallback(
    (index: number, field: keyof HeaderEntry, value: string | boolean) => {
      setHeaders((prev) => {
        const newHeaders = [...prev];
        newHeaders[index] = { ...newHeaders[index], [field]: value };
        return newHeaders;
      });
    },
    []
  );

  // 删除请求头
  const removeHeader = useCallback((index: number) => {
    setHeaders((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // 发送请求
  const handleSend = useCallback(async () => {
    if (!canSend) return;

    setLoading(true);
    setResponse(null);

    try {
      const result = await sendHttpRequest({
        url: url.trim(),
        method,
        headers: headersToRecord(headers),
        body: showBody ? body : undefined,
      });

      setResponse({
        status: result.status,
        statusText: result.statusText,
        headers: result.headers,
        body: result.body,
        time: result.time,
        size: result.size,
      });

      // 保存到历史记录
      await addEntry(
        {
          url: url.trim(),
          method,
          headers,
          body: showBody ? body : '',
        },
        {
          status: result.status,
          statusText: result.statusText,
          time: result.time,
        }
      );
    } catch (error) {
      setResponse({
        status: 0,
        statusText: 'Error',
        headers: {},
        body: '',
        time: 0,
        size: 0,
        error: error instanceof Error ? error.message : t('tools.httpTester.networkError'),
      });
    } finally {
      setLoading(false);
    }
  }, [canSend, url, method, headers, body, showBody, addEntry, t]);

  // 恢复历史记录
  const handleRestore = useCallback(
    (id: string) => {
      const state = restoreEntry(id);
      if (state) {
        setUrl(state.url);
        setMethod(state.method);
        setHeaders(state.headers.length > 0 ? state.headers : [{ key: '', value: '', enabled: true }]);
        setBody(state.body);
        setResponse(null);
      }
    },
    [restoreEntry]
  );

  // 清空表单
  const handleClear = useCallback(() => {
    setUrl('');
    setMethod('GET');
    setHeaders([{ key: '', value: '', enabled: true }]);
    setBody('');
    setResponse(null);
  }, []);

  // 导入 curl 命令
  const handleCurlImport = useCallback((data: CurlParseSuccess['data']) => {
    setUrl(data.url);
    setMethod(data.method);
    setHeaders(data.headers.length > 0 ? data.headers : [{ key: '', value: '', enabled: true }]);
    setBody(data.body);
    setResponse(null);
  }, []);

  // 导出 curl 命令
  const handleCurlExport = useCallback(async () => {
    const curlCommand = generateCurl({
      url: url.trim(),
      method,
      headers,
      body: METHODS_WITH_BODY.includes(method) ? body : undefined,
    });
    
    try {
      await navigator.clipboard.writeText(curlCommand);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy curl command:', err);
    }
  }, [url, method, headers, body]);

  // 获取状态码颜色类名
  const getStatusColorClass = (status: number) => {
    const color = getStatusColor(status);
    switch (color) {
      case 'green':
        return 'nb-badge-green';
      case 'red':
        return 'nb-badge-pink';
      default:
        return 'nb-badge-yellow';
    }
  };

  return (
    <ToolCard
      tool={TOOL_METADATA[ToolId.HTTP_URL_TESTER]}
      isExpanded={isExpanded}
      onToggleExpand={onToggleExpand}
    >
      <div className="h-full flex gap-6">
        {/* 左侧：请求配置 */}
        <div className="flex-1 flex flex-col gap-4 min-w-0">
          {/* URL 和方法 */}
          <div className="flex gap-3">
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as HttpMethod)}
              className="nb-input w-32 font-medium"
            >
              {HTTP_METHODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <div className="flex-1">
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder={t('tools.httpTester.urlPlaceholder')}
                className={`nb-input w-full ${urlError ? 'border-[color:var(--nb-accent-pink)]' : ''}`}
              />
              {urlError && (
                <p className="text-xs mt-1" style={{ color: 'var(--nb-accent-pink)' }}>
                  {urlError}
                </p>
              )}
            </div>
            <button
              onClick={handleSend}
              disabled={!canSend}
              className="nb-btn nb-btn-primary px-6"
            >
              {loading ? (
                <span className="material-symbols-outlined animate-spin">progress_activity</span>
              ) : (
                t('tools.httpTester.send')
              )}
            </button>
            <button onClick={handleClear} className="nb-btn nb-btn-ghost">
              {t('tools.httpTester.clear')}
            </button>
            <button
              onClick={() => setShowCurlImport(true)}
              className="nb-btn nb-btn-ghost"
              title={t('tools.httpTester.importCurl')}
            >
              <span className="material-symbols-outlined text-sm">download</span>
            </button>
            <button
              onClick={handleCurlExport}
              disabled={!url.trim()}
              className="nb-btn nb-btn-ghost"
              title={t('tools.httpTester.exportCurl')}
            >
              <span className="material-symbols-outlined text-sm">
                {copySuccess ? 'check' : 'upload'}
              </span>
            </button>
          </div>

          {/* 请求头 */}
          <div className="nb-card-static p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold nb-text">{t('tools.httpTester.headers')}</h3>
              <button onClick={addHeader} className="nb-btn nb-btn-ghost text-xs py-1 px-2">
                <span className="material-symbols-outlined text-sm">add</span>
                {t('tools.httpTester.addHeader')}
              </button>
            </div>
            <div className="space-y-2">
              {headers.map((header, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={header.enabled}
                    onChange={(e) => updateHeader(index, 'enabled', e.target.checked)}
                    className="w-4 h-4 rounded nb-border accent-[var(--nb-accent-yellow)]"
                  />
                  <input
                    type="text"
                    value={header.key}
                    onChange={(e) => updateHeader(index, 'key', e.target.value)}
                    placeholder={t('tools.httpTester.headerKey')}
                    className="nb-input flex-1 text-sm py-1"
                  />
                  <input
                    type="text"
                    value={header.value}
                    onChange={(e) => updateHeader(index, 'value', e.target.value)}
                    placeholder={t('tools.httpTester.headerValue')}
                    className="nb-input flex-1 text-sm py-1"
                  />
                  <button
                    onClick={() => removeHeader(index)}
                    className="nb-btn nb-btn-ghost p-1"
                    disabled={headers.length === 1}
                  >
                    <span className="material-symbols-outlined text-sm">close</span>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* 请求体 */}
          {showBody && (
            <div className="nb-card-static p-4 flex-1 flex flex-col min-h-0">
              <h3 className="text-sm font-semibold nb-text mb-2">{t('tools.httpTester.body')}</h3>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder={t('tools.httpTester.bodyPlaceholder')}
                className={`nb-input flex-1 font-mono text-sm resize-none ${
                  bodyError ? 'border-[color:var(--nb-accent-pink)]' : ''
                }`}
              />
              {bodyError && (
                <p className="text-xs mt-1" style={{ color: 'var(--nb-accent-pink)' }}>
                  {bodyError}
                </p>
              )}
            </div>
          )}

          {/* 响应结果 */}
          {response && (
            <div className="nb-card-static p-4 flex-1 flex flex-col min-h-0">
              <div className="flex items-center gap-3 mb-3 flex-shrink-0">
                <h3 className="text-sm font-semibold nb-text">{t('tools.httpTester.response')}</h3>
                {response.error ? (
                  <span className="nb-badge nb-badge-pink">{t('tools.httpTester.error')}</span>
                ) : (
                  <>
                    <span className={`nb-badge ${getStatusColorClass(response.status)}`}>
                      {response.status} {response.statusText}
                    </span>
                    <span className="text-xs nb-text-secondary">{formatTime(response.time)}</span>
                    <span className="text-xs nb-text-secondary">{formatSize(response.size)}</span>
                  </>
                )}
              </div>
              {response.error ? (
                <div className="p-3 nb-bg rounded-lg">
                  <p className="text-sm" style={{ color: 'var(--nb-accent-pink)' }}>
                    {response.error}
                  </p>
                </div>
              ) : (
                <div className="flex-1 overflow-auto">
                  <pre className="p-3 nb-bg rounded-lg font-mono text-xs nb-text whitespace-pre-wrap break-all">
                    {isJsonContent(response.body, response.headers['content-type'])
                      ? formatJson(response.body)
                      : response.body}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 右侧：历史记录 */}
        <div className="w-72 flex-shrink-0 nb-card-static p-4 flex flex-col">
          <div className="flex items-center justify-between mb-3 flex-shrink-0">
            <h3 className="text-sm font-semibold nb-text">{t('tools.httpTester.history')}</h3>
            {history.length > 0 && (
              <button onClick={clearAll} className="nb-btn nb-btn-ghost text-xs py-1 px-2">
                {t('tools.httpTester.clearHistory')}
              </button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto space-y-2">
            {history.length === 0 ? (
              <p className="text-sm nb-text-secondary text-center py-4">
                {t('tools.httpTester.noHistory')}
              </p>
            ) : (
              history.map((entry) => (
                <div
                  key={entry.id}
                  className="nb-card-static p-3 cursor-pointer hover:bg-[color:var(--nb-bg-hover)] transition-colors"
                  onClick={() => handleRestore(entry.id)}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium nb-text">{entry.request.method}</span>
                    {entry.response && (
                      <span className={`nb-badge text-xs ${getStatusColorClass(entry.response.status)}`}>
                        {entry.response.status}
                      </span>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeEntry(entry.id);
                      }}
                      className="ml-auto nb-btn nb-btn-ghost p-0.5"
                    >
                      <span className="material-symbols-outlined text-sm">close</span>
                    </button>
                  </div>
                  <p className="text-xs nb-text-secondary truncate">{entry.request.url}</p>
                  <p className="text-xs nb-text-secondary mt-1">
                    {new Date(entry.timestamp).toLocaleString()}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* curl 导入对话框 */}
      <CurlImportModal
        isOpen={showCurlImport}
        onClose={() => setShowCurlImport(false)}
        onImport={handleCurlImport}
      />
    </ToolCard>
  );
};
