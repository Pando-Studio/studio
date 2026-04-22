/**
 * Structured Logger for Studio
 *
 * Provides structured JSON logging for production monitoring.
 * Dev mode uses pretty console output.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: unknown;
  studioId?: string;
  sourceId?: string;
  widgetId?: string;
  runId?: string;
  userId?: string;
  duration?: number;
  error?: Error | string;
}

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  service: 'studio';
  context?: Record<string, unknown>;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  private logLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    return levels.indexOf(level) >= levels.indexOf(this.logLevel);
  }

  private log(level: LogLevel, message: string, context?: LogContext) {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      service: 'studio',
      context: context
        ? {
            ...context,
            error: context.error instanceof Error ? context.error.message : context.error,
          }
        : undefined,
    };

    if (this.isDevelopment) {
      const prefix = { debug: '[DBG]', info: '[INF]', warn: '[WRN]', error: '[ERR]' }[level];
      const method = level === 'debug' ? 'log' : level;
      console[method](`${prefix} ${message}`, entry.context ?? '');
      return;
    }

    console.log(JSON.stringify(entry));
  }

  debug(message: string, context?: LogContext) {
    this.log('debug', message, context);
  }

  info(message: string, context?: LogContext) {
    this.log('info', message, context);
  }

  warn(message: string, context?: LogContext) {
    this.log('warn', message, context);
  }

  error(message: string, context?: LogContext) {
    this.log('error', message, context);
  }

  /** Log a generation workflow step */
  generation(
    action: string,
    context: LogContext & { type?: string },
  ) {
    this.info(`Generation: ${action}`, context);
  }

  /** Log a source processing step */
  source(action: string, context: LogContext) {
    this.info(`Source: ${action}`, context);
  }

  /** Log a chat interaction */
  chat(action: string, context: LogContext & { mode?: string }) {
    this.info(`Chat: ${action}`, context);
  }

  /** Log API request performance */
  api(method: string, path: string, status: number, duration: number, context?: LogContext) {
    const level = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info';
    this.log(level, `${method} ${path} ${status} (${duration}ms)`, {
      ...context,
      method,
      path,
      status,
      duration,
    });
  }
}

export const logger = new Logger();
