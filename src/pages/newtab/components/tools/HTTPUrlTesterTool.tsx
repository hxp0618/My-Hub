import React, { useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ToolCard } from '../../../../components/ToolCard';
import { TOOL_METADATA, ToolId, ToolComponentProps } from '../../../../types/tools';
import {
  HttpMethod,
  HTTP_METHODS,
  HeaderEntry,
  HttpAuthConfig,
  HttpBodyMode,
  HttpFormEntry,
  HttpVariableEntry,
  ResponseState,
  METHODS_WITH_BODY,
} from '../../../../types/http';
import {
  isValidUrl,
  isValidJson,
  applyHttpVariables,
  buildAuthHeaderEntries,
  createHttpRequestPayload,
  getStatusColor,
  sendHttpRequest,
  headersToRecord,
  formatJson,
  formatSize,
  formatTime,
  isJsonContent,
} from '../../../../utils/httpUtils';
import { generateCurl, parseCurl } from '../../../../utils/curlUtils';
import { CurlParseSuccess } from '../../../../types/curl';
import { HostPermissionDeniedError } from '../../../../utils/extensionPermissions';
import { useHttpHistory } from '../../../../hooks/useHttpHistory';
import { CurlImportModal } from '../../../../components/CurlImportModal';
import { createLogger } from '../../../../utils/logger';
import { useToolInvocation } from '../../../../hooks/useToolInvocation';

const logger = createLogger('[HTTPUrlTesterTool]');

export const HTTP_TESTER_LAYOUT_CLASSES = {
  shell: 'h-auto 2xl:h-full grid grid-cols-1 2xl:grid-cols-[minmax(0,1fr)_18rem] gap-6 min-w-0',
  requestPanel: 'min-w-0 2xl:min-h-0 flex flex-col gap-4',
  requestBar: 'grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_auto] gap-3 items-start',
  urlBar: 'grid grid-cols-1 sm:grid-cols-[8rem_minmax(0,1fr)] gap-3 min-w-0',
  requestActions: 'flex flex-wrap gap-2 xl:justify-end',
  configGrid: 'grid grid-cols-1 2xl:grid-cols-[minmax(420px,1fr)_minmax(320px,0.85fr)] gap-4 items-start',
  entryRow: 'grid grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)_auto] gap-2 items-center min-w-0',
  entryInput: 'nb-input min-w-0 w-full text-sm py-1',
  authGrid: 'grid grid-cols-1 gap-2',
  historyPanel: 'min-w-0 2xl:w-72 nb-card-static p-4 flex flex-col',
} as const;

/**
 * HTTP URL 测试工具组件
 */
