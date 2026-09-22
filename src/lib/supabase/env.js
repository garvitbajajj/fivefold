/**
 * Reads the two Supabase environment variables, or fails with a sentence that
 * says what to do about it.
 *
 * Without this, a missing variable surfaces as `supabaseUrl is required`
 * thrown from inside the proxy — which takes down every route, including
 * static pages, and shows a bare "Internal Server Error" with no clue as to
 * the cause. Deployments miss these variables often enough that the error is
 * worth spelling out.
 */
export function supabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const missing = [
    !url && "NEXT_PUBLIC_SUPABASE_URL",
    !key && "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  ].filter(Boolean);

  if (missing.length > 0) {
    throw new Error(
      `Missing ${missing.join(" and ")}. ` +
        `Set ${missing.length > 1 ? "them" : "it"} in your hosting provider's ` +
        `environment variables and redeploy — new variables are not applied to ` +
        `an existing build. Locally, copy .env.example to .env.local.`,
    );
  }

  return { url, key };
}
