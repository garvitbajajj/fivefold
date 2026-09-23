"use client";
import { useActionState, useState } from "react";
import { startCheckout } from "./actions";
import { SubmitButton } from "@/components/submit-button";
import { money, splitPayment, PLAN_PRICE_PENCE } from "@/lib/format";
/**
 * The join flow on one screen: plan, cause, share — then off to Stripe to pay.
 *
 * Kept as a single page rather than a wizard deliberately — the split preview
 * is the most persuasive thing here, and it only works if changing the plan or
 * the slider updates the charity figure in front of you.
 */
export function SubscribeForm({ charities, defaultCharityId, defaultPercent }) {
  const [state, action] = useActionState(startCheckout, null);
  const [plan, setPlan] = useState("monthly");
  const [charityId, setCharityId] = useState(defaultCharityId ?? charities[0]?.id ?? "");
  const [percent, setPercent] = useState(defaultPercent ?? 10);
  const amount = PLAN_PRICE_PENCE[plan];
  const split = splitPayment(amount, percent);
  const chosen = charities.find((c) => c.id === charityId);
  const perYear = plan === "yearly" ? amount : amount * 12;
  return (
    <form action={action} className="grid gap-10 lg:grid-cols-[1fr_22rem] lg:items-start">
      <input type="hidden" name="plan" value={plan} />
      <input type="hidden" name="charity_id" value={charityId} />
      <input type="hidden" name="charity_percent" value={percent} />

      <div className="space-y-10">
        {/* ------------------------------------------------------------ plan */}
        <section>
          <h2 className="font-display text-2xl">1. Pick a plan</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {["monthly", "yearly"].map((option) => {
              const active = plan === option;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setPlan(option)}
                  aria-pressed={active}
                  className={`card p-5 text-left transition-all ${active ? "!border-gold-400 bg-gold-400/5" : "card-hover"}`}
                >
                  <div className="flex items-baseline justify-between">
                    <span className="font-display text-xl capitalize">{option}</span>
                    {option === "yearly" && (
                      <span className="pill text-moss-400">2 months free</span>
                    )}
                  </div>
                  <p className="mt-3 font-display text-3xl tnum">
                    {money(PLAN_PRICE_PENCE[option])}
                    <span className="ml-1 text-sm font-normal text-ink-500">
                      /{option === "yearly" ? "year" : "month"}
                    </span>
                  </p>
                  <p className="mt-1 text-xs text-ink-500">
                    {option === "yearly"
                      ? `Works out at ${money(Math.round(PLAN_PRICE_PENCE.yearly / 12))} a month`
                      : "Cancel any time"}
                  </p>
                </button>
              );
            })}
          </div>
        </section>

        {/* --------------------------------------------------------- charity */}
        <section>
          <h2 className="font-display text-2xl">2. Choose your cause</h2>
          <p className="mt-1.5 text-sm text-ink-500">
            You can change this later — it applies from your next payment.
          </p>
          <div className="mt-5 grid max-h-80 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
            {charities.map((charity) => {
              const active = charityId === charity.id;
              return (
                <button
                  key={charity.id}
                  type="button"
                  onClick={() => setCharityId(charity.id)}
                  aria-pressed={active}
                  className={`card p-4 text-left transition-all ${active ? "!border-moss-400 bg-moss-500/5" : "card-hover"}`}
                >
                  <span className="pill text-moss-400 !text-[0.625rem]">
                    {charity.category}
                  </span>
                  <p className="mt-2 font-medium">{charity.name}</p>
                  <p className="mt-1 text-xs leading-snug text-ink-500">
                    {charity.tagline}
                  </p>
                </button>
              );
            })}
          </div>
        </section>

        {/* ----------------------------------------------------------- share */}
        <section>
          <h2 className="font-display text-2xl">3. Set your share</h2>
          <p className="mt-1.5 text-sm text-ink-500">
            Ten percent is the floor. Push it up to forty if you want to.
          </p>

          <div className="mt-6 flex items-center gap-5">
            <input
              type="range"
              min={10}
              max={40}
              step={5}
              value={percent}
              onChange={(e) => setPercent(Number(e.target.value))}
              aria-label="Percentage of your subscription going to charity"
              className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-ink-700 accent-moss-400"
            />
            <span className="w-16 text-right font-display text-3xl tnum text-moss-300">
              {percent}%
            </span>
          </div>
          <p className="mt-3 text-sm text-paper-300">
            {money(split.charity)} of every payment goes to{" "}
            <span className="text-moss-300">{chosen?.name ?? "your cause"}</span> —
            that&apos;s {money(Math.floor((perYear * percent) / 100))} a year.
          </p>
        </section>
      </div>

      {/* ------------------------------------------------------------ summary */}
      <aside className="card sticky top-24 p-6">
        <p className="eyebrow">Your subscription</p>

        <p className="mt-4 font-display text-4xl tnum">
          {money(amount)}
          <span className="ml-1 text-base font-normal text-ink-500">
            /{plan === "yearly" ? "yr" : "mo"}
          </span>
        </p>

        {/* Where the money goes, to the penny. The same arithmetic the
            database performs, shown before the user commits. */}
        <dl className="mt-6 space-y-3 border-t border-ink-700 pt-5 text-sm">
          <div className="flex justify-between">
            <dt className="text-moss-300">To {chosen?.name ?? "your cause"}</dt>
            <dd className="tnum">{money(split.charity)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gold-400">Into the prize pool</dt>
            <dd className="tnum">{money(split.prizePool)}</dd>
          </div>
          <div className="flex justify-between text-ink-500">
            <dt>Running the platform</dt>
            <dd className="tnum">{money(split.platform)}</dd>
          </div>
        </dl>

        {/* Proportional bar — the charity slice visibly grows with the slider. */}
        <div
          className="mt-5 flex h-2 overflow-hidden rounded-full bg-ink-700"
          role="img"
          aria-label={`${percent}% charity, ${Math.round((split.prizePool / amount) * 100)}% prize pool`}
        >
          <span
            className="bg-moss-400"
            style={{ width: `${(split.charity / amount) * 100}%` }}
          />
          <span
            className="bg-gold-400"
            style={{ width: `${(split.prizePool / amount) * 100}%` }}
          />
        </div>

        {state?.error && (
          <p
            role="alert"
            className="mt-5 rounded-lg bg-clay-600/15 px-3 py-2.5 text-sm text-clay-400"
          >
            {state.error}
          </p>
        )}

        <SubmitButton
          className="btn-primary mt-6 w-full"
          pendingLabel="Opening secure checkout…"
        >
          Continue to payment
        </SubmitButton>

        {/* Payment happens on Stripe's hosted page: card details never touch
            this app, and nothing is activated until Stripe confirms. */}
        <p className="mt-3 text-center text-xs leading-relaxed text-ink-500">
          You&apos;ll pay on Stripe&apos;s secure checkout. Your membership starts the
          moment the payment is confirmed. Cancel whenever — you keep the time you&apos;ve
          paid for.
        </p>
      </aside>
    </form>
  );
}
