"use client";

import { useActionState, useState } from "react";
import { reviewWinner, markPaid } from "../actions";
import { SubmitButton } from "@/components/submit-button";

/**
 * Approve, reject or pay a single claim.
 *
 * Rejection demands a note — the winner sees it and needs to know what to fix.
 * Paying is only offered once the proof is approved, which the database
 * enforces anyway via the winners_paid_requires_approval constraint.
 */
export function ReviewPanel({ winner }) {
  const [reviewState, reviewAction] = useActionState(reviewWinner, null);
  const [payState, payAction] = useActionState(markPaid, null);
  const [rejecting, setRejecting] = useState(false);

  if (winner.payment_status === "paid") {
    return <p className="text-sm text-moss-300">Paid. Nothing left to do.</p>;
  }

  if (winner.verification_status === "approved") {
    return (
      <form action={payAction} className="flex flex-wrap items-center gap-3">
        <input type="hidden" name="winner_id" value={winner.id} />
        <SubmitButton className="btn-primary !py-2 text-sm" pendingLabel="Marking…">
          Mark as paid
        </SubmitButton>
        {payState?.error && (
          <p role="alert" className="text-sm text-clay-400">
            {payState.error}
          </p>
        )}
      </form>
    );
  }

  if (winner.verification_status === "rejected") {
    return (
      <form action={reviewAction} className="flex flex-wrap items-center gap-3">
        <input type="hidden" name="winner_id" value={winner.id} />
        <input type="hidden" name="decision" value="approved" />
        <p className="text-sm text-clay-400">
          Rejected{winner.verification_note ? `: ${winner.verification_note}` : ""}
        </p>
        <SubmitButton className="btn-ghost !py-1.5 text-xs" pendingLabel="…">
          Undo
        </SubmitButton>
      </form>
    );
  }

  // Pending.
  if (!winner.proof_url) {
    return (
      <p className="text-sm text-ink-500">
        Waiting on the winner to upload proof of their scores.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <form action={reviewAction} className="flex flex-wrap items-end gap-3">
        <input type="hidden" name="winner_id" value={winner.id} />
        <input
          type="hidden"
          name="decision"
          value={rejecting ? "rejected" : "approved"}
        />

        {rejecting && (
          <div className="min-w-60 flex-1">
            <label className="label" htmlFor={`note-${winner.id}`}>
              Why are you rejecting this?
            </label>
            <input
              id={`note-${winner.id}`}
              name="note"
              required
              className="input"
              placeholder="Screenshot doesn't show all five scores"
            />
          </div>
        )}

        {rejecting ? (
          <>
            <SubmitButton
              className="btn-ghost !border-clay-500 !py-2 text-sm !text-clay-400"
              pendingLabel="Rejecting…"
            >
              Confirm rejection
            </SubmitButton>
            <button
              type="button"
              onClick={() => setRejecting(false)}
              className="btn-ghost !py-2 text-sm"
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <SubmitButton className="btn-primary !py-2 text-sm" pendingLabel="Approving…">
              Approve
            </SubmitButton>
            <button
              type="button"
              onClick={() => setRejecting(true)}
              className="btn-ghost !py-2 text-sm"
            >
              Reject
            </button>
          </>
        )}
      </form>

      {reviewState?.error && (
        <p role="alert" className="text-sm text-clay-400">
          {reviewState.error}
        </p>
      )}
    </div>
  );
}
