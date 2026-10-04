type Queue = Promise<unknown>;

function getQueues(): Map<string, Queue> {
  const globalStore = globalThis as typeof globalThis & {
    __carambaLocks?: Map<string, Queue>;
  };
  if (!globalStore.__carambaLocks) {
    globalStore.__carambaLocks = new Map();
  }
  return globalStore.__carambaLocks;
}

export async function withRoomLock<T>(roomKey: string, task: () => Promise<T>): Promise<T> {
  const queues = getQueues();
  const previous = queues.get(roomKey) ?? Promise.resolve();
  let release: () => void = () => undefined;
  const current = new Promise<void>((resolve) => {
    release = resolve;
  });
  const next = previous.then(() => current);
  queues.set(roomKey, next);

  await previous.catch(() => undefined);
  try {
    return await task();
  } finally {
    release();
    if (queues.get(roomKey) === next) {
      queues.delete(roomKey);
    }
  }
}
