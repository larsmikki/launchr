type Level = 'debug' | 'info' | 'error';

const LEVELS: Record<Level, number> = { debug: 10, info: 20, error: 30 };

function resolveLevel(): Level {
  const env = (process.env.LOG_LEVEL || '').toLowerCase();
  return env in LEVELS ? (env as Level) : 'info';
}

const threshold = LEVELS[resolveLevel()];

export const log = {
  debug: (...args: unknown[]) => {
    if (threshold <= LEVELS.debug) console.log('[debug]', ...args);
  },
  info: (...args: unknown[]) => {
    if (threshold <= LEVELS.info) console.log(...args);
  },
  error: (...args: unknown[]) => {
    if (threshold <= LEVELS.error) console.error(...args);
  },
};
