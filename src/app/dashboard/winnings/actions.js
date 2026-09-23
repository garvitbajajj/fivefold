"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * Records the storage path of a proof screenshot against a win.
 *
 * The file itself is uploaded straight from the browser to Supabase Storage,
 * so it never passes through the server. This only writes the path, through
 * attach_winner_proof(), which limits it to the winner's own unapproved claim.
 * Members hold no direct UPDATE on winners at all.
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

  const { error } = await supabase.rpc("attach_winner_proof", {
    p_winner_id: winnerId,
    p_path: path,
  });

  if (error) return { error: error.message };

  revalidatePath("/dashboard/winnings");
  revalidatePath("/admin/winners");
  return { ok: "Proof sent. We'll review it and pay out once it checks out." };
}
