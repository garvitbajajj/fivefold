-- ---------------------------------------------------------------------------
-- Real payments via Stripe
-- ---------------------------------------------------------------------------
-- Until now a member could activate a subscription by calling subscribe()
-- directly — the checkout screen was decoration. From here on, nothing is
-- written to the ledger until Stripe confirms the money arrived, and the only
-- code that can write it runs on the server with the service role, in
-- response to a signed Stripe event or a server-side check of a Checkout
-- Session.

alter table profiles      add column stripe_customer_id text;
alter table subscriptions add column stripe_subscription_id text unique;
alter table subscriptions add column stripe_customer_id text;

-- Stripe delivers events at least once, and the success page verifies the
-- same payment the webhook does. The gateway reference is the natural
-- idempotency key: one invoice or session can only ever produce one payment.
create unique index payments_provider_ref_unique
  on payments (provider_ref) where provider_ref is not null;

-- ---------------------------------------------------------------------------
-- The old direct paths are gone
-- ---------------------------------------------------------------------------
-- Each of these let a signed-in user change their paid status without paying,
-- or without Stripe knowing. Cancelling now goes through Stripe, and Stripe's
-- event brings the change back here.
drop function subscribe(text, uuid, int, text);
drop function donate(uuid, int, text);
drop function cancel_subscription();
drop function resume_subscription();

-- ---------------------------------------------------------------------------
-- record_subscription_invoice
-- ---------------------------------------------------------------------------
-- Called once per paid Stripe invoice: the first payment of a new
-- subscription, and every renewal after it. Activates or extends the
-- subscription and writes the split payment, atomically.
--
-- Charity arguments are passed only for the first invoice, carrying the choice
-- the member made at checkout. Renewals split using whatever the profile says
-- at that moment, which is what "changes apply from your next payment" means.
create function record_subscription_invoice(
  p_user_id                uuid,
  p_plan                   text,
  p_stripe_subscription_id text,
  p_stripe_customer_id     text,
  p_invoice_id             text,
  p_amount_pence           int,
  p_period_start           timestamptz,
  p_period_end             timestamptz,
  p_charity_id             uuid default null,
  p_charity_percent        int  default null
) returns uuid
language plpgsql set search_path = public as $$
declare
  v_sub     uuid;
  v_charity uuid;
  v_pct     int;
  v_share   int;
  v_pool    int;
begin
  if p_plan not in ('monthly', 'yearly') then
    raise exception 'unknown plan: %', p_plan;
  end if;

  -- Already recorded: a retried webhook, or the success page got here first.
  select subscription_id into v_sub from payments where provider_ref = p_invoice_id;
  if found then
    return v_sub;
  end if;

  if p_charity_id is not null then
    if p_charity_percent not between 10 and 40 then
      raise exception 'charity share must be between 10%% and 40%%';
    end if;
    update profiles
    set charity_id = p_charity_id, charity_percent = p_charity_percent
    where id = p_user_id;
  end if;

  update profiles set stripe_customer_id = p_stripe_customer_id where id = p_user_id;

  select charity_id, charity_percent into v_charity, v_pct
  from profiles where id = p_user_id;
  if v_charity is null then
    raise exception 'member % has no charity to split the payment with', p_user_id;
  end if;

  -- A member re-subscribing replaces whatever was active before, so the
  -- one-active-subscription index holds.
  update subscriptions set status = 'cancelled'
  where user_id = p_user_id and status = 'active'
    and stripe_subscription_id is distinct from p_stripe_subscription_id;

  insert into subscriptions (user_id, plan, status, amount_pence,
                             current_period_start, current_period_end,
                             stripe_subscription_id, stripe_customer_id)
  values (p_user_id, p_plan, 'active', p_amount_pence,
          p_period_start, p_period_end,
          p_stripe_subscription_id, p_stripe_customer_id)
  on conflict (stripe_subscription_id) do update set
    status               = 'active',
    plan                 = excluded.plan,
    amount_pence         = excluded.amount_pence,
    current_period_start = excluded.current_period_start,
    current_period_end   = excluded.current_period_end
  returning id into v_sub;

  if p_amount_pence > 0 then
    -- Same rule as ever: floor each share, remainder to the platform, so the
    -- split balances to the penny and the CHECK constraint is satisfied.
    v_share := (p_amount_pence * v_pct) / 100;
    v_pool  := (p_amount_pence * prize_pool_share()) / 100;

    insert into payments (user_id, subscription_id, kind, amount_pence, charity_id,
                          charity_pence, prize_pool_pence, platform_pence, provider_ref)
    values (p_user_id, v_sub, 'subscription', p_amount_pence, v_charity,
            v_share, v_pool, p_amount_pence - v_share - v_pool, p_invoice_id)
    on conflict (provider_ref) where provider_ref is not null do nothing;
  end if;

  return v_sub;
end;
$$;

-- ---------------------------------------------------------------------------
-- record_donation
-- ---------------------------------------------------------------------------
-- A confirmed one-off gift. All of it to the charity; none to the pool.
create function record_donation(
  p_user_id      uuid,
  p_charity_id   uuid,
  p_amount_pence int,
  p_session_id   text
) returns void
language sql set search_path = public as $$
  insert into payments (user_id, kind, amount_pence, charity_id,
                        charity_pence, prize_pool_pence, platform_pence, provider_ref)
  values (p_user_id, 'donation', p_amount_pence, p_charity_id,
          p_amount_pence, 0, 0, p_session_id)
  on conflict (provider_ref) where provider_ref is not null do nothing;
$$;

-- Server-only. Neither visitors nor members can reach these over the API.
revoke all on function record_subscription_invoice(uuid, text, text, text, text, int,
  timestamptz, timestamptz, uuid, int) from public, anon, authenticated;
revoke all on function record_donation(uuid, uuid, int, text) from public, anon, authenticated;
grant execute on function record_subscription_invoice(uuid, text, text, text, text, int,
  timestamptz, timestamptz, uuid, int) to service_role;
grant execute on function record_donation(uuid, uuid, int, text) to service_role;
