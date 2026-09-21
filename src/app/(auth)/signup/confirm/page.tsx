import Link from "next/link";

/**
 * Only reached when the Supabase project has email confirmation switched on.
 * Without this the user would land on a dashboard they have no session for and
 * get bounced straight back to the login screen with no explanation.
 */
export default function ConfirmPage() {
  return (
    <>
      <h1 className="font-display text-3xl">Check your inbox.</h1>
      <p className="mt-3 text-sm leading-relaxed text-paper-300">
        We&apos;ve sent you a confirmation link. Click it and you&apos;ll be able
        to sign in and pick your cause.
      </p>
      <p className="mt-4 text-sm leading-relaxed text-ink-500">
        Nothing there after a minute or two? Check spam — confirmation mail has a
        habit of ending up there.
      </p>
      <Link href="/login" className="btn-ghost mt-8 w-full">
        Back to sign in
      </Link>
    </>
  );
}
