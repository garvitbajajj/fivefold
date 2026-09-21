import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
/**
 * Loads everything a signed-in page needs in one round trip, and redirects to
 * the login screen if there is no session.
 *
 * Subscription status is recomputed here rather than trusted from the stored
 * column, which is what the brief means by validating on every authenticated
 * request. `expire_lapsed_subscriptions` then writes that truth back so admin
 * reporting sees the same thing the user does.
 */
export async function requireSession(nextPath = "/dashboard") {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  await supabase.rpc("expire_lapsed_subscriptions");
  const [{ data: profile }, { data: subscription }] = await Promise.all([
    supabase.from("profiles").select("*, charities(*)").eq("id", user.id).single(),
    supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  if (!profile) redirect("/login");
  const { charities, ...rest } = profile;
  return {
    userId: user.id,
    email: user.email ?? "",
    profile: rest,
    charity: charities,
    subscription,
    isSubscribed:
      subscription?.status === "active" &&
      new Date(subscription.current_period_end) > new Date(),
    isAdmin: rest.role === "admin",
  };
}
/** Pages under /admin. The middleware already gates the route; this is the
 *  second line, in case a page is ever reached another way. */
export async function requireAdmin() {
  const session = await requireSession("/admin");
  if (!session.isAdmin) redirect("/dashboard");
  return session;
}
