"use client";
import { useActionState } from "react";
import Link from "next/link";
import { signUp } from "../actions";
import { SubmitButton } from "@/components/submit-button";
export default function SignupPage() {
  const [state, action] = useActionState(signUp, null);
  return (
    <>
      <h1 className="font-display text-3xl">Start playing.</h1>
      <p className="mt-2 text-sm text-ink-500">
        Create an account, then pick your cause and plan.
      </p>

      <form action={action} className="mt-8 space-y-4">
        <div>
          <label className="label" htmlFor="full_name">
            Name
          </label>
          <input
            id="full_name"
            name="full_name"
            autoComplete="name"
            required
            className="input"
            placeholder="Alex Morgan"
          />
        </div>

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
            autoComplete="new-password"
            required
            minLength={8}
            className="input"
            placeholder="At least 8 characters"
          />
        </div>

        {state?.error && (
          <p
            role="alert"
            className="rounded-lg bg-clay-600/15 px-3 py-2.5 text-sm text-clay-400"
          >
            {state.error}
          </p>
        )}

        <SubmitButton className="btn-primary w-full" pendingLabel="Creating account…">
          Create account
        </SubmitButton>

        <p className="text-center text-xs leading-relaxed text-ink-500">
          Payments on this build are simulated. No card is taken and no real money moves.
        </p>
      </form>

      <p className="mt-6 text-center text-sm text-ink-500">
        Already with us?{" "}
        <Link href="/login" className="text-gold-400 hover:text-gold-300">
          Sign in
        </Link>
      </p>
    </>
  );
}
