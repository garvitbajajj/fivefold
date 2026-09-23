# fivefold

A subscription platform where your last five golf scores are your lottery
ticket, and a share of every payment goes to a charity you choose.

Built against the Digital Heroes PRD (Level 1), 2026 edition.

---

## The central interpretation

The PRD never says users pick lottery numbers. But three facts sit next to each
other in the brief:

- a Stableford score runs **1–45**
- a member holds exactly **five** scores
- draws match **5, 4 or 3 numbers**

That is a 5-from-45 lottery in which **your last five rounds are the ticket**.
Nobody picks numbers; you play golf and you are entered automatically. This
reading also explains what "algorithmic draw weighted by score frequency"
means: weight the 45 balls by how often each score appears across all members'
scorecards.

Every other decision in this codebase follows from that one. If it is wrong,
the draw engine is wrong — so it is stated here first.

---

## Test credentials

| Role | Email | Password |
| --- | --- | --- |
| Member | `member@fivefold.app` | `fivefold2026` |
| Admin | `admin@fivefold.app` | `fivefold2026` |

The member account has a full five-score ticket, an active yearly subscription
at a 25% charity share, and a £30.75 win from the August draw that has been
verified and paid — so the whole winner lifecycle is visible without setting
anything up.

Fourteen further members are seeded with subscriptions, payments spread across
all eight charities, and scores. Two of them deliberately hold fewer than five
scores, to show that a partial ticket sits the month out.

**September's draw is left simulated but unpublished on purpose**, so the
review-before-publish step can be seen and the Publish button actually does
something.

---

## Stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16, App Router, Server Components and Server Actions |
| Language | JavaScript |
| UI | React 19, Tailwind CSS 4 |
| Motion | CSS keyframes and one IntersectionObserver |
| Database | Supabase Postgres 17 |
| Auth | Supabase Auth, cookie sessions |
| Storage | Supabase Storage, private bucket for winner proof |
| Payments | Stripe Checkout (test mode), confirmed by signed webhook |
| Hosting | Vercel |

Three runtime dependencies: `@supabase/supabase-js`, `@supabase/ssr` and `stripe`.

No component library, no form library, no state manager, no animation library.
Server Actions handle forms, the URL and the database hold the state, and CSS
does the animation. Every dependency is something that can break during a
deploy.

---

## Architecture

### Business logic lives in Postgres

The draw engine, the money split, prices, the rolling-five rule and the
prize-payment gate are all SQL functions, triggers and constraints — not
application code.

A draw runs as a **single atomic transaction**: entries, match counts, tier
splits and jackpot rollover either all land or none do. A half-run draw would
be unrecoverable. It also means no client, present or future, can bypass the
rules, and the admin panel is a thin UI over two functions.

### Payments: nothing activates until Stripe says so

Clicking **Continue to payment** writes nothing. It creates a Stripe Checkout
Session and redirects to Stripe's hosted page; card details never touch this
app. The subscription does not exist in the database until Stripe confirms the
first invoice is paid.

Confirmation arrives two ways, and both call the same functions:

- **the webhook** (`/api/stripe/webhook`), signature-verified, for every paid
  invoice — first payments *and* renewals nobody is watching — plus
  cancellations, failed renewals and donations
- **the success page**, which fetches the Checkout Session from Stripe
  server-side, so the member sees an active account immediately instead of
  waiting on a webhook

Every write is keyed on a Stripe id (`payments.provider_ref` is unique), so
whichever path lands second is a no-op, and Stripe's retries are harmless.
Arriving at the success URL proves nothing — anyone can type it — so the page
checks with Stripe and confirms the session belongs to the signed-in member.

Cancelling and resuming go to Stripe first, then update our row from Stripe's
reply, so the two can never disagree. Charity choice changes apply from the
next renewal: the first invoice uses the cause picked at checkout, renewals use
whatever the profile says at the time.

### One server-only key, for one job

