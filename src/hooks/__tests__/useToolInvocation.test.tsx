import React, { useCallback, useState } from 'react';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ToolId } from '../../types/tools';
import type { ToolInvocation } from '../../types/toolInvocation';
import { useToolInvocation } from '../useToolInvocation';

const Harness: React.FC<{
  invocation: ToolInvocation | null;
  onHandled: (id: string) => void;
}> = ({ invocation, onHandled }) => {
  const [value, setValue] = useState('');

  useToolInvocation({
    invocation,
    targetToolId: ToolId.JSON_FORMATTER,
    onInvocationHandled: onHandled,
    onApply: useCallback((nextInvocation) => {
      setValue(nextInvocation.input);
    }, []),
  });

  return <output aria-label="value">{value}</output>;
};

describe('useToolInvocation', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('applies a matching invocation once and marks it handled', () => {
    const onHandled = vi.fn();
    const invocation: ToolInvocation = {
      id: 'invocation-1',
      toolId: ToolId.JSON_FORMATTER,
      input: '{"name":"My Hub"}',
      mode: 'format',
      source: 'home-search',
    };

    const { rerender } = render(<Harness invocation={invocation} onHandled={onHandled} />);

    expect(screen.getByText('{"name":"My Hub"}')).toBeInTheDocument();
    expect(onHandled).toHaveBeenCalledTimes(1);
    expect(onHandled).toHaveBeenCalledWith('invocation-1');

    rerender(<Harness invocation={invocation} onHandled={onHandled} />);

    expect(onHandled).toHaveBeenCalledTimes(1);
  });

  it('ignores invocations for other tools and applies a later matching one', () => {
    const onHandled = vi.fn();
    const otherInvocation: ToolInvocation = {
      id: 'invocation-1',
      toolId: ToolId.URL_CODEC,
      input: '%E4%B8%AD%E6%96%87',
      mode: 'decode',
      source: 'home-search',
    };
    const matchingInvocation: ToolInvocation = {
      id: 'invocation-2',
      toolId: ToolId.JSON_FORMATTER,
      input: '{"enabled":true}',
      mode: 'format',
      source: 'smart-router',
    };

    const { rerender } = render(<Harness invocation={otherInvocation} onHandled={onHandled} />);
    expect(screen.getByLabelText('value')).toHaveTextContent('');
    expect(onHandled).not.toHaveBeenCalled();

    act(() => {
      rerender(<Harness invocation={matchingInvocation} onHandled={onHandled} />);
    });

    expect(screen.getByText('{"enabled":true}')).toBeInTheDocument();
    expect(onHandled).toHaveBeenCalledWith('invocation-2');
  });
});
