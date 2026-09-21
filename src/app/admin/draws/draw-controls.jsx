"use client";

import { useActionState } from "react";
import { runSimulation, publishDraw, discardSimulation } from "../actions";
import { SubmitButton } from "@/components/submit-button";
import { money } from "@/lib/format";

/** The month to offer by default: the current one. */
function thisMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function Simulator({ defaultMonth }) {
  const [state, action] = useActionState(runSimulation, null);

  return (
    <form action={action} className="card p-6">
      <p className="eyebrow">Run a draw</p>
      <h2 className="mt-2 font-display text-2xl">Simulate first, publish after.</h2>
      <p className="mt-2 text-sm leading-relaxed text-paper-300">
        A simulation snapshots who is eligible, draws the numbers and works out every
        prize — without showing anyone. Re-run it as often as you like; each run replaces
        the last.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="month">
            Draw month
          </label>
          {/* Native month input. The action appends -01 to make it the first
              of the month, which is the period key the engine expects. */}
          <input
            id="month"
            name="month"
            type="month"
            defaultValue={defaultMonth ?? thisMonth()}
            required
            className="input tnum"
            onChange={(e) => {
              const hidden = e.currentTarget.form?.elements.namedItem("period");
              if (hidden) hidden.value = `${e.currentTarget.value}-01`;
            }}
          />
          <input
            type="hidden"
            name="period"
            defaultValue={`${defaultMonth ?? thisMonth()}-01`}
          />
        </div>

        <div>
          <label className="label" htmlFor="mode">
            Draw logic
          </label>
          <select id="mode" name="mode" className="input" defaultValue="random">
            <option value="random">Random — every number equally likely</option>
            <option value="weighted">Weighted — by how often scores appear</option>
          </select>
        </div>
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

      <SubmitButton className="btn-primary mt-5" pendingLabel="Drawing…">
        Run simulation
      </SubmitButton>
    </form>
  );
}

/**
 * Publish controls for a simulated draw. Kept apart from the simulator so the
 * destructive-ish action sits next to the numbers it will make public, not
 * next to the button that generated them.
 */
export function PublishPanel({ draw, winnerCount, payout }) {
  const [state, action] = useActionState(publishDraw, null);

  return (
    <div className="border-t border-ink-700 bg-gold-400/5 px-6 py-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-gold-300">Simulated, not yet visible to members.</p>
          <p className="mt-1 text-xs text-ink-500">
            {winnerCount} winner{winnerCount === 1 ? "" : "s"} sharing {money(payout)} of
            a {money(draw.pool_pence)} pool
            {draw.carry_out_pence > 0 &&
              ` · ${money(draw.carry_out_pence)} jackpot would roll over`}
          </p>
        </div>

        <div className="flex gap-2">
          <form action={discardSimulation}>
            <input type="hidden" name="draw_id" value={draw.id} />
            <SubmitButton className="btn-ghost !py-2 text-sm" pendingLabel="Discarding…">
              Discard
            </SubmitButton>
          </form>

          <form action={action}>
            <input type="hidden" name="draw_id" value={draw.id} />
            <SubmitButton
              className="btn-primary !py-2 text-sm"
              pendingLabel="Publishing…"
            >
              Publish results
            </SubmitButton>
          </form>
        </div>
      </div>

      {state?.error && (
        <p role="alert" className="mt-3 text-sm text-clay-400">
          {state.error}
        </p>
      )}
    </div>
  );
}
