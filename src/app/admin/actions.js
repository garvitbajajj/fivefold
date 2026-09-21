"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * Admin mutations.
 *
 * Every one of these relies on the database to enforce permission rather than
 * checking a role here: the draw functions raise `admin only`, and every table
 * write is filtered by an `is_admin()` row level security policy. A forged
 * request reaching these actions still cannot change anything.
 */

// --------------------------------------------------------------------- draws

export async function runSimulation(_prev, formData) {
  const period = String(formData.get("period") ?? "");
  const mode = String(formData.get("mode") ?? "random");

  if (!/^\d{4}-\d{2}-\d{2}$/.test(period)) return { error: "Pick a month to draw." };
  if (mode !== "random" && mode !== "weighted") return { error: "Unknown draw mode." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("simulate_draw", {
    p_period: period,
    p_mode: mode,
  });

  if (error) {
    if (/already published/.test(error.message))
      return { error: "That month is already published and cannot be redrawn." };
    return { error: error.message };
  }

  revalidatePath("/admin/draws");
  return { ok: "Simulation complete. Review it before publishing." };
}

export async function publishDraw(_prev, formData) {
  const drawId = String(formData.get("draw_id") ?? "");

  const supabase = await createClient();
  const { error } = await supabase.rpc("publish_draw", { p_draw_id: drawId });

  if (error) return { error: error.message };

  revalidatePath("/admin/draws");
  revalidatePath("/results");
  revalidatePath("/");
  return { ok: "Published. Results are live and winners can claim." };
}

/** Throws away a simulation so the month can be drawn again from scratch. */
export async function discardSimulation(formData) {
  const drawId = String(formData.get("draw_id") ?? "");
  const supabase = await createClient();
  await supabase.from("draws").delete().eq("id", drawId).eq("status", "simulated");
  revalidatePath("/admin/draws");
}

// ------------------------------------------------------------------ winners

export async function reviewWinner(_prev, formData) {
  const id = String(formData.get("winner_id") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const note = String(formData.get("note") ?? "").trim();

  if (decision !== "approved" && decision !== "rejected")
    return { error: "Choose approve or reject." };
  if (decision === "rejected" && !note)
    return { error: "Give a reason when rejecting, so the winner can fix it." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("winners")
    .update({ verification_status: decision, verification_note: note || null })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/admin/winners");
  return { ok: decision === "approved" ? "Approved — ready to pay." : "Rejected." };
}

export async function markPaid(_prev, formData) {
  const id = String(formData.get("winner_id") ?? "");

  const supabase = await createClient();
  const { error } = await supabase
    .from("winners")
    .update({ payment_status: "paid", paid_at: new Date().toISOString() })
    .eq("id", id);

  // The winners_paid_requires_approval constraint blocks paying an unverified
  // claim. Surface that as a sentence rather than a Postgres error string.
  if (error) {
    if (error.code === "23514")
      return { error: "Verify the proof before marking this one paid." };
    return { error: error.message };
  }

  revalidatePath("/admin/winners");
  return { ok: "Marked as paid." };
}

// ---------------------------------------------------------------- charities

function charityFromForm(formData) {
  return {
    name: String(formData.get("name") ?? "").trim(),
    slug: String(formData.get("slug") ?? "")
      .trim()
      .toLowerCase(),
    tagline: String(formData.get("tagline") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim(),
    category: String(formData.get("category") ?? "").trim(),
    image_url: String(formData.get("image_url") ?? "").trim() || null,
    is_featured: formData.get("is_featured") === "on",
    is_active: formData.get("is_active") !== null,
  };
}

function validateCharity(c) {
  if (!c.name) return "A charity needs a name.";
  if (!/^[a-z0-9-]+$/.test(c.slug))
    return "Slug can only contain lowercase letters, numbers and hyphens.";
  if (!c.tagline) return "Add a one-line tagline.";
  if (!c.description) return "Add a description.";
  if (!c.category) return "Pick a category.";
  return null;
}

export async function saveCharity(_prev, formData) {
  const id = String(formData.get("id") ?? "");
  const charity = charityFromForm(formData);

  const invalid = validateCharity(charity);
  if (invalid) return { error: invalid };

  const supabase = await createClient();

  // Only one charity holds the homepage spotlight at a time.
  if (charity.is_featured) {
    await supabase
      .from("charities")
      .update({ is_featured: false })
      .neq("id", id || crypto.randomUUID());
  }

  const { error } = id
    ? await supabase.from("charities").update(charity).eq("id", id)
    : await supabase.from("charities").insert(charity);

  if (error) {
    if (error.code === "23505") return { error: "That slug is already taken." };
    return { error: error.message };
  }

  revalidatePath("/admin/charities");
  revalidatePath("/charities");
  revalidatePath("/");
  return { ok: id ? "Charity updated." : "Charity added." };
}

/**
 * Charities are retired, not deleted, when money has already flowed to them —
 * a hard delete would orphan the payment history that the charity totals and
 * every user's receipt depend on.
 */
export async function retireCharity(formData) {
  const id = String(formData.get("id") ?? "");
  const supabase = await createClient();

  const { count } = await supabase
    .from("payments")
    .select("id", { count: "exact", head: true })
    .eq("charity_id", id);

  if (count && count > 0) {
    await supabase.from("charities").update({ is_active: false }).eq("id", id);
  } else {
    await supabase.from("charities").delete().eq("id", id);
  }

  revalidatePath("/admin/charities");
  revalidatePath("/charities");
}

export async function restoreCharity(formData) {
  const id = String(formData.get("id") ?? "");
  const supabase = await createClient();
  await supabase.from("charities").update({ is_active: true }).eq("id", id);
  revalidatePath("/admin/charities");
  revalidatePath("/charities");
}

// -------------------------------------------------------------------- users

export async function setUserRole(formData) {
  const id = String(formData.get("user_id") ?? "");
  const role = String(formData.get("role") ?? "");
  if (role !== "admin" && role !== "subscriber") return;

  const supabase = await createClient();
  await supabase.from("profiles").update({ role }).eq("id", id);
  revalidatePath("/admin/users");
}

/** Ends a member's subscription immediately, for refunds and disputes. */
export async function endSubscription(formData) {
  const id = String(formData.get("subscription_id") ?? "");
  const supabase = await createClient();
  await supabase
    .from("subscriptions")
    .update({ status: "cancelled", current_period_end: new Date().toISOString() })
    .eq("id", id);
  revalidatePath("/admin/users");
}

export async function adminSaveScore(_prev, formData) {
  const id = String(formData.get("score_id") ?? "");
  const value = Number(formData.get("value"));

  if (!Number.isInteger(value) || value < 1 || value > 45)
    return { error: "Stableford scores run 1 to 45." };

  const supabase = await createClient();
  const { error } = await supabase.from("scores").update({ value }).eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/admin/users");
  return { ok: "Score updated." };
}

export async function adminDeleteScore(formData) {
  const id = String(formData.get("score_id") ?? "");
  const supabase = await createClient();
  await supabase.from("scores").delete().eq("id", id);
  revalidatePath("/admin/users");
}
