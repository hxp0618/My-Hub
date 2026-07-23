import { useEffect, useRef } from 'react';
import { ToolId } from '../types/tools';
import type { ToolInvocation } from '../types/toolInvocation';

export interface UseToolInvocationOptions {
  invocation?: ToolInvocation | null;
  targetToolId: ToolId;
  onInvocationHandled?: (id: string) => void;
  onApply: (invocation: ToolInvocation) => void;
}

export const useToolInvocation = ({
  invocation,
  targetToolId,
  onInvocationHandled,
  onApply,
}: UseToolInvocationOptions): void => {
  const handledInvocationId = useRef<string | null>(null);

  useEffect(() => {
    if (!invocation || invocation.toolId !== targetToolId) return;
    if (handledInvocationId.current === invocation.id) return;

    handledInvocationId.current = invocation.id;
    onApply(invocation);
    onInvocationHandled?.(invocation.id);
  }, [invocation, onApply, onInvocationHandled, targetToolId]);
};
