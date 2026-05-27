import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { HTTPUrlTesterTool } from '../HTTPUrlTesterTool';

const addEntryMock = vi.fn();

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => ({
      'tools.httpTester.urlPlaceholder': 'Enter request URL...',
      'tools.httpTester.invalidUrl': 'Please enter a valid URL',
      'tools.httpTester.send': 'Send',
      'tools.httpTester.clear': 'Clear',
      'tools.httpTester.headers': 'Headers',
      'tools.httpTester.addHeader': 'Add',
      'tools.httpTester.headerKey': 'Key',
      'tools.httpTester.headerValue': 'Value',
      'tools.httpTester.body': 'Body',
      'tools.httpTester.bodyPlaceholder': 'Enter JSON request body...',
      'tools.httpTester.invalidJsonBody': 'Request body must be valid JSON',
      'tools.httpTester.response': 'Response',
      'tools.httpTester.error': 'Error',
      'tools.httpTester.networkError': 'Network request failed',
      'tools.httpTester.history': 'History',
      'tools.httpTester.clearHistory': 'Clear',
      'tools.httpTester.noHistory': 'No history yet',
      'tools.httpTester.importCurl': 'Import curl',
      'tools.httpTester.exportCurl': 'Export curl',
      'tools.httpTester.import': 'Import',
      'tools.httpTester.importCurlDescription': 'Paste a curl command',
      'tools.httpTester.curlPlaceholder': 'Paste curl command...',
    }[key] ?? key),
  }),
}));

vi.mock('../../../../../hooks/useHttpHistory', () => ({
  useHttpHistory: () => ({
    history: [],
    addEntry: addEntryMock,
    removeEntry: vi.fn(),
    clearAll: vi.fn(),
    restoreEntry: vi.fn(),
  }),
}));

describe('HTTPUrlTesterTool', () => {
  afterEach(() => {
    cleanup();
    addEntryMock.mockReset();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('shows localized JSON body validation without raw parser details', () => {
    render(<HTTPUrlTesterTool isExpanded onToggleExpand={vi.fn()} />);

    fireEvent.change(screen.getAllByRole('combobox')[0], {
      target: { value: 'POST' },
    });
    fireEvent.change(screen.getByPlaceholderText('Enter JSON request body...'), {
      target: { value: '{"name":' },
    });

    expect(screen.getByText('Request body must be valid JSON')).toBeInTheDocument();
    expect(screen.queryByText(/Unexpected|unterminated|position/i)).not.toBeInTheDocument();
  });

  it('shows localized network failures without raw fetch errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    render(<HTTPUrlTesterTool isExpanded onToggleExpand={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText('Enter request URL...'), {
      target: { value: 'https://example.com/api' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() => {
      expect(screen.getByText('Network request failed')).toBeInTheDocument();
    });
    expect(screen.queryByText(/Failed to fetch/)).not.toBeInTheDocument();
  });
});
