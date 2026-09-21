"use client";

import { use, useActionState } from "react";
import Link from "next/link";
import { signIn, type AuthState } from "../actions";
import { SubmitButton } from "@/components/submit-button";

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = use(searchParams);
  const [state, action] = useActionState<AuthState, FormData>(signIn, null);

  return (
    <>
      <h1 className="font-display text-3xl">Welcome back.</h1>
      <p className="mt-2 text-sm text-ink-500">
        Sign in to log scores and check the draw.
      </p>

      <form action={action} className="mt-8 space-y-4">
        <input type="hidden" name="next" value={next ?? "/dashboard"} />

        <div>
          <label className="label" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="input"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label className="label" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="input"
            placeholder="••••••••"
          />
        </div>

        {state?.error && (
          <p role="alert" className="rounded-lg bg-clay-600/15 px-3 py-2.5 text-sm text-clay-400">
            {state.error}
          </p>
        )}

        <SubmitButton className="btn-primary w-full" pendingLabel="Signing in…">
          Sign in
        </SubmitButton>
      </form>

      <p className="mt-6 text-center text-sm text-ink-500">
        No account yet?{" "}
        <Link href="/signup" className="text-gold-400 hover:text-gold-300">
          Create one
        </Link>
      </p>
    </>
  );
}
