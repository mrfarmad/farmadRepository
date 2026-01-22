import pino from 'pino';
import { SystemConfig } from '../../types/index.js';

// Sensitive patterns to redact from logs (prevent token/password leaks)
const SENSITIVE_PATTERNS = [
  /bot\d+:[A-Za-z0-9_-]+/gi, // Telegram bot tokens
  /Bearer\s+[A-Za-z0-9_-]+/gi, // Bearer tokens
  /password["\s:=]+[^\s"]+/gi, // Passwords
  /api[_-]?key["\s:=]+[^\s"]+/gi, // API keys
  /secret["\s:=]+[^\s"]+/gi, // Secrets
  /token["\s:=]+[^\s"]+/gi, // Generic tokens
];

// Custom redaction function
function redactSensitive(obj: unknown): unknown {
  if (typeof obj === 'string') {
    let redacted = obj;
    SENSITIVE_PATTERNS.forEach((pattern) => {
      redacted = redacted.replace(pattern, '[REDACTED]');
    });
    return redacted;
  }

  if (Array.isArray(obj)) {
    return obj.map(redactSensitive);
  }

  if (obj && typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      // Redact sensitive keys
      if (
        ['password', 'token', 'secret', 'api_key', 'apiKey', 'botToken'].includes(key)
      ) {
        result[key] = '[REDACTED]';
      } else {
        result[key] = redactSensitive(value);
      }
    }
    return result;
  }

  return obj;
}

// Custom serializer for errors
const serializers = {
  err: pino.stdSerializers.err,
  req: pino.stdSerializers.req,
  res: pino.stdSerializers.res,
};

// Create logger instance
export function createLogger(config?: SystemConfig, name?: string) {
  const logLevel = config?.system?.log_level || process.env.LOG_LEVEL || 'info';
  const isDevelopment = config?.system?.environment === 'development' || process.env.NODE_ENV === 'development';

  const logger = pino({
    name: name || 'edge-gateway',
    level: logLevel,
    serializers,
    formatters: {
      level: (label) => ({ level: label }),
    },
    hooks: {
      logMethod(inputArgs, method) {
        // Redact sensitive data from all log arguments
        const redactedArgs = inputArgs.map(redactSensitive) as Parameters<typeof method>;
        return method.apply(this, redactedArgs);
      },
    },
    transport: isDevelopment
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
  });

  return logger;
}

// Default logger instance
export const logger = createLogger();

// Child logger factory
export function createChildLogger(name: string, config?: SystemConfig) {
  const baseLogger = createLogger(config);
  return baseLogger.child({ component: name });
}

export default logger;
