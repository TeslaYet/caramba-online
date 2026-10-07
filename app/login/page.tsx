"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BrandMark } from "@/components/brand/brand-mark";
import { Button } from "@/components/ui/button";
import { createBrowserSupabase } from "@/lib/supabase/browser";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const supabase = createBrowserSupabase();

  return (
    <main className="safe-screen mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center py-8">
      <BrandMark className="mb-4 self-center" />
      <h1 className="font-display text-5xl">Log in</h1>
      <p className="mt-2 text-sm text-cream/70">Private games still work without an account.</p>
      {!supabase && <p className="mt-4 text-sm text-[var(--danger)]">Accounts need Supabase to be configured.</p>}
      <form
        className="mt-6 space-y-4"
        onSubmit={async (event) => {
          event.preventDefault();
          if (!supabase) {
            return;
          }
          setBusy(true);
          setError(null);
          const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
          setBusy(false);
          if (signInError) {
            setError(signInError.message);
            return;
          }
          router.push("/");
          router.refresh();
        }}
      >
        <label className="block text-sm">
          Email
          <input
            required
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="focus-ring mt-2 w-full rounded-2xl border border-[var(--line)] bg-black/20 px-4 py-3"
          />
        </label>
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
        <Button type="submit" disabled={busy || !supabase} className="w-full">
          Log in
        </Button>
      </form>
      <button
        className="mt-4 text-sm text-gold"
        onClick={async () => {
          if (!supabase || !email) {
            setError("Enter your email first.");
            return;
          }
          const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/login/reset`,
          });
          setNotice(resetError ? resetError.message : "Password reset email sent.");
        }}
      >
        Reset password
      </button>
      <Link href="/signup" className="mt-3 text-center text-sm text-cream/70">
        Create an account
      </Link>
    </main>
  );
}
