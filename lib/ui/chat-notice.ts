export interface ChatNoticeMessage {
  playerId: string;
  timestamp: number;
  nickname?: string;
  text?: string;
}

export function unreadCount(
  messages: ChatNoticeMessage[],
  selfId: string | null,
  readThrough: number,
): number {
  return messages.filter(
    (message) => message.playerId !== selfId && message.timestamp > readThrough,
  ).length;
}

export function latestOtherMessage(
  messages: ChatNoticeMessage[],
  selfId: string | null,
): ChatNoticeMessage | null {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message && message.playerId !== selfId) {
      return message;
    }
  }
  return null;
}
