import pino from 'pino';

const isDev = !process.env.XENESIS_PACKAGED && process.env.NODE_ENV !== 'production';

export const logger = pino({
  level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
  transport: isDev
    ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss.l', ignore: 'pid,hostname' } }
    : undefined,
});

export function createChildLogger(name: string) {
  return logger.child({ module: name });
}
