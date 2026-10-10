export function shouldUpdatePresence(
  current: { connected: boolean; updatedAt: number },
  connected: boolean,
  notBefore: number,
): boolean {
  if (!connected && current.updatedAt > notBefore) {
    return false;
  }
  return current.connected !== connected;
}

type Slot = {
  count: number;
  timer: ReturnType<typeof setTimeout> | null;
};

const slots = new Map<string, Slot>();

export function openPresence(
  code: string,
  playerId: string,
  apply: (connected: boolean, notBefore: number) => void,
): () => void {
  const key = `${code.toUpperCase()}:${playerId}`;
  const slot = slots.get(key) ?? { count: 0, timer: null };
  if (slot.timer) {
    clearTimeout(slot.timer);
    slot.timer = null;
  }
  const opened = slot.count === 0;
  slot.count += 1;
  slots.set(key, slot);
  if (opened) {
    apply(true, Date.now());
  }

  return () => {
    const current = slots.get(key);
    if (!current) {
      return;
    }
    current.count = Math.max(0, current.count - 1);
    if (current.count > 0) {
      return;
    }
    const scheduledAt = Date.now();
    current.timer = setTimeout(() => {
      const latest = slots.get(key);
      if (!latest || latest.count > 0) {
        return;
      }
      slots.delete(key);
      apply(false, scheduledAt);
    }, 5000);
  };
}

export function resetPresenceForTests() {
  for (const slot of slots.values()) {
    if (slot.timer) {
      clearTimeout(slot.timer);
    }
  }
  slots.clear();
}
