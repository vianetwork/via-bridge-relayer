import winston, { format, transports, Logform } from 'winston';
import { existsSync, mkdirSync } from 'fs';

const { NODE_ENV, LOG_LEVEL } = process.env;

let defaultLogLevel = 'debug';

// Custom JSON serializer that handles BigInt values
const serializeWithBigInt = (obj: any): string => {
  return JSON.stringify(obj, (key, value) => {
    if (typeof value === 'bigint') {
      return value.toString() + 'n';
    }
    return value;
  });
};

const loggerFormatters: Logform.Format[] = [
  NODE_ENV === 'production'
    ? format.timestamp()
    : format.timestamp({
        format: 'DD/MM/YYYY HH:mm:ss.SSS',
      }),
  format.ms(),
  format.printf(({ timestamp, level, message, ms, stack, ...meta }) => {
    const appName = 'Via-Relayer';
    let log = `${timestamp} [${appName}] ${level.toUpperCase()}${ms ? ` ${ms}` : ''}: ${message}`;

    // Add stack trace for errors
    if (stack) {
      log += `\n${stack}`;
    }

    // Add any additional metadata
    if (Object.keys(meta).length > 0) {
      log += ` ${serializeWithBigInt(meta)}`;
    }

    return log;
  }),
];

if (NODE_ENV === 'production') {
  defaultLogLevel = 'info';
  loggerFormatters.push(format.json());
}

// Create logs directory if it doesn't exist
if (!existsSync('logs')) {
  mkdirSync('logs');
}

const logger = winston.createLogger({
  level: LOG_LEVEL || defaultLogLevel,
  format: format.combine(...loggerFormatters),
  transports: [
    new transports.Console({
      format:
        NODE_ENV === 'production'
          ? format.combine(...loggerFormatters)
          : format.combine(format.colorize(), ...loggerFormatters),
    }),

    // Only add file transports in production or when explicitly enabled
    ...(NODE_ENV === 'production' || process.env.ENABLE_FILE_LOGGING === 'true'
      ? [
          new transports.File({
            filename: 'logs/error.log',
            level: 'error',
            format: format.combine(
              format.timestamp(),
              format.errors({ stack: true }),
              format.json()
            ),
          }),

          new transports.File({
            filename: 'logs/combined.log',
            format: format.combine(
              format.timestamp(),
              format.errors({ stack: true }),
              format.json()
            ),
          }),
        ]
      : []),
  ],
});

// Export logger instance
export default logger;

// Export convenience methods
export const log = {
  error: (message: string, meta?: any) => logger.error(message, meta),
  warn: (message: string, meta?: any) => logger.warn(message, meta),
  info: (message: string, meta?: any) => logger.info(message, meta),
  verbose: (message: string, meta?: any) => logger.verbose(message, meta),
  debug: (message: string, meta?: any) => logger.debug(message, meta),
  silly: (message: string, meta?: any) => logger.silly(message, meta),
};