export const HTTPUrlTesterTool: React.FC<ToolComponentProps> = ({
  isExpanded,
  onToggleExpand,
  invocation,
  onInvocationHandled,
}) => {
  const { t } = useTranslation();
  const { history, addEntry, removeEntry, clearAll, restoreEntry } = useHttpHistory();

  // 请求状态
  const [url, setUrl] = useState('');
  const [method, setMethod] = useState<HttpMethod>('GET');
  const [headers, setHeaders] = useState<HeaderEntry[]>([
    { key: '', value: '', enabled: true },
  ]);
  const [variables, setVariables] = useState<HttpVariableEntry[]>([
    { key: 'baseUrl', value: '', enabled: true },
  ]);
  const [auth, setAuth] = useState<HttpAuthConfig>({ type: 'none' });
  const [bodyMode, setBodyMode] = useState<HttpBodyMode>('json');
  const [formRows, setFormRows] = useState<HttpFormEntry[]>([
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
    return isValidUrl(applyHttpVariables(url, variables)) ? null : t('tools.httpTester.invalidUrl');
  }, [url, variables, t]);

  const bodyError = useMemo(() => {
    if (bodyMode !== 'json' || !body.trim() || !METHODS_WITH_BODY.includes(method)) return null;
    const result = isValidJson(body);
    return result.valid ? null : t('tools.httpTester.invalidJsonBody');
  }, [body, bodyMode, method, t]);

  const canSend = useMemo(() => {
    return url.trim() && !urlError && !bodyError && !loading;
  }, [url, urlError, bodyError, loading]);

  // 是否显示请求体
  const showBody = METHODS_WITH_BODY.includes(method);

  // 添加请求头
  const addHeader = useCallback(() => {
    setHeaders((prev) => [...prev, { key: '', value: '', enabled: true }]);
  }, []);

  const addVariable = useCallback(() => {
    setVariables(prev => [...prev, { key: '', value: '', enabled: true }]);
  }, []);

  const addFormRow = useCallback(() => {
    setFormRows(prev => [...prev, { key: '', value: '', enabled: true }]);
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

  const updateVariable = useCallback((index: number, field: keyof HttpVariableEntry, value: string | boolean) => {
    setVariables(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }, []);

  const updateFormRow = useCallback((index: number, field: keyof HttpFormEntry, value: string | boolean) => {
    setFormRows(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }, []);

  const removeVariable = useCallback((index: number) => {
    setVariables(prev => prev.filter((_, i) => i !== index));
  }, []);

  const removeFormRow = useCallback((index: number) => {
    setFormRows(prev => prev.filter((_, i) => i !== index));
  }, []);

  // 发送请求
  const handleSend = useCallback(async () => {
    if (!canSend) return;

    setLoading(true);
    setResponse(null);

    try {
      const preparedHeaders = headersToRecord([...headers, ...buildAuthHeaderEntries(auth)]);
      const requestHeaders = Object.fromEntries(
        Object.entries(preparedHeaders).map(([key, value]) => [
          applyHttpVariables(key, variables),
          applyHttpVariables(value, variables),
        ])
      );
      const payload = createHttpRequestPayload({
        method,
        bodyMode,
        body: applyHttpVariables(body, variables),
        formRows: formRows.map(row => ({
          ...row,
          key: applyHttpVariables(row.key, variables),
          value: applyHttpVariables(row.value, variables),
        })),
        headers: requestHeaders,
      });
      const result = await sendHttpRequest({
        url: applyHttpVariables(url.trim(), variables),
        method,
        headers: payload.headers,
        body: payload.body,
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
        error: t(error instanceof HostPermissionDeniedError
          ? 'tools.httpTester.hostPermissionDenied'
          : 'tools.httpTester.networkError'),
      });
    } finally {
      setLoading(false);
    }
  }, [canSend, url, method, headers, auth, variables, bodyMode, body, formRows, showBody, addEntry, t]);

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
    setVariables([{ key: 'baseUrl', value: '', enabled: true }]);
    setAuth({ type: 'none' });
    setBodyMode('json');
    setFormRows([{ key: '', value: '', enabled: true }]);
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

  useToolInvocation({
    invocation,
    targetToolId: ToolId.HTTP_URL_TESTER,
    onInvocationHandled,
    onApply: useCallback((nextInvocation) => {
      if (nextInvocation.mode === 'curl') {
        const parsed = parseCurl(nextInvocation.input);
        if (parsed.success) handleCurlImport(parsed.data);
        return;
      }
      setUrl(nextInvocation.input.trim());
      setResponse(null);
    }, [handleCurlImport]),
  });

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
    } catch (error) {
      logger.error('Failed to copy curl command', error);
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
      <div className={HTTP_TESTER_LAYOUT_CLASSES.shell} data-testid="http-tester-shell">
        {/* 左侧：请求配置 */}
        <div className={HTTP_TESTER_LAYOUT_CLASSES.requestPanel}>
          {/* URL 和方法 */}
          <div className={HTTP_TESTER_LAYOUT_CLASSES.requestBar} data-testid="http-tester-request-bar">
            <div className={HTTP_TESTER_LAYOUT_CLASSES.urlBar}>
              <select
                aria-label={t('tools.httpTester.method')}
                value={method}
                onChange={(e) => setMethod(e.target.value as HttpMethod)}
                className="nb-input w-full font-medium"
              >
                {HTTP_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              <div className="min-w-0">
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder={t('tools.httpTester.urlPlaceholder')}
                  className={`nb-input w-full ${urlError ? 'border-[color:var(--nb-accent-pink)]' : ''}`}
                />
                {urlError && (
                  <p className="text-xs mt-1" style={{ color: 'var(--color-error-text)' }}>
                    {urlError}
                  </p>
                )}
              </div>
            </div>
            <div className={HTTP_TESTER_LAYOUT_CLASSES.requestActions}>
              <button
                type="button"
                onClick={handleSend}
                disabled={!canSend}
                className="nb-btn nb-btn-primary px-6"
              >
                {loading ? (
                  <span className="material-symbols-outlined animate-spin" aria-hidden="true">progress_activity</span>
                ) : (
                  t('tools.httpTester.send')
                )}
              </button>
              <button type="button" onClick={handleClear} className="nb-btn nb-btn-ghost">
                {t('tools.httpTester.clear')}
              </button>
              <button
                type="button"
                onClick={() => setShowCurlImport(true)}
                className="nb-btn nb-btn-ghost min-h-11 min-w-11"
                title={t('tools.httpTester.importCurl')}
                aria-label={t('tools.httpTester.importCurl')}
              >
                <span className="material-symbols-outlined text-sm" aria-hidden="true">download</span>
              </button>
              <button
                type="button"
                onClick={handleCurlExport}
                disabled={!url.trim()}
                className="nb-btn nb-btn-ghost min-h-11 min-w-11"
                title={t('tools.httpTester.exportCurl')}
                aria-label={t('tools.httpTester.exportCurl')}
              >
                <span className="material-symbols-outlined text-sm" aria-hidden="true">
                  {copySuccess ? 'check' : 'upload'}
                </span>
              </button>
            </div>
          </div>

          {/* 环境变量和认证 */}
          <div className={HTTP_TESTER_LAYOUT_CLASSES.configGrid} data-testid="http-tester-config-grid">
            <div className="nb-card-static p-4 min-w-0">
              <div className="flex items-center justify-between gap-3 mb-3">
                <h3 className="text-sm font-semibold nb-text">{t('tools.httpTester.variables')}</h3>
                <button type="button" onClick={addVariable} className="nb-btn nb-btn-ghost text-xs py-1 px-2 shrink-0">
                  <span className="material-symbols-outlined text-sm" aria-hidden="true">add</span>
                  {t('tools.httpTester.addVariable')}
                </button>
              </div>
              <div className="space-y-2">
                {variables.map((variable, index) => (
                  <div
                    key={index}
                    className={HTTP_TESTER_LAYOUT_CLASSES.entryRow}
                    data-testid="http-tester-variable-row"
                  >
                    <input
                      type="checkbox"
                      aria-label={t('tools.httpTester.toggleVariable', { index: index + 1 })}
                      checked={variable.enabled}
                      onChange={(e) => updateVariable(index, 'enabled', e.target.checked)}
                      className="w-4 h-4 rounded nb-border accent-[var(--nb-accent-yellow)]"
                    />
                    <input
                      type="text"
                      value={variable.key}
                      onChange={(e) => updateVariable(index, 'key', e.target.value)}
                      placeholder={t('tools.httpTester.variableKey')}
                      className={HTTP_TESTER_LAYOUT_CLASSES.entryInput}
                    />
                    <input
                      type="text"
                      value={variable.value}
                      onChange={(e) => updateVariable(index, 'value', e.target.value)}
                      placeholder={t('tools.httpTester.variableValue')}
                      className={HTTP_TESTER_LAYOUT_CLASSES.entryInput}
                    />
                    <button
                      type="button"
                      onClick={() => removeVariable(index)}
                      className="nb-btn nb-btn-ghost min-h-11 min-w-11 p-1 shrink-0"
                      disabled={variables.length === 1}
                      aria-label={t('tools.httpTester.removeVariable', { index: index + 1 })}
                    >
                      <span className="material-symbols-outlined text-sm" aria-hidden="true">close</span>
                    </button>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-xs nb-text-secondary">{t('tools.httpTester.variablesHint')}</p>
            </div>

            <div className="nb-card-static p-4 min-w-0">
              <h3 className="text-sm font-semibold nb-text mb-3">{t('tools.httpTester.auth')}</h3>
              <div className={HTTP_TESTER_LAYOUT_CLASSES.authGrid}>
                <select
                  aria-label={t('tools.httpTester.auth')}
                  value={auth.type}
                  onChange={(e) => setAuth({ type: e.target.value as HttpAuthConfig['type'] })}
                  className="nb-input min-w-0 w-full text-sm"
                >
                  <option value="none">{t('tools.httpTester.authNone')}</option>
                  <option value="bearer">Bearer Token</option>
                  <option value="basic">Basic Auth</option>
                  <option value="apiKey">API Key</option>
                </select>
                {auth.type === 'bearer' && (
                  <input
                    type="password"
                    value={auth.token ?? ''}
                    onChange={(e) => setAuth(prev => ({ ...prev, token: e.target.value }))}
                    placeholder="Token"
                    className="nb-input min-w-0 w-full text-sm"
                  />
                )}
                {auth.type === 'basic' && (
                  <>
                    <input value={auth.username ?? ''} onChange={(e) => setAuth(prev => ({ ...prev, username: e.target.value }))} placeholder={t('tools.httpTester.username')} className="nb-input min-w-0 w-full text-sm" />
                    <input type="password" value={auth.password ?? ''} onChange={(e) => setAuth(prev => ({ ...prev, password: e.target.value }))} placeholder={t('tools.httpTester.password')} className="nb-input min-w-0 w-full text-sm" />
                  </>
                )}
                {auth.type === 'apiKey' && (
                  <>
                    <input value={auth.key ?? 'X-API-Key'} onChange={(e) => setAuth(prev => ({ ...prev, key: e.target.value }))} placeholder={t('tools.httpTester.headerKey')} className="nb-input min-w-0 w-full text-sm" />
                    <input type="password" value={auth.value ?? ''} onChange={(e) => setAuth(prev => ({ ...prev, value: e.target.value }))} placeholder={t('tools.httpTester.headerValue')} className="nb-input min-w-0 w-full text-sm" />
                  </>
                )}
              </div>
            </div>
          </div>

          {/* 请求头 */}
          <div className="nb-card-static p-4">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h3 className="text-sm font-semibold nb-text">{t('tools.httpTester.headers')}</h3>
              <button type="button" onClick={addHeader} className="nb-btn nb-btn-ghost text-xs py-1 px-2 shrink-0">
                <span className="material-symbols-outlined text-sm" aria-hidden="true">add</span>
                {t('tools.httpTester.addHeader')}
              </button>
            </div>
            <div className="space-y-2">
              {headers.map((header, index) => (
                <div
                  key={index}
                  className={HTTP_TESTER_LAYOUT_CLASSES.entryRow}
                  data-testid="http-tester-header-row"
                >
                  <input
                    type="checkbox"
                    aria-label={t('tools.httpTester.toggleHeader', { index: index + 1 })}
                    checked={header.enabled}
                    onChange={(e) => updateHeader(index, 'enabled', e.target.checked)}
                    className="w-4 h-4 rounded nb-border accent-[var(--nb-accent-yellow)]"
                  />
                  <input
                    type="text"
                    value={header.key}
                    onChange={(e) => updateHeader(index, 'key', e.target.value)}
                    placeholder={t('tools.httpTester.headerKey')}
                    className={HTTP_TESTER_LAYOUT_CLASSES.entryInput}
                  />
                  <input
                    type="text"
                    value={header.value}
                    onChange={(e) => updateHeader(index, 'value', e.target.value)}
                    placeholder={t('tools.httpTester.headerValue')}
                    className={HTTP_TESTER_LAYOUT_CLASSES.entryInput}
                  />
                  <button
                    type="button"
                    onClick={() => removeHeader(index)}
                    className="nb-btn nb-btn-ghost min-h-11 min-w-11 p-1 shrink-0"
                    disabled={headers.length === 1}
                    aria-label={t('tools.httpTester.removeHeader', { index: index + 1 })}
                  >
                    <span className="material-symbols-outlined text-sm" aria-hidden="true">close</span>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* 请求体 */}
          {showBody && (
            <div className="nb-card-static p-4 flex-1 flex flex-col min-h-0">
              <div className="flex items-center justify-between gap-2 mb-2">
                <h3 className="text-sm font-semibold nb-text">{t('tools.httpTester.body')}</h3>
                <select aria-label={t('tools.httpTester.bodyMode')} value={bodyMode} onChange={(e) => setBodyMode(e.target.value as HttpBodyMode)} className="nb-input text-xs py-1">
                  <option value="json">JSON</option>
                  <option value="raw">{t('tools.httpTester.rawBody')}</option>
                  <option value="formData">Form Data</option>
                </select>
              </div>
              {bodyMode === 'formData' ? (
                <div className="flex-1 overflow-auto space-y-2">
                  {formRows.map((row, index) => (
                    <div
                      key={index}
                      className={HTTP_TESTER_LAYOUT_CLASSES.entryRow}
                      data-testid="http-tester-form-row"
                    >
                      <input
                        type="checkbox"
                        aria-label={t('tools.httpTester.toggleFormField', { index: index + 1 })}
                        checked={row.enabled}
                        onChange={(e) => updateFormRow(index, 'enabled', e.target.checked)}
                        className="w-4 h-4 rounded nb-border accent-[var(--nb-accent-yellow)]"
                      />
                      <input value={row.key} onChange={(e) => updateFormRow(index, 'key', e.target.value)} placeholder={t('tools.httpTester.formKey')} className={HTTP_TESTER_LAYOUT_CLASSES.entryInput} />
                      <input value={row.value} onChange={(e) => updateFormRow(index, 'value', e.target.value)} placeholder={t('tools.httpTester.formValue')} className={HTTP_TESTER_LAYOUT_CLASSES.entryInput} />
                      <button type="button" onClick={() => removeFormRow(index)} className="nb-btn nb-btn-ghost min-h-11 min-w-11 p-1 shrink-0" disabled={formRows.length === 1} aria-label={t('tools.httpTester.removeFormField', { index: index + 1 })}>
                        <span className="material-symbols-outlined text-sm" aria-hidden="true">close</span>
                      </button>
                    </div>
                  ))}
                  <button type="button" onClick={addFormRow} className="nb-btn nb-btn-secondary text-xs px-3 py-1">
                    <span className="material-symbols-outlined text-sm" aria-hidden="true">add</span>
                    {t('tools.httpTester.addFormRow')}
                  </button>
                </div>
              ) : (
                <>
                  <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder={t('tools.httpTester.bodyPlaceholder')}
                    className={`nb-input flex-1 font-mono text-sm resize-none ${
                      bodyError ? 'border-[color:var(--nb-accent-pink)]' : ''
                    }`}
                  />
                  {bodyError && (
                    <p className="text-xs mt-1" style={{ color: 'var(--color-error-text)' }}>
                      {bodyError}
                    </p>
                  )}
                </>
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
                  <p className="text-sm" style={{ color: 'var(--color-error-text)' }}>
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
        <div className={HTTP_TESTER_LAYOUT_CLASSES.historyPanel} data-testid="http-tester-history-panel">
          <div className="flex items-center justify-between mb-3 flex-shrink-0">
            <h3 className="text-sm font-semibold nb-text">{t('tools.httpTester.history')}</h3>
            {history.length > 0 && (
              <button type="button" onClick={clearAll} className="nb-btn nb-btn-ghost text-xs py-1 px-2">
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
                  className="nb-card-static relative overflow-hidden"
                >
                  <button
                    type="button"
                    className="block w-full p-3 pr-14 text-left hover:bg-[color:var(--nb-bg-hover)] transition-colors"
                    onClick={() => handleRestore(entry.id)}
                    aria-label={t('tools.httpTester.restoreHistory', { method: entry.request.method, url: entry.request.url })}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium nb-text">{entry.request.method}</span>
                      {entry.response && (
                        <span className={`nb-badge text-xs ${getStatusColorClass(entry.response.status)}`}>
                          {entry.response.status}
                        </span>
                      )}
                    </div>
                    <p className="text-xs nb-text-secondary truncate">{entry.request.url}</p>
                    <p className="text-xs nb-text-secondary mt-1">
                      {new Date(entry.timestamp).toLocaleString()}
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => removeEntry(entry.id)}
                    className="nb-btn nb-btn-ghost absolute right-1 top-1 min-h-11 min-w-11 p-1"
                    aria-label={t('tools.httpTester.deleteHistory', { method: entry.request.method, url: entry.request.url })}
                  >
                    <span className="material-symbols-outlined text-sm" aria-hidden="true">close</span>
                  </button>
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
