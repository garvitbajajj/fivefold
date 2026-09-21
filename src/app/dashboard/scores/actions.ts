"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ScoreState = { error?: string; ok?: string } | null;

/** Turn Postgres constraint failures into something a golfer would understand. */
function readable(message: string, code?: string) {
  if (code === "23505") return "You've already logged a score for that date. Edit it instead.";
  if (code === "23514" || /scores_value_check/.test(message))
    return "A Stableford score has to be between 1 and 45.";
  if (/played_on_check/.test(message)) return "You can't log a round in the future.";
  if (code === "42501")
    return "Your subscription isn't active, so scores are locked. Renew to start playing again.";
  return message;
}

function validate(value: number, playedOn: string): string | null {
  if (!Number.isInteger(value) || value < 1 || value > 45)
    return "A Stableford score has to be a whole number between 1 and 45.";
  if (!playedOn) return "Pick the date you played.";
  // Compare as plain dates so a round logged earlier today is never "future".
  if (playedOn > new Date().toISOString().slice(0, 10))
    return "You can't log a round in the future.";
  return null;
}

/**
 * Adds a score.
 *
 * The rolling-five rule is not enforced here: a database trigger drops the
 * oldest row once a sixth arrives. Doing it in SQL means the admin score
 * editor, this form, and anything added later all obey the same rule without
 * repeating it.
 */
export async function addScore(_prev: ScoreState, formData: FormData): Promise<ScoreState> {
  const value = Number(formData.get("value"));
  const playedOn = String(formData.get("played_on") ?? "");

  const invalid = validate(value, playedOn);
  if (invalid) return { error: invalid };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Your session expired. Sign in again." };

  const { error } = await supabase
    .from("scores")
    .insert({ user_id: user.id, value, played_on: playedOn });

  if (error) return { error: readable(error.message, error.code) };

  revalidatePath("/dashboard", "layout");
  return { ok: "Score logged." };
}

export async function updateScore(_prev: ScoreState, formData: FormData): Promise<ScoreState> {
  const id = String(formData.get("id") ?? "");
  const value = Number(formData.get("value"));
  const playedOn = String(formData.get("played_on") ?? "");

  const invalid = validate(value, playedOn);
  if (invalid) return { error: invalid };

  const supabase = await createClient();
  const { error } = await supabase
    .from("scores")
    .update({ value, played_on: playedOn })
    .eq("id", id);

  if (error) return { error: readable(error.message, error.code) };

  revalidatePath("/dashboard", "layout");
  return { ok: "Score updated." };
}

export async function deleteScore(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const supabase = await createClient();
  await supabase.from("scores").delete().eq("id", id);
  revalidatePath("/dashboard", "layout");
}
