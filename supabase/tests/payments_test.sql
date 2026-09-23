-- Payment recording self-check.
--
-- Exercises the functions the Stripe webhook calls, as the service role would:
-- a first payment, the same invoice delivered twice, a renewal after the
-- member changes cause, and a donation delivered twice. Runs inside one DO
-- block and raises at the end, so nothing it writes survives.
--
--   psql "$DATABASE_URL" -f supabase/tests/payments_test.sql
--
-- A clean run ends with: ERROR: payments self-check passed

do $$
declare
  v_user     uuid := '00000000-0000-4000-b000-000000000001';
  v_cause_a  uuid;
  v_cause_b  uuid;
  v_sub      uuid;
  v_again    uuid;
  v_count    int;
  p          payments%rowtype;
begin
  select id into v_cause_a from charities where is_active order by name limit 1;
  select id into v_cause_b from charities where is_active order by name offset 1 limit 1;

  insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                          email_confirmed_at, created_at, updated_at,
                          raw_app_meta_data, raw_user_meta_data)
  values (v_user, '00000000-0000-0000-0000-000000000000', 'authenticated',
          'authenticated', 'payments-test@fivefold.test', '', now(), now(), now(),
          '{}', '{}');

  -- 1. First invoice: carries the cause chosen at checkout.
  v_sub := record_subscription_invoice(
    v_user, 'monthly', 'sub_test_1', 'cus_test_1', 'in_test_1', 1200,
    now(), now() + interval '1 month', v_cause_a, 25);

  select * into p from payments where provider_ref = 'in_test_1';
  assert p.charity_id = v_cause_a, 'first payment should go to the cause chosen at checkout';
  assert p.charity_pence = 300, format('25%% of 1200 is 300, got %s', p.charity_pence);
  assert p.prize_pool_pence = 600, format('50%% of 1200 is 600, got %s', p.prize_pool_pence);
  assert p.platform_pence = 300, format('remainder should be 300, got %s', p.platform_pence);
  assert has_active_subscription(v_user), 'subscription should be active after first payment';
  assert (select stripe_customer_id from profiles where id = v_user) = 'cus_test_1',
    'profile should remember the Stripe customer';

  -- 2. Stripe delivers the same invoice again (webhook retry, or the success
  --    page and the webhook racing). Nothing new may be written.
  v_again := record_subscription_invoice(
    v_user, 'monthly', 'sub_test_1', 'cus_test_1', 'in_test_1', 1200,
    now(), now() + interval '1 month', v_cause_a, 25);

  select count(*) into v_count from payments where user_id = v_user;
  assert v_count = 1, format('duplicate invoice must not double-charge; %s payments', v_count);
  assert v_again = v_sub, 'duplicate invoice should return the same subscription';

  -- 3. The member switches cause and share; the renewal must follow the
  --    profile, not the original checkout.
  update profiles set charity_id = v_cause_b, charity_percent = 40 where id = v_user;

  perform record_subscription_invoice(
    v_user, 'monthly', 'sub_test_1', 'cus_test_1', 'in_test_2', 1200,
    now() + interval '1 month', now() + interval '2 months');

  select * into p from payments where provider_ref = 'in_test_2';
  assert p.charity_id = v_cause_b, 'renewal should go to the newly chosen cause';
  assert p.charity_pence = 480, format('40%% of 1200 is 480, got %s', p.charity_pence);
  assert p.subscription_id = v_sub, 'renewal should extend the same subscription';
  assert (select count(*) from subscriptions where user_id = v_user) = 1,
    'a renewal must not create a second subscription';
  assert (select current_period_end from subscriptions where id = v_sub)
         > now() + interval '1 month',
    'renewal should push the period end forward';

  -- 4. A donation, delivered twice. All of it to the charity, recorded once.
  perform record_donation(v_user, v_cause_a, 2500, 'cs_test_gift');
  perform record_donation(v_user, v_cause_a, 2500, 'cs_test_gift');

  select count(*) into v_count from payments where provider_ref = 'cs_test_gift';
  assert v_count = 1, 'duplicate donation must be recorded once';
  select * into p from payments where provider_ref = 'cs_test_gift';
  assert p.charity_pence = 2500 and p.prize_pool_pence = 0,
    'a donation goes entirely to the charity and never to the pool';

  -- 5. Neither function may be reached by a signed-in member.
  assert not has_function_privilege('authenticated',
    'record_subscription_invoice(uuid, text, text, text, text, int, timestamptz, timestamptz, uuid, int)',
    'execute'), 'members must not be able to record their own payments';
  assert not has_function_privilege('authenticated',
    'record_donation(uuid, uuid, int, text)', 'execute'),
    'members must not be able to record their own donations';

  -- Abort, so none of the above persists.
  raise exception 'payments self-check passed';
end $$;
