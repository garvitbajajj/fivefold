/**
 * Environment variables, or a sentence saying what to do about a missing one.
 *
 * Without this, a missing variable surfaces as something like
 * `supabaseUrl is required` thrown from inside the proxy — which takes down
 * every route, including static pages, and shows a bare "Internal Server
 * Error" with no clue as to the cause.
 */
export function requireEnv(...names) {
  const missing = names.filter((name) => !process.env[name]);

  if (missing.length > 0) {
    throw new Error(
      `Missing ${missing.join(" and ")}. ` +
        `Set ${missing.length > 1 ? "them" : "it"} in your hosting provider's ` +
        `environment variables and redeploy — new variables are not applied to ` +
        `an existing build. Locally, copy .env.example to .env.local.`,
    );
  }

  return names.map((name) => process.env[name]);
}

/** The two public Supabase values, safe in the browser. */
export function supabaseEnv() {
  // Referenced literally, not through process.env[name]: Next only inlines
  // NEXT_PUBLIC_ variables into the client bundle when it can see the name.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    requireEnv(
      ...[
        !url && "NEXT_PUBLIC_SUPABASE_URL",
        !key && "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      ].filter(Boolean),
    );
  }
  return { url, key };
}
