import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  HTTP_TESTER_LAYOUT_CLASSES,
  HTTPUrlTesterTool,
} from '../HTTPUrlTesterTool';

const addEntryMock = vi.fn();

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => ({
      'tools.httpTester.urlPlaceholder': 'Enter request URL...',
      'tools.httpTester.invalidUrl': 'Please enter a valid URL',
      'tools.httpTester.send': 'Send',
      'tools.httpTester.clear': 'Clear',
      'tools.httpTester.variables': 'Variables',
      'tools.httpTester.addVariable': 'Add',
      'tools.httpTester.variableKey': 'Name',
      'tools.httpTester.variableValue': 'Value',
      'tools.httpTester.variablesHint': 'Use placeholders like {{baseUrl}}.',
      'tools.httpTester.auth': 'Auth',
      'tools.httpTester.authNone': 'No auth',
      'tools.httpTester.username': 'Username',
      'tools.httpTester.password': 'Password',
      'tools.httpTester.headers': 'Headers',
      'tools.httpTester.addHeader': 'Add',
      'tools.httpTester.headerKey': 'Key',
      'tools.httpTester.headerValue': 'Value',
      'tools.httpTester.body': 'Body',
      'tools.httpTester.bodyPlaceholder': 'Enter JSON request body...',
      'tools.httpTester.rawBody': 'Raw',
      'tools.httpTester.formKey': 'Key',
      'tools.httpTester.formValue': 'Value',
      'tools.httpTester.addFormRow': 'Add',
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

const expectClassList = (element: HTMLElement, className: string) => {
  className.split(/\s+/).forEach((classToken) => {
    expect(element).toHaveClass(classToken);
  });
};

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

  it('uses responsive grids for request panels and editable rows', () => {
    render(<HTTPUrlTesterTool isExpanded onToggleExpand={vi.fn()} />);

    const shell = screen.getByTestId('http-tester-shell');
    const requestBar = screen.getByTestId('http-tester-request-bar');
    const configGrid = screen.getByTestId('http-tester-config-grid');
    const variableRow = screen.getByTestId('http-tester-variable-row');
    const headerRow = screen.getByTestId('http-tester-header-row');
    const historyPanel = screen.getByTestId('http-tester-history-panel');

    expectClassList(shell, HTTP_TESTER_LAYOUT_CLASSES.shell);
    expectClassList(requestBar, HTTP_TESTER_LAYOUT_CLASSES.requestBar);
    expectClassList(configGrid, HTTP_TESTER_LAYOUT_CLASSES.configGrid);
    expectClassList(variableRow, HTTP_TESTER_LAYOUT_CLASSES.entryRow);
    expectClassList(headerRow, HTTP_TESTER_LAYOUT_CLASSES.entryRow);
    expectClassList(historyPanel, HTTP_TESTER_LAYOUT_CLASSES.historyPanel);

    expect(shell).not.toHaveClass('h-full');
    expect(configGrid).not.toHaveClass('xl:grid-cols-2');
    expect(historyPanel).not.toHaveClass('w-72');

    fireEvent.change(screen.getAllByRole('combobox')[0], {
      target: { value: 'POST' },
    });
    fireEvent.change(screen.getByDisplayValue('JSON'), {
      target: { value: 'formData' },
    });

    expectClassList(screen.getByTestId('http-tester-form-row'), HTTP_TESTER_LAYOUT_CLASSES.entryRow);
  });
});
