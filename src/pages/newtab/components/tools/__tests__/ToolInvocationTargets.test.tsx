import React from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ToolId } from '../../../../../types/tools';
import type { ToolInvocation } from '../../../../../types/toolInvocation';
import { HTMLEntityTool } from '../HTMLEntityTool';
import { JWTDecoderTool } from '../JWTDecoderTool';
import { URLCodecTool } from '../URLCodecTool';
import { ColorConverterTool } from '../ColorConverterTool';
import { CronBuilderTool } from '../CronBuilderTool';
import { HTTPUrlTesterTool } from '../HTTPUrlTesterTool';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      if (key === 'tools.common.batchStats') {
        return `${options?.success ?? 0}/${options?.total ?? 0}`;
      }
      return key;
    },
  }),
}));

vi.mock('../../../../../hooks/useCopyToClipboard', () => ({
  useCopyToClipboard: () => ({
    copy: vi.fn(),
  }),
}));

const jwtPart = (value: Record<string, unknown>) => (
  Buffer.from(JSON.stringify(value), 'utf8').toString('base64url')
);

describe('tool invocation target tools', () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('prefills the URL codec in decode mode', async () => {
    const onInvocationHandled = vi.fn();
    const invocation: ToolInvocation = {
      id: 'url-invocation',
      toolId: ToolId.URL_CODEC,
      input: '%E4%B8%AD%E6%96%87',
      mode: 'decode',
      source: 'home-search',
    };

    render(
      <URLCodecTool
        isExpanded
        onToggleExpand={vi.fn()}
        invocation={invocation}
        onInvocationHandled={onInvocationHandled}
      />,
    );

    expect(screen.getByPlaceholderText('tools.urlCodec.encodedPlaceholder')).toHaveValue('%E4%B8%AD%E6%96%87');
    await waitFor(() => {
      expect(screen.getByDisplayValue('中文')).toBeInTheDocument();
    });
    expect(onInvocationHandled).toHaveBeenCalledWith('url-invocation');
  });

  it('prefills the HTML entity tool in decode mode', async () => {
    const onInvocationHandled = vi.fn();
    const invocation: ToolInvocation = {
      id: 'html-invocation',
      toolId: ToolId.HTML_ENTITY,
      input: 'Tom &amp; Jerry',
      mode: 'decode',
      source: 'smart-router',
    };

    render(
      <HTMLEntityTool
        isExpanded
        onToggleExpand={vi.fn()}
        invocation={invocation}
        onInvocationHandled={onInvocationHandled}
      />,
    );

    expect(screen.getByPlaceholderText('tools.htmlEntity.inputPlaceholder')).toHaveValue('Tom &amp; Jerry');
    await waitFor(() => {
      expect(screen.getByText('Tom & Jerry')).toBeInTheDocument();
    });
    expect(onInvocationHandled).toHaveBeenCalledWith('html-invocation');
  });

  it('prefills the JWT decoder input and decodes the payload', async () => {
    const onInvocationHandled = vi.fn();
    const token = [
      jwtPart({ alg: 'HS256', typ: 'JWT' }),
      jwtPart({ sub: '123' }),
      'signature',
    ].join('.');
    const invocation: ToolInvocation = {
      id: 'jwt-invocation',
      toolId: ToolId.JWT_DECODER,
      input: token,
      mode: 'decode',
      source: 'home-search',
    };

    render(
      <JWTDecoderTool
        isExpanded
        onToggleExpand={vi.fn()}
        invocation={invocation}
        onInvocationHandled={onInvocationHandled}
      />,
    );

    expect(screen.getByPlaceholderText('tools.jwtDecoder.inputPlaceholder')).toHaveValue(token);
    await waitFor(() => {
      expect(screen.getByText(/"sub": "123"/)).toBeInTheDocument();
    });
    expect(onInvocationHandled).toHaveBeenCalledWith('jwt-invocation');
  });

  it('prefills the color converter from a detected HEX color', async () => {
    const onInvocationHandled = vi.fn();
    const invocation: ToolInvocation = {
      id: 'color-invocation',
      toolId: ToolId.COLOR_CONVERTER,
      input: '#ff0000',
      mode: 'color',
      source: 'smart-router',
    };

    render(
      <ColorConverterTool
        isExpanded
        onToggleExpand={vi.fn()}
        invocation={invocation}
        onInvocationHandled={onInvocationHandled}
      />,
    );

    await waitFor(() => expect(screen.getByDisplayValue('255, 0, 0')).toBeInTheDocument());
    expect(onInvocationHandled).toHaveBeenCalledWith('color-invocation');
  });

  it('prefills the Cron builder with the detected expression', async () => {
    const onInvocationHandled = vi.fn();
    const invocation: ToolInvocation = {
      id: 'cron-invocation',
      toolId: ToolId.CRON_BUILDER,
      input: '0 9 * * 1',
      mode: 'cron',
      source: 'smart-router',
    };

    render(
      <CronBuilderTool
        isExpanded
        onToggleExpand={vi.fn()}
        invocation={invocation}
        onInvocationHandled={onInvocationHandled}
      />,
    );

    expect(screen.getByPlaceholderText('* * * * *')).toHaveValue('0 9 * * 1');
    expect(onInvocationHandled).toHaveBeenCalledWith('cron-invocation');
  });

  it('imports a detected cURL command into the HTTP tester', async () => {
    const onInvocationHandled = vi.fn();
    const invocation: ToolInvocation = {
      id: 'curl-invocation',
      toolId: ToolId.HTTP_URL_TESTER,
      input: "curl -X POST 'https://api.example.com/items' -H 'Content-Type: application/json' -d '{\"name\":\"My Hub\"}'",
      mode: 'curl',
      source: 'smart-router',
    };

    render(
      <HTTPUrlTesterTool
        isExpanded
        onToggleExpand={vi.fn()}
        invocation={invocation}
        onInvocationHandled={onInvocationHandled}
      />,
    );

    expect(screen.getByPlaceholderText('tools.httpTester.urlPlaceholder')).toHaveValue('https://api.example.com/items');
    expect(screen.getByDisplayValue('POST')).toBeInTheDocument();
    expect(onInvocationHandled).toHaveBeenCalledWith('curl-invocation');
  });
});
