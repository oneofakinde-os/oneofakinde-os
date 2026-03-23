"use client";

import { createClient } from "@/lib/supabase/client";
import { isSupabaseAuthEnabled } from "@/lib/supabase/config";
import type { Provider } from "@supabase/supabase-js";
import { useState } from "react";

type SocialProvider = {
  id: Provider;
  label: string;
};

const SIGN_IN_PROVIDERS: SocialProvider[] = [
  { id: "google", label: "google" },
  { id: "apple", label: "apple" },
  { id: "twitter", label: "x" }
];

const SIGN_UP_PROVIDERS: SocialProvider[] = [
  { id: "google", label: "google" },
  { id: "apple", label: "apple" },
  { id: "discord", label: "discord" }
];

type SocialAuthButtonsProps = {
  mode: "sign-in" | "sign-up";
  returnTo?: string;
};

export function SocialAuthButtons({ mode, returnTo }: SocialAuthButtonsProps) {
  const [pending, setPending] = useState<string | null>(null);
  const enabled = isSupabaseAuthEnabled();
  const providers = mode === "sign-in" ? SIGN_IN_PROVIDERS : SIGN_UP_PROVIDERS;

  async function handleOAuth(provider: Provider) {
    if (!enabled || pending) return;

    setPending(provider);
    const supabase = createClient();

    const redirectTo = `${window.location.origin}/auth/callback${returnTo ? `?next=${encodeURIComponent(returnTo)}` : ""}`;

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo,
        queryParams: provider === "google"
          ? { access_type: "offline", prompt: "consent" }
          : undefined
      }
    });

    if (error) {
      setPending(null);
    }
  }

  return (
    <section className="identity-social" aria-label={`social ${mode} options`}>
      <p>{mode === "sign-in" ? "or continue with" : "social options"}</p>
      <div>
        {providers.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            className="identity-chip"
            disabled={!enabled || pending !== null}
            onClick={() => handleOAuth(id)}
            aria-busy={pending === id}
          >
            {pending === id ? "..." : label}
          </button>
        ))}
      </div>
    </section>
  );
}
