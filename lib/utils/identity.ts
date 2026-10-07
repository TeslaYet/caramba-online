import { GAME_RULES } from "@/lib/game/rules";

const ROOM_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function normalizeNickname(value: string): string {
  return value
    .replace(/[\u0000-\u001F\u007F\u200B-\u200F\u202A-\u202E\u2066-\u2069]/g, "")
    .trim()
    .replace(/\s+/g, " ");
}

export function isValidNickname(value: string): boolean {
  const nickname = normalizeNickname(value);
  return (
    nickname.length >= GAME_RULES.NICKNAME_MIN &&
    nickname.length <= GAME_RULES.NICKNAME_MAX
  );
}

export function generateRoomCode(randomInt: (max: number) => number): string {
  return Array.from({ length: GAME_RULES.ROOM_CODE_LENGTH }, () => {
    const symbol = ROOM_ALPHABET[randomInt(ROOM_ALPHABET.length)];
    return symbol ?? "X";
  }).join("");
}

export function normalizeRoomCode(value: string): string {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}
