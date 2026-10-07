"use client";

import { useState } from "react";
import { BrandMark } from "@/components/brand/brand-mark";
import { Button } from "@/components/ui/button";
import { createBrowserSupabase } from "@/lib/supabase/browser";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const supabase = createBrowserSupabase();

  return (
    <main className="safe-screen mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center py-8">
      <BrandMark className="mb-4 self-center" />
      <h1 className="font-display text-5xl">New password</h1>
      <form
        className="mt-6 space-y-4"
        onSubmit={async (event) => {
          event.preventDefault();
          if (!supabase) {
            return;
          }
          const { error: updateError } = await supabase.auth.updateUser({ password });
          if (updateError) {
            setError(updateError.message);
            return;
          }
          setNotice("Password updated. You can log in with it now.");
        }}
      >
        <label className="block text-sm">
          Password
          <input
            required
            type="password"
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="focus-ring mt-2 w-full rounded-2xl border border-[var(--line)] bg-black/20 px-4 py-3"
          />
        </label>
        {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
        {notice && <p className="text-sm text-gold">{notice}</p>}
        <Button type="submit" className="w-full">
          Save password
        </Button>
      </form>
    </main>
  );
}
