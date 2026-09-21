/** Money is stored as integer pence throughout. Format only at the edge. */
export function money(pence, opts = {}) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    notation: opts.compact && pence >= 100_000 ? "compact" : "standard",
    maximumFractionDigits: pence % 100 === 0 ? 0 : 2,
  }).format(pence / 100);
}
export function shortDate(iso) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
export function monthName(iso) {
  return new Date(iso).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}
/** "in 12 days" / "3 days ago" — used for renewal dates and event countdowns. */
export function relativeDays(iso) {
  const days = Math.round((new Date(iso).getTime() - Date.now()) / 86_400_000);
  if (days === 0) return "today";
  return new Intl.RelativeTimeFormat("en-GB", { numeric: "auto" }).format(days, "day");
}
/** The first of the current month, as a date string the draw engine accepts. */
export function currentPeriod() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}
export const PLAN_PRICE_PENCE = { monthly: 1200, yearly: 12000 };
/**
 * Mirrors the split performed by the `subscribe` SQL function so the checkout
 * screen can show the user exactly where their money goes before they commit.
 * The database remains the authority — this is for display only.
 */
export const PRIZE_POOL_SHARE = 50;
export function splitPayment(amountPence, charityPercent) {
  const charity = Math.floor((amountPence * charityPercent) / 100);
  const prizePool = Math.floor((amountPence * PRIZE_POOL_SHARE) / 100);
  return { charity, prizePool, platform: amountPence - charity - prizePool };
}
