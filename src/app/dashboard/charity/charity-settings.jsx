"use client";

import { useActionState, useState } from "react";
import {
  updateCharity,
  cancelSubscription,
  resumeSubscription,
  makeDonation,
} from "./actions";
import { SubmitButton } from "@/components/submit-button";
import { money, splitPayment, shortDate } from "@/lib/format";

export function CharitySettings({ charities, current, percent, subscription }) {
  const [state, action] = useActionState(updateCharity, null);
  const [charityId, setCharityId] = useState(current ?? charities[0]?.id ?? "");
  const [share, setShare] = useState(percent);

  const amount = subscription?.amount_pence ?? 1200;
  const split = splitPayment(amount, share);
  const chosen = charities.find((c) => c.id === charityId);
  const changed = charityId !== current || share !== percent;

  return (
    <form action={action} className="card p-6">
      <input type="hidden" name="charity_id" value={charityId} />
      <input type="hidden" name="charity_percent" value={share} />

      <h2 className="font-display text-2xl">Your cause</h2>
      <p className="mt-1.5 text-sm text-ink-500">
        Changes apply from your next payment. Past contributions stay where they went.
      </p>

      <div className="mt-6 grid max-h-72 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
        {charities.map((charity) => {
          const active = charityId === charity.id;
          return (
            <button
              key={charity.id}
              type="button"
              onClick={() => setCharityId(charity.id)}
              aria-pressed={active}
              className={`card p-4 text-left transition-all ${
                active ? "!border-moss-400 bg-moss-500/5" : "card-hover"
              }`}
            >
              <span className="pill text-moss-400 !text-[0.625rem]">
                {charity.category}
              </span>
              <p className="mt-2 font-medium">{charity.name}</p>
              <p className="mt-1 text-xs leading-snug text-ink-500">{charity.tagline}</p>
            </button>
          );
        })}
      </div>

      <div className="mt-7 border-t border-ink-700 pt-6">
        <div className="flex items-center justify-between">
          <label htmlFor="share" className="text-sm text-paper-300">
            Share of each payment
          </label>
          <span className="font-display text-3xl tnum text-moss-300">{share}%</span>
        </div>

        <input
          id="share"
          type="range"
          min={10}
          max={40}
          step={5}
          value={share}
          onChange={(e) => setShare(Number(e.target.value))}
          className="mt-3 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-ink-700 accent-moss-400"
        />

        <p className="mt-3 text-sm text-paper-300">
          {money(split.charity)} of every {money(amount)} goes to{" "}
          <span className="text-moss-300">{chosen?.name ?? "your cause"}</span>.
        </p>
      </div>

      {state?.error && (
        <p
          role="alert"
          className="mt-4 rounded-lg bg-clay-600/15 px-3 py-2.5 text-sm text-clay-400"
        >
          {state.error}
        </p>
      )}
      {state?.ok && (
        <p className="mt-4 rounded-lg bg-moss-500/15 px-3 py-2.5 text-sm text-moss-300">
          {state.ok}
        </p>
      )}

      <SubmitButton
        className="btn-primary mt-6 disabled:opacity-40"
        pendingLabel="Saving…"
        disabled={!changed}
      >
        {changed ? "Save changes" : "Saved"}
      </SubmitButton>
    </form>
  );
}

/** Cancel or resume. Cancelling is never immediate — paid time is kept. */
export function SubscriptionControls({ subscription }) {
  const ending = subscription.cancel_at_period_end;
  const [state, action] = useActionState(
    ending ? resumeSubscription : cancelSubscription,
    null,
  );

  return (
    <div className="card p-6">
      <h2 className="font-display text-2xl">Subscription</h2>

      <dl className="mt-5 space-y-2.5 text-sm">
        <div className="flex justify-between">
          <dt className="text-ink-500">Plan</dt>
          <dd className="capitalize">
            {subscription.plan} · {money(subscription.amount_pence)}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-ink-500">{ending ? "Access until" : "Renews"}</dt>
          <dd>{shortDate(subscription.current_period_end)}</dd>
        </div>
      </dl>

      <form action={action} className="mt-6">
        <SubmitButton
          className={ending ? "btn-primary !py-2.5 text-sm" : "btn-ghost !py-2.5 text-sm"}
          pendingLabel="Working…"
        >
          {ending ? "Resume subscription" : "Cancel subscription"}
        </SubmitButton>
      </form>

      {state?.error && (
        <p role="alert" className="mt-3 text-sm text-clay-400">
          {state.error}
        </p>
      )}
      {state?.ok && <p className="mt-3 text-sm text-moss-300">{state.ok}</p>}

      <p className="mt-4 text-xs leading-relaxed text-ink-500">
        {ending
          ? "You're still in this month's draw, and will be until the date above."
          : "Cancelling keeps the time you've already paid for, including this month's draw."}
      </p>
    </div>
  );
}

/** One-off gift. Outside the game: nothing enters the prize pool. */
export function DonationBox({ charities, defaultCharityId }) {
  const [state, action] = useActionState(makeDonation, null);
  const [amount, setAmount] = useState(10);

  return (
    <div className="card p-6">
      <h2 className="font-display text-2xl">Give something extra</h2>
      <p className="mt-1.5 text-sm leading-relaxed text-ink-500">
        A one-off gift, entirely outside the game. All of it reaches the charity — none
        goes to the prize pool, and it doesn&apos;t change your odds.
      </p>

      <form action={action} className="mt-6 space-y-4">
        <div>
          <label className="label" htmlFor="gift-charity">
            Cause
          </label>
          <select
            id="gift-charity"
            name="charity_id"
            defaultValue={defaultCharityId}
            className="input"
          >
            {charities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label" htmlFor="gift-amount">
            Amount
          </label>
          <div className="flex gap-2">
            {[5, 10, 25, 50].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setAmount(preset)}
                className={`flex-1 rounded-lg border py-2 text-sm transition-colors ${
                  amount === preset
                    ? "border-moss-400 bg-moss-500/10 text-moss-300"
                    : "border-ink-600 text-paper-300 hover:border-paper-300"
                }`}
              >
                £{preset}
              </button>
            ))}
          </div>
          <input
            id="gift-amount"
            name="amount"
            type="number"
            min={1}
            max={10000}
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="input tnum mt-2"
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
        {state?.ok && (
          <p className="rounded-lg bg-moss-500/15 px-3 py-2.5 text-sm text-moss-300">
            {state.ok}
          </p>
        )}

        <SubmitButton
          className="btn-primary w-full !py-2.5 text-sm"
          pendingLabel="Opening secure checkout…"
        >
          Donate with Stripe
        </SubmitButton>
      </form>
    </div>
  );
}
