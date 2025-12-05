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
  private format(level: LogLevel, ...args: any[]): any[] {
    const timestamp = new Date().toISOString().split('T')[1].slice(0, -1);
    return [`${this.prefix} [${level}] ${timestamp}`, ...args];
  }

  /**
   * Debug level logging
   */
  debug(...args: any[]): void {
    if (isDev) {
      console.log(...this.format(LogLevel.DEBUG, ...args));
    }
  }

  /**
   * Info level logging
   */
  info(...args: any[]): void {
    if (isDev) {
      console.info(...this.format(LogLevel.INFO, ...args));
    }
  }

  /**
   * Warning level logging
   */
  warn(...args: any[]): void {
    if (isDev) {
      console.warn(...this.format(LogLevel.WARN, ...args));
    }
  }

  /**
   * Error level logging (always logs even in production)
   */
  error(...args: any[]): void {
    console.error(...this.format(LogLevel.ERROR, ...args));
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
  table(data: any): void {
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
  debug: (...args: any[]) => logger.debug(...args),
  info: (...args: any[]) => logger.info(...args),
  warn: (...args: any[]) => logger.warn(...args),
  error: (...args: any[]) => logger.error(...args),
  group: (label: string) => logger.group(label),
  groupEnd: () => logger.groupEnd(),
  table: (data: any) => logger.table(data),
};
