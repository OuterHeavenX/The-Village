export const STARTUP_TIMEOUT_MS = 20000;

const PREFIX = '[Village Startup]';

export function logStartupStage(stage, detail = '') {
  if (detail) console.info(`${PREFIX} ${stage}`, detail);
  else console.info(`${PREFIX} ${stage}`);
}

export function logStartupFailure(stage, error) {
  console.error(`${PREFIX} ${stage} failed`, error?.message || error);
}

export function withTimeout(promise, stage, timeoutMs = STARTUP_TIMEOUT_MS) {
  let timer = 0;
  const deadline = new Promise((_, reject) => {
    timer = globalThis.setTimeout(() => {
      const error = new Error(`${stage} timed out after ${Math.ceil(timeoutMs / 1000)} seconds.`);
      error.name = 'StartupTimeoutError';
      reject(error);
    }, timeoutMs);
  });
  return Promise.race([Promise.resolve(promise), deadline]).finally(() => {
    globalThis.clearTimeout(timer);
  });
}
