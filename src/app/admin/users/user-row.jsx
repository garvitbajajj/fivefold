"use client";

import { useActionState, useState } from "react";
import {
  setUserRole,
  endSubscription,
  adminSaveScore,
  adminDeleteScore,
} from "../actions";
import { SubmitButton } from "@/components/submit-button";
import { money, shortDate } from "@/lib/format";

/**
 * One member, expandable into their scores and subscription.
 *
 * Collapsed by default: a list of fifty users with every score inline is
 * unreadable, and the common case is scanning for one person.
 */
export function UserRow({ user }) {
  const [open, setOpen] = useState(false);
  const sub = user.subscription;
  const active =
    sub?.status === "active" && new Date(sub.current_period_end) > new Date();

  return (
    <article className="card overflow-hidden">
      <div className="flex flex-wrap items-center gap-4 p-5">
        <button
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          className="min-w-0 flex-1 text-left"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{user.full_name ?? "No name given"}</span>
            {user.role === "admin" && (
              <span className="pill !text-[0.625rem] text-gold-400">admin</span>
            )}
            <span
              className={`pill !text-[0.625rem] ${active ? "text-moss-400" : "text-ink-500"}`}
            >
              {active ? "subscribed" : (sub?.status ?? "never subscribed")}
            </span>
          </div>
          <p className="mt-1 text-xs text-ink-500">
            {user.scores.length} score{user.scores.length === 1 ? "" : "s"}
            {user.charity ? ` · backing ${user.charity}` : ""}
            {` · joined ${shortDate(user.created_at)}`}
          </p>
        </button>

        <div className="flex items-center gap-4">
          {user.won > 0 && (
            <div className="text-right">
              <p className="font-display text-lg tnum text-gold-400">{money(user.won)}</p>
              <p className="text-xs text-ink-500">won</p>
            </div>
          )}

          <form action={setUserRole}>
            <input type="hidden" name="user_id" value={user.id} />
            <input
              type="hidden"
              name="role"
              value={user.role === "admin" ? "subscriber" : "admin"}
            />
            <SubmitButton
              className="rounded-lg px-3 py-1.5 text-xs text-paper-300 hover:bg-ink-800 disabled:opacity-50"
              pendingLabel="…"
            >
              {user.role === "admin" ? "Revoke admin" : "Make admin"}
            </SubmitButton>
          </form>
        </div>
      </div>

      {open && (
        <div className="border-t border-ink-700 bg-ink-900 p-5">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* ------------------------------------------------ subscription */}
            <div>
              <p className="eyebrow">Subscription</p>
              {sub ? (
                <>
                  <dl className="mt-3 space-y-2 text-sm">
                    <Row
                      label="Plan"
                      value={`${sub.plan} · ${money(sub.amount_pence)}`}
                    />
                    <Row label="Status" value={sub.status} />
                    <Row
                      label={sub.cancel_at_period_end ? "Ends" : "Renews"}
                      value={shortDate(sub.current_period_end)}
                    />
                    <Row label="Charity share" value={`${user.charity_percent}%`} />
                  </dl>

                  {active && (
                    <form action={endSubscription} className="mt-4">
                      <input type="hidden" name="subscription_id" value={sub.id} />
                      <SubmitButton
                        className="btn-ghost !border-clay-500 !py-2 text-xs !text-clay-400"
                        pendingLabel="Ending…"
                      >
                        End immediately
                      </SubmitButton>
                    </form>
                  )}
                </>
              ) : (
                <p className="mt-3 text-sm text-ink-500">Never subscribed.</p>
              )}
            </div>

            {/* ------------------------------------------------------ scores */}
            <div>
              <p className="eyebrow">Scores</p>
              {user.scores.length === 0 ? (
                <p className="mt-3 text-sm text-ink-500">No scores logged.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {user.scores.map((score) => (
                    <ScoreEditRow key={score.id} score={score} />
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </article>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-ink-500">{label}</dt>
      <dd className="capitalize">{value}</dd>
    </div>
  );
}

function ScoreEditRow({ score }) {
  const [state, action] = useActionState(adminSaveScore, null);

  return (
    <li className="flex items-center gap-2">
      <form action={action} className="flex flex-1 items-center gap-2">
        <input type="hidden" name="score_id" value={score.id} />
        <input
          name="value"
          type="number"
          min={1}
          max={45}
          defaultValue={score.value}
          aria-label={`Score for ${shortDate(score.played_on)}`}
          className="input tnum w-20 !py-1.5 text-sm"
        />
        <span className="flex-1 text-xs text-ink-500">{shortDate(score.played_on)}</span>
        <SubmitButton
          className="rounded-lg px-2.5 py-1.5 text-xs text-paper-300 hover:bg-ink-800 disabled:opacity-50"
          pendingLabel="…"
        >
          Save
        </SubmitButton>
      </form>

      <form action={adminDeleteScore}>
        <input type="hidden" name="score_id" value={score.id} />
        <SubmitButton
          className="rounded-lg px-2.5 py-1.5 text-xs text-clay-400 hover:bg-ink-800 disabled:opacity-50"
          pendingLabel="…"
        >
          Delete
        </SubmitButton>
      </form>

      {state?.error && <span className="text-xs text-clay-400">{state.error}</span>}
    </li>
  );
}
