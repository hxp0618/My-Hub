import React, { Component, ErrorInfo, ReactNode } from 'react';
import { withTranslation, WithTranslation } from 'react-i18next';
import { createLogger } from '../utils/logger';

const logger = createLogger('[ErrorBoundary]');

interface ErrorBoundaryProps extends WithTranslation {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * ErrorBoundary component to catch and handle React errors
 * Prevents the entire app from crashing when a component error occurs
 */
class ErrorBoundaryComponent extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error to console in development
    logger.error('Component error caught:', error);
    logger.error('Error info:', errorInfo);

    // Update state with error info
    this.setState({
      errorInfo,
    });

    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // In production, you might want to send error to an error reporting service
    // Example: Sentry.captureException(error, { extra: errorInfo });
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render(): ReactNode {
    const { t } = this.props;

    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div className="flex flex-col items-center justify-center min-h-screen p-8 nb-bg nb-text">
          <div className="nb-card-static max-w-2xl w-full p-8">
            <div className="flex items-center mb-6">
              <span className="material-symbols-outlined text-[color:var(--nb-accent-pink)] text-4xl mr-4">
                error
              </span>
              <h1 className="text-2xl font-bold">{t('errorBoundary.title')}</h1>
            </div>

            <div className="mb-6">
              <p className="nb-text-secondary mb-4">
                {t('errorBoundary.description')}
              </p>

              {this.state.error && (
                <details className="mb-4">
                  <summary className="cursor-pointer text-sm font-semibold mb-2 hover:text-accent">
                    {t('errorBoundary.details')}
                  </summary>
                  <div className="bg-error-light border border-error rounded p-4 overflow-auto">
                    <p className="text-sm font-mono text-error mb-2">
                      {this.state.error.toString()}
                    </p>
                    {this.state.errorInfo?.componentStack && (
                      <pre className="text-xs text-error overflow-auto">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    )}
                  </div>
                </details>
              )}
            </div>

            <div className="flex gap-4">
              <button
                onClick={this.handleReset}
                className="px-6 py-2 bg-black dark:bg-white text-white dark:text-black rounded-full hover:bg-gray-800 dark:hover:bg-gray-200 transition"
              >
                {t('errorBoundary.tryAgain')}
              </button>
              <button
                onClick={() => window.location.reload()}
                className="nb-btn nb-btn-secondary px-6 py-2"
              >
                {t('errorBoundary.reload')}
              </button>
            </div>

            <div className="mt-6 pt-6 nb-border-t">
              <p className="text-sm nb-text-secondary">
                {t('errorBoundary.tipsTitle')}
              </p>
              <ul className="list-disc list-inside text-sm nb-text-secondary mt-2 space-y-1">
                <li>{t('errorBoundary.tipClearCache')}</li>
                <li>{t('errorBoundary.tipRestart')}</li>
                <li>{t('errorBoundary.tipConsole')}</li>
              </ul>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Higher-order component to wrap any component with ErrorBoundary
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
): React.FC<P> {
  return function WithErrorBoundaryComponent(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}

export const ErrorBoundary = withTranslation()(ErrorBoundaryComponent);
