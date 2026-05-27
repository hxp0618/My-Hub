/**
 * Logger utility for conditional logging
 * Logs are only output in development environment
 */

const isDev = import.meta.env.DEV;

/**
 * Log levels
 */
export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

/**
 * Console logger that only outputs in development environment
 */
class Logger {
  private prefix: string;

  constructor(prefix: string = '[Extension]') {
    this.prefix = prefix;
  }

  /**
   * Format log message with timestamp and prefix
   */
  private format(level: LogLevel, ...args: unknown[]): unknown[] {
    const timestamp = new Date().toISOString().split('T')[1].slice(0, -1);
    return [`${this.prefix} [${level}] ${timestamp}`, ...args];
  }

  /**
   * Debug level logging
   */
  debug(...args: unknown[]): void {
    if (isDev) {
      console.debug(...this.format(LogLevel.DEBUG, ...args));
    }
  }

  /**
   * Info level logging
   */
  info(...args: unknown[]): void {
    if (isDev) {
      console.info(...this.format(LogLevel.INFO, ...args));
    }
  }

  /**
   * Warning level logging
   */
  warn(...args: unknown[]): void {
    if (isDev) {
      console.warn(...this.format(LogLevel.WARN, ...args));
    }
  }

  /**
   * Error level logging
   */
  error(...args: unknown[]): void {
    if (isDev) {
      console.error(...this.format(LogLevel.ERROR, ...args));
    }
  }

  /**
   * Group logging (only in dev)
   */
  group(label: string): void {
    if (isDev) {
      console.group(`${this.prefix} ${label}`);
    }
  }

  /**
   * End group logging
   */
  groupEnd(): void {
    if (isDev) {
      console.groupEnd();
    }
  }

  /**
   * Table logging (only in dev)
   */
  table(data: unknown): void {
    if (isDev) {
      console.table(data);
    }
  }
}

/**
 * Default logger instance
 */
export const logger = new Logger('[Extension]');

/**
 * Create a logger with custom prefix
 */
export const createLogger = (prefix: string): Logger => {
  return new Logger(prefix);
};

/**
 * Quick access functions using default logger
 */
export const log = {
  debug: (...args: unknown[]) => logger.debug(...args),
  info: (...args: unknown[]) => logger.info(...args),
  warn: (...args: unknown[]) => logger.warn(...args),
  error: (...args: unknown[]) => logger.error(...args),
  group: (label: string) => logger.group(label),
  groupEnd: () => logger.groupEnd(),
  table: (data: unknown) => logger.table(data),
};
