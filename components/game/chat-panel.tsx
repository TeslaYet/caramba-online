"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { ChatMessage } from "@/lib/game/types";

export function ChatPanel({
  messages,
  onSend,
  compact = false,
}: {
  messages: ChatMessage[];
  onSend: (text: string) => Promise<unknown> | void;
  compact?: boolean;
}) {
  const [text, setText] = useState("");

  return (
    <div className="flex h-full min-h-[220px] flex-col rounded-3xl border border-[var(--line)] bg-[var(--panel)]">
      <div className="border-b border-[var(--line)] px-4 py-3 font-display text-lg">
        Table chat
      </div>
      <div className={`flex-1 space-y-2 overflow-y-auto px-4 py-3 ${compact ? "max-h-48" : "max-h-72"}`}>
        {messages.length === 0 ? (
          <p className="text-sm text-cream/60">Say hello while you wait.</p>
        ) : (
          messages.map((message) => (
            <div key={message.id} className="text-sm">
              <span className="font-semibold text-gold">{message.nickname}</span>
              <span className="text-cream/80"> {message.text}</span>
            </div>
          ))
        )}
      </div>
      <form
        className="flex gap-2 border-t border-[var(--line)] p-3"
        onSubmit={async (event) => {
          event.preventDefault();
          if (!text.trim()) {
            return;
          }
          await onSend(text.trim());
          setText("");
        }}
      >
        <input
          value={text}
          onChange={(event) => setText(event.target.value)}
          maxLength={240}
          placeholder="Message friends"
          className="focus-ring min-w-0 flex-1 rounded-full border border-[var(--line)] bg-black/20 px-3 py-2 text-sm"
        />
        <Button type="submit" variant="gold">
          Send
        </Button>
      </form>
    </div>
  );
}
