-- ---------------------------------------------------------------------------
-- Subscription and payment engine
-- ---------------------------------------------------------------------------
-- Prices and the money split live here rather than in the app. A client can
-- ask to subscribe; it cannot say what that costs or where the money goes.
-- This also means the app needs no service-role key: every privileged write
-- happens inside a SECURITY DEFINER function that validates its own inputs.

-- Plan prices in pence. Yearly is twelve months for the price of ten.
create function plan_price(p_plan text) returns int
language sql immutable as $$
  select case p_plan when 'monthly' then 1200 when 'yearly' then 12000 end;
$$;

-- Fixed share of every payment that funds the prize pool, per PRD section 7.
create function prize_pool_share() returns int
language sql immutable as $$ select 50; $$;

-- Flip subscriptions whose paid period has run out. Cheap, indexed, and called
-- opportunistically on dashboard load, so 'active' in the table never drifts
-- from reality without needing a scheduled job.
create function expire_lapsed_subscriptions() returns void
language sql security definer set search_path = public as $$
  update subscriptions
  set status = case when cancel_at_period_end then 'cancelled' else 'lapsed' end
  where status = 'active' and current_period_end <= now();
$$;

-- ---------------------------------------------------------------------------
-- subscribe
-- ---------------------------------------------------------------------------
-- Creates a subscription and records the payment that funds it, splitting the
-- fee across charity, prize pool and platform in one transaction.
--
-- p_provider_ref carries the gateway's payment reference. The mock checkout
-- passes a simulated one; wiring Stripe means passing a real payment intent id
-- here and changing nothing else.
create function subscribe(
  p_plan            text,
  p_charity_id      uuid,
  p_charity_percent int  default 10,
  p_provider_ref    text default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_user     uuid := auth.uid();
  v_amount   int;
  v_charity  int;
  v_pool     int;
  v_sub      uuid;
begin
  if v_user is null then
    raise exception 'not signed in';
  end if;

  v_amount := plan_price(p_plan);
  if v_amount is null then
    raise exception 'unknown plan: %', p_plan;
  end if;

  if p_charity_percent not between 10 and 40 then
    raise exception 'charity share must be between 10%% and 40%%';
  end if;

  if not exists (select 1 from charities where id = p_charity_id and is_active) then
    raise exception 'charity not found';
  end if;

  -- Clear any previous subscription so the one-active-per-user index holds.
  update subscriptions set status = 'cancelled'
  where user_id = v_user and status = 'active';

  insert into subscriptions (user_id, plan, status, amount_pence, current_period_end)
  values (v_user, p_plan, 'active', v_amount,
          now() + case p_plan when 'yearly' then interval '1 year' else interval '1 month' end)
  returning id into v_sub;

  -- Floor each share, then give the rounding remainder to the platform, so the
  -- three parts always sum to exactly what was charged.
  v_charity := (v_amount * p_charity_percent) / 100;
  v_pool    := (v_amount * prize_pool_share()) / 100;

  insert into payments (user_id, subscription_id, kind, amount_pence, charity_id,
                        charity_pence, prize_pool_pence, platform_pence, provider_ref)
  values (v_user, v_sub, 'subscription', v_amount, p_charity_id,
          v_charity, v_pool, v_amount - v_charity - v_pool, p_provider_ref);

  -- Remember the choice so renewals and the dashboard reflect it.
  update profiles
  set charity_id = p_charity_id, charity_percent = p_charity_percent
  where id = v_user;

  return v_sub;
end;
$$;

-- ---------------------------------------------------------------------------
-- cancel_subscription
-- ---------------------------------------------------------------------------
-- Cancels at period end: the user keeps the access they already paid for and
-- stays in this month's draw. Immediate revocation would forfeit paid time.
create function cancel_subscription() returns void
language plpgsql security definer set search_path = public as $$
begin
  update subscriptions
  set cancel_at_period_end = true
  where user_id = auth.uid() and status = 'active';

  if not found then
    raise exception 'no active subscription to cancel';
  end if;
end;
$$;

-- Undo a pending cancellation while the period is still running.
create function resume_subscription() returns void
language plpgsql security definer set search_path = public as $$
begin
  update subscriptions
  set cancel_at_period_end = false
  where user_id = auth.uid() and status = 'active' and current_period_end > now();

  if not found then
    raise exception 'no subscription to resume';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- donate
-- ---------------------------------------------------------------------------
-- A one-off gift, entirely to the charity and entirely outside the game: it
-- adds nothing to the prize pool and buys no draw entry, per PRD section 8.1.
create function donate(p_charity_id uuid, p_amount_pence int, p_provider_ref text default null)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_id   uuid;
begin
  if v_user is null then
    raise exception 'not signed in';
  end if;
  if p_amount_pence < 100 then
    raise exception 'minimum donation is £1';
  end if;
  if not exists (select 1 from charities where id = p_charity_id and is_active) then
    raise exception 'charity not found';
  end if;

  insert into payments (user_id, kind, amount_pence, charity_id,
                        charity_pence, prize_pool_pence, platform_pence, provider_ref)
  values (v_user, 'donation', p_amount_pence, p_charity_id,
          p_amount_pence, 0, 0, p_provider_ref)
  returning id into v_id;

  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- update_charity_choice
-- ---------------------------------------------------------------------------
-- Applies from the next payment onward. Past splits are never rewritten.
create function update_charity_choice(p_charity_id uuid, p_charity_percent int)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_charity_percent not between 10 and 40 then
    raise exception 'charity share must be between 10%% and 40%%';
  end if;
  if not exists (select 1 from charities where id = p_charity_id and is_active) then
    raise exception 'charity not found';
  end if;

  update profiles
  set charity_id = p_charity_id, charity_percent = p_charity_percent
  where id = auth.uid();
end;
$$;
