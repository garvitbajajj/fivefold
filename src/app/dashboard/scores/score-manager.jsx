"use client";
import { useActionState, useState } from "react";
import { addScore, updateScore, deleteScore } from "./actions";
import { SubmitButton } from "@/components/submit-button";
import { shortDate } from "@/lib/format";
const today = () => new Date().toISOString().slice(0, 10);
/**
 * The five-score ticket: add, edit, delete.
 *
 * Scores arrive already sorted newest-first from the server. When five are
 * held, the add form stays available and warns which one a sixth would push
 * out — surfacing the rolling rule at the moment it matters rather than
 * silently dropping a round.
 */
export function ScoreManager({ scores, locked }) {
  const [addState, addAction] = useActionState(addScore, null);
  const [editing, setEditing] = useState(null);
  const full = scores.length === 5;
  const oldest = scores[scores.length - 1];
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_20rem] lg:items-start">
      {/* ------------------------------------------------------------- list */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-ink-700 px-5 py-4">
          <h2 className="font-display text-xl">Your five</h2>
          <span className="font-mono text-xs text-ink-500">{scores.length} / 5</span>
        </div>

        {scores.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-ink-500">
            No scores yet. Log five rounds and you&apos;re in the next draw.
          </p>
        ) : (
          <ul className="divide-y divide-ink-800">
            {scores.map((score) =>
              editing === score.id ? (
                <li key={score.id} className="bg-ink-900 px-5 py-4">
                  <EditRow score={score} onDone={() => setEditing(null)} />
                </li>
              ) : (
                <li key={score.id} className="flex items-center gap-4 px-5 py-4">
                  <span className="ball shrink-0">{score.value}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">{shortDate(score.played_on)}</p>
                    <p className="text-xs text-ink-500">
                      {score.value} Stableford{" "}
                      {score.value >= 36 ? "— a good round" : "points"}
                    </p>
                  </div>
                  {!locked && (
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setEditing(score.id)}
                        className="rounded-lg px-3 py-1.5 text-xs text-paper-300 transition-colors hover:bg-ink-800"
                      >
                        Edit
                      </button>
                      <form action={deleteScore}>
                        <input type="hidden" name="id" value={score.id} />
                        <SubmitButton
                          className="rounded-lg px-3 py-1.5 text-xs text-clay-400 transition-colors hover:bg-clay-600/15 disabled:opacity-50"
                          pendingLabel="…"
                        >
                          Delete
                        </SubmitButton>
                      </form>
                    </div>
                  )}
                </li>
              ),
            )}
          </ul>
        )}
      </div>

      {/* -------------------------------------------------------------- add */}
      <div className="card p-5">
        <h2 className="font-display text-xl">Log a round</h2>

        {locked ? (
          <p className="mt-3 text-sm leading-relaxed text-ink-500">
            Score entry is locked while your subscription is inactive.
          </p>
        ) : (
          <>
            {full && oldest && (
              <p className="mt-3 rounded-lg bg-gold-400/10 px-3 py-2.5 text-xs leading-relaxed text-gold-300">
                You&apos;re holding five. Adding another drops your{" "}
                {shortDate(oldest.played_on)} round ({oldest.value}).
              </p>
            )}

            <form action={addAction} className="mt-4 space-y-4">
              <div>
                <label className="label" htmlFor="value">
                  Stableford points
                </label>
                <input
                  id="value"
                  name="value"
                  type="number"
                  min={1}
                  max={45}
                  required
                  className="input tnum"
                  placeholder="1–45"
                />
              </div>

              <div>
                <label className="label" htmlFor="played_on">
                  Date played
                </label>
                {/* Native date input: no picker dependency, and max stops a
                future date before the server has to. */}
                <input
                  id="played_on"
                  name="played_on"
                  type="date"
                  max={today()}
                  defaultValue={today()}
                  required
                  className="input tnum"
                />
              </div>

              {addState?.error && (
                <p
                  role="alert"
                  className="rounded-lg bg-clay-600/15 px-3 py-2.5 text-sm text-clay-400"
                >
                  {addState.error}
                </p>
              )}
              {addState?.ok && (
                <p className="rounded-lg bg-moss-500/15 px-3 py-2.5 text-sm text-moss-300">
                  {addState.ok}
                </p>
              )}

              <SubmitButton className="btn-primary w-full" pendingLabel="Saving…">
                Add score
              </SubmitButton>
            </form>

            <p className="mt-4 text-xs leading-relaxed text-ink-500">
              One score per date. Played twice in a day? Log your better round and edit it
              later if you change your mind.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
function EditRow({ score, onDone }) {
  const [state, action] = useActionState(async (prev, fd) => {
    const result = await updateScore(prev, fd);
    if (result?.ok) onDone();
    return result;
  }, null);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="id" value={score.id} />
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-24">
          <label className="label" htmlFor={`v-${score.id}`}>
            Points
          </label>
          <input
            id={`v-${score.id}`}
            name="value"
            type="number"
            min={1}
            max={45}
            defaultValue={score.value}
            required
            className="input tnum"
          />
        </div>
        <div className="flex-1 min-w-40">
          <label className="label" htmlFor={`d-${score.id}`}>
            Date
          </label>
          <input
            id={`d-${score.id}`}
            name="played_on"
            type="date"
            max={today()}
            defaultValue={score.played_on}
            required
            className="input tnum"
          />
        </div>
        <SubmitButton className="btn-primary !py-2.5 text-sm" pendingLabel="Saving…">
          Save
        </SubmitButton>
        <button type="button" onClick={onDone} className="btn-ghost !py-2.5 text-sm">
          Cancel
        </button>
      </div>
      {state?.error && (
        <p role="alert" className="text-sm text-clay-400">
          {state.error}
        </p>
      )}
    </form>
  );
}
