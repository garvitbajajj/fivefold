"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * Records the storage path of a proof screenshot against a win.
 *
 * The file itself is uploaded straight from the browser to Supabase Storage,
 * so it never passes through the server. This only writes the path, and the
 * winners_update_own_proof policy limits that to the winner's own row while it
 * is still unapproved.
 */
export async function attachProof(_prev, formData) {
  const winnerId = String(formData.get("winner_id") ?? "");
  const path = String(formData.get("path") ?? "");

  if (!winnerId || !path) return { error: "Something went wrong with the upload." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Your session expired. Sign in again." };

  // The storage policy already enforces this, but checking here means a
  // mismatched path fails with a sentence rather than a silent no-op.
  if (!path.startsWith(`${user.id}/`))
    return { error: "That file isn't yours to attach." };

  const { error } = await supabase
    .from("winners")
    .update({
      proof_url: path,
      // Re-submitting after a rejection puts the claim back in the queue.
      verification_status: "pending",
      verification_note: null,
    })
    .eq("id", winnerId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/winnings");
  revalidatePath("/admin/winners");
  return { ok: "Proof sent. We'll review it and pay out once it checks out." };
}
