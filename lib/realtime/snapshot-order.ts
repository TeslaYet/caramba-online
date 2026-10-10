export function shouldApplySnapshot(
  current: { room: { updatedAt: number }; game: { version: number } | null } | null,
  incoming: { room: { updatedAt: number }; game: { version: number } | null },
): boolean {
  if (!current?.game) {
    return true;
  }
  if (!incoming.game) {
    return incoming.room.updatedAt >= current.room.updatedAt;
  }
  return incoming.game.version >= current.game.version;
}
