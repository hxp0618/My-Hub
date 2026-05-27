import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { YamlTomlConverterTool } from '../YamlTomlConverterTool';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => ({
      'tools.yamlTomlConverter.sourceFormat': 'From',
      'tools.yamlTomlConverter.targetFormat': 'To',
      'tools.yamlTomlConverter.indent': 'Indent',
      'tools.yamlTomlConverter.spaces': 'spaces',
      'tools.yamlTomlConverter.autoDetect': 'Auto detect',
      'tools.yamlTomlConverter.swap': 'Swap',
      'tools.yamlTomlConverter.convert': 'Convert',
      'tools.yamlTomlConverter.copy': 'Copy',
      'tools.yamlTomlConverter.clear': 'Clear',
      'tools.yamlTomlConverter.input': 'Input',
      'tools.yamlTomlConverter.output': 'Output',
      'tools.yamlTomlConverter.inputPlaceholder': 'Paste your JSON, YAML, or TOML here...',
      'tools.yamlTomlConverter.outputPlaceholder': 'Converted result will appear here...',
      'tools.yamlTomlConverter.emptyInput': 'Please enter content to convert',
      'tools.yamlTomlConverter.convertError': 'Conversion failed',
      'tools.yamlTomlConverter.line': 'Line',
    }[key] ?? key),
  }),
}));

vi.mock('../../../../../hooks/useCopyToClipboard', () => ({
  useCopyToClipboard: () => ({
    copy: vi.fn(),
  }),
}));

describe('YamlTomlConverterTool', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('shows localized conversion errors without raw parser details', () => {
    render(<YamlTomlConverterTool isExpanded onToggleExpand={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText('Paste your JSON, YAML, or TOML here...'), {
      target: { value: '{invalid json}' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Convert' }));

    expect(screen.getByText('Conversion failed')).toBeInTheDocument();
    expect(screen.queryByText(/Expected property|position \d+|Unexpected token|unterminated/i)).not.toBeInTheDocument();
  });
});
