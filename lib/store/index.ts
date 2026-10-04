import { isSupabaseConfigured } from "@/lib/supabase/admin";
import { MemoryStore } from "./memory";
import { SupabaseStore } from "./supabase";
import type { Store } from "./types";

export type { RoomPlayer, Store } from "./types";
export { StaleVersionError } from "./types";

export function getStore(): Store {
  const globalStore = globalThis as typeof globalThis & { __carambaStore?: Store };
  if (!globalStore.__carambaStore) {
    globalStore.__carambaStore = isSupabaseConfigured()
      ? new SupabaseStore()
      : new MemoryStore();
  }
  return globalStore.__carambaStore;
}