The service-role key is used for exactly one thing: writing a payment Stripe
has confirmed. That write comes from a webhook with no signed-in user behind
it. `record_subscription_invoice` and `record_donation` are granted to the
service role alone — a member calling them from the browser gets `permission
denied`. The previous `subscribe()` and `donate()` functions, which let any
signed-in member activate a subscription without paying, were removed.

Every other privileged write — draws, winner reviews, payouts, role changes —
still goes through a `SECURITY DEFINER` function that checks the caller.

### Row level security on every table

Nine tables, all with RLS enabled. A member reads their own rows; an admin
reads all; a visitor sees published draws and active charities and nothing
else.

RLS decides *which rows* a user may update, not *which columns* — so members
also hold column-level `UPDATE` only on what they genuinely own:
`profiles.full_name`, and nothing on `winners`. (Without that, "update your own
profile" included setting your own `role` to `admin`, and "attach proof to your
own claim" included rewriting `prize_pence`. Both were reproduced and closed.) Aggregate figures reach the homepage through `platform_stats()`, so a
visitor can see that £144 has gone to charity without being able to read a
single payment row.

---

## Data model

| Table | Holds |
| --- | --- |
| `profiles` | Extends `auth.users`; role, chosen charity, charity share |
| `charities` | Directory entries, with a soft-delete flag |
| `charity_events` | Upcoming events on a charity profile |
| `subscriptions` | Plan, status, period, pending cancellation |
| `payments` | The money ledger — every split, frozen as taken |
| `scores` | The rolling five, 1–45, one per date |
| `draws` | One per month, with a frozen money snapshot |
| `draw_entries` | Snapshot of a member's five at draw time |
| `winners` | Tier, prize, proof, verification and payment state |

### Guarantees enforced by the database, not by code

- **The split always balances.** `charity_pence + prize_pool_pence +
  platform_pence = amount_pence`, as a `CHECK` constraint. A payment that does
  not account for every penny cannot be written.
- **One score per date.** `UNIQUE (user_id, played_on)`.
- **Scores are 1–45.** `CHECK (value between 1 and 45)`.
- **Only five scores survive.** An `AFTER INSERT` trigger drops the oldest when
  a sixth arrives, so the app, the admin editor, and anything added later all
  obey the rule without repeating it.
- **A prize cannot be paid before its proof is approved.** A `CHECK` constraint
  on `winners`, not a UI rule.
- **One active subscription per member.** A partial unique index.

### Why entries are snapshots

`draw_entries.numbers` copies the five scores a member held when the draw ran.
Scores keep rolling afterwards, so referencing the live rows would silently
rewrite past results.

---

## The draw engine

`simulate_draw(period, mode)` — admin only:

1. snapshots every eligible member (active subscription **and** five scores)
2. draws five numbers, random or score-weighted
3. counts matches over **distinct** values
4. freezes the pool: this month's contributions plus any jackpot carried in
5. splits 40 / 35 / 25 across the tiers, dividing each equally among its winners
6. rolls the jackpot forward if nobody matched five

`publish_draw(id)` freezes it and reveals it. It deliberately does **not**
redraw, so what is published is exactly what was reviewed.

A simulation can be re-run as often as you like; each run replaces the last.

### Two details worth noting

**Matches count distinct values.** A golfer who shot 30 twice holds four
distinct numbers, not five, and covers less of the board. That falls out of the
rules rather than being imposed.

**Weighted sampling uses the Efraimidis–Spirakis method** — take the five
smallest keys of `-ln(u)/w`. The obvious `ORDER BY random() * weight` is subtly
biased.

---

## Money

All amounts are integer **pence**. No floats anywhere.

| Slice | Share |
| --- | --- |
| Charity | 10–40%, chosen by the member |
| Prize pool | 50%, fixed |
| Platform | the remainder |

Each share is floored and the rounding remainder goes to the platform, so the
three parts always sum to exactly what was charged.

**Plans:** £12/month, £120/year (twelve months for the price of ten).

### Ambiguities resolved

- **The PRD sets a 10% charity floor but no ceiling.** Capped at 40%, so the
  floor plus the fixed 50% pool share can never exceed 100%.
- **Tiers 4 and 3 do not roll over.** Unclaimed money in those tiers stays in
  the platform float; only the jackpot carries forward.
- **Cancellation is never immediate.** A member keeps the time they paid for
  and stays in that month's draw. `cancelled` and `lapsed` are distinct states.
- **Charities are retired, not deleted,** once money has reached them — a hard
  delete would orphan the payment history behind every supporter's receipt.

---

## Local setup

```bash
npm install
cp .env.example .env.local   # fill in Supabase and Stripe keys
npm run dev
```

Apply the migrations in `supabase/migrations/` in filename order, either
through the Supabase SQL editor or with the CLI.

### Environment

| Variable | Where | Exposed to browser |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → API keys | yes, safe |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → API keys (publishable) | yes, safe |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → API keys (secret) | **never** |
| `STRIPE_SECRET_KEY` | Stripe → Developers → API keys (test) | **never** |
| `STRIPE_WEBHOOK_SECRET` | Stripe → Developers → Webhooks | **never** |

**Stripe webhook.** Add an endpoint at `https://<your-site>/api/stripe/webhook`
listening for `invoice.paid`, `customer.subscription.updated`,
`customer.subscription.deleted` and `checkout.session.completed`, then copy its
signing secret. Locally the success page confirms payments on its own; to
exercise renewals and cancellations too, run
`stripe listen --forward-to localhost:3000/api/stripe/webhook`.

**Test card:** `4242 4242 4242 4242`, any future expiry, any CVC.

**One Supabase setting matters.** Under Authentication → Sign In / Providers →
Email, turn **Confirm email off**. With it on, a new signup waits for a
confirmation link instead of reaching the dashboard.

---

## Tests

```bash
psql "$DATABASE_URL" -f supabase/tests/draw_engine_test.sql
psql "$DATABASE_URL" -f supabase/tests/payments_test.sql
```

The two money paths each have a real test.

**Payments** — calls the functions the Stripe webhook uses, as the service
role would: a first payment splits 25% / 50% / 25% to the penny; the same
invoice delivered twice writes one payment; a renewal after the member changes
cause and share follows the *new* choice and extends the same subscription; a
donation delivered twice is recorded once, entirely to the charity; and a
signed-in member cannot call either function.

**Draw engine** — two phases:

1. **Invariants** — eligibility, five distinct in-range numbers, pool
   accounting, and match counts recomputed independently against the engine's
   own output.
2. **Exact arithmetic** — the RNG is seeded so the numbers are known in
   advance, and a few tickets are rigged. It then asserts exact pence: two
   jackpot winners take 360p each, a sole 3-match winner takes the whole 450p
   tier, the payment gate rejects an unverified claim, and an unclaimed jackpot
   rolls over 40% of the pool.

Everything runs in one transaction, so a failed assertion rolls back and the
fixtures are removed on success.

---

## Verified end to end

Walked in a browser, not just compiled:

signup → subscribe with live split preview → five scores → duplicate-date
rejection → rolling-five drop → admin promotion → live draw simulation →
proof upload → approve → mark paid.

August's seeded draw, £246.00 pool:

| Tier | Share | Outcome |
| --- | --- | --- |
| Match 5 | 40% | £98.40 unclaimed, rolled into September |
| Match 4 | 35% | £86.10 to a sole winner |
| Match 3 | 25% | £61.50 split — £30.75 each |

Sums to £246.00 exactly.

---

## Known limits

- **Stripe runs in test mode.** Real cards are declined; use `4242 4242 4242
  4242`. Going live is a key swap, not a code change.
- **Seeded demo members were never billed through Stripe.** Their
  subscriptions have no `stripe_subscription_id`; cancelling one updates the
  database alone. Anyone who subscribes through the site is fully on Stripe.
- **Refunds happen in the Stripe dashboard.** A refund doesn't yet reverse the
  split in the ledger; `charge.refunded` would be the event to handle.
- **Draws are run by hand.** The brief calls for a monthly cadence with admin
  control over publishing, so there is no cron. A scheduled job could call
  `simulate_draw` and leave it for review.
- **No email.** Winners see their status in the dashboard rather than being
  notified.
