"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
/** Anything the user could plausibly mistype, phrased without leaking whether
 *  an account exists. */
function readable(message) {
  if (/invalid login credentials/i.test(message))
    return "That email and password don't match.";
  if (/already registered/i.test(message))
    return "There's already an account with that email.";
  if (/password/i.test(message) && /least/i.test(message))
    return "Password needs to be at least 8 characters.";
  return message;
}
export async function signIn(_prev, formData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/dashboard");
  if (!email || !password) return { error: "Enter your email and password." };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: readable(error.message) };
  revalidatePath("/", "layout");
  redirect(next);
}
export async function signUp(_prev, formData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("full_name") ?? "").trim();
  if (!fullName) return { error: "We need a name to put on your account." };
  if (!email.includes("@")) return { error: "That doesn't look like an email address." };
  if (password.length < 8)
    return { error: "Password needs to be at least 8 characters." };
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    // Picked up by the handle_new_user trigger to populate the profile.
    options: { data: { full_name: fullName } },
  });
  if (error) return { error: readable(error.message) };
  // With email confirmation switched on there is no session yet, so send the
  // user somewhere that explains what to do rather than a dead dashboard.
  if (!data.session) redirect("/signup/confirm");
  revalidatePath("/", "layout");
  redirect("/subscribe");
}
export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
