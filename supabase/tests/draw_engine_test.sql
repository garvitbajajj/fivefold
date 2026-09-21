-- Draw engine self-check.
--
-- Two phases:
--   Phase 1 checks eligibility and the invariants that must hold for any draw.
--   Phase 2 seeds the RNG, learns the numbers in advance, and rigs the scores
--           so the tier split, equal division and jackpot rules are exercised
--           against exact expected pence.
--
-- Everything runs inside one DO block, so a failed assertion rolls the whole
-- thing back; fixtures are deleted on success.
--
--   Run with:  psql "$DATABASE_URL" -f supabase/tests/draw_engine_test.sql
--   or paste into the Supabase SQL editor.

do $$
declare
  v_admin    uuid := '00000000-0000-4000-a000-000000000001';
  v_u1       uuid := '00000000-0000-4000-a000-000000000011';
  v_u2       uuid := '00000000-0000-4000-a000-000000000012';
  v_u3       uuid := '00000000-0000-4000-a000-000000000013';
  v_partial  uuid := '00000000-0000-4000-a000-000000000014';  -- only 3 scores
  v_lapsed   uuid := '00000000-0000-4000-a000-000000000015';  -- 5 scores, no active sub
  v_period   date := date_trunc('month', current_date)::date;
  v_draw     uuid;
  d          draws%rowtype;
  v_got      int;
  v_expected int;
  v_tier     int;
  v_pot      int;
  v_forecast int[];
  v_others   int[];
begin
  -- ---------------------------------------------------------------- fixtures
  insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                          email_confirmed_at, created_at, updated_at,
                          raw_app_meta_data, raw_user_meta_data)
  select uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
         'test-' || uid || '@fivefold.test', '', now(), now(), now(), '{}', '{}'
  from unnest(array[v_admin, v_u1, v_u2, v_u3, v_partial, v_lapsed]) uid;

  update profiles set role = 'admin' where id = v_admin;

  -- Active subscribers. v_lapsed's period has already ended, so
  -- has_active_subscription() rejects it with no cron job involved.
  insert into subscriptions (user_id, plan, status, amount_pence, current_period_end)
  select uid, 'monthly', 'active', 1200, now() + interval '30 days'
  from unnest(array[v_u1, v_u2, v_u3, v_partial]) uid;

  insert into subscriptions (user_id, plan, status, amount_pence, current_period_end)
  values (v_lapsed, 'monthly', 'lapsed', 1200, now() - interval '2 days');

  -- Prize-pool contributions this month: 3 x 600p = 1800p.
  insert into payments (user_id, amount_pence, charity_pence, prize_pool_pence, platform_pence, paid_at)
  select uid, 1200, 120, 600, 480, v_period + interval '2 days'
  from unnest(array[v_u1, v_u2, v_u3]) uid;

  -- Five scores each. v_u1 holds a duplicate (17 twice) to exercise the
  -- distinct-value matching rule.
  insert into scores (user_id, value, played_on) values
    (v_u1, 17, current_date - 1), (v_u1, 17, current_date - 2), (v_u1,  4, current_date - 3),
    (v_u1, 33, current_date - 4), (v_u1, 41, current_date - 5),
    (v_u2,  9, current_date - 1), (v_u2, 14, current_date - 2), (v_u2, 22, current_date - 3),
    (v_u2, 31, current_date - 4), (v_u2, 45, current_date - 5),
    (v_u3,  1, current_date - 1), (v_u3,  8, current_date - 2), (v_u3, 19, current_date - 3),
    (v_u3, 27, current_date - 4), (v_u3, 38, current_date - 5),
    (v_lapsed, 5, current_date - 1), (v_lapsed, 11, current_date - 2), (v_lapsed, 20, current_date - 3),
    (v_lapsed, 29, current_date - 4), (v_lapsed, 36, current_date - 5),
    -- Partial set: three scores, cannot form a ticket.
    (v_partial, 2, current_date - 1), (v_partial, 13, current_date - 2), (v_partial, 25, current_date - 3);

  -- Act as the admin, since the draw functions are admin-gated.
  perform set_config('request.jwt.claims',
                     json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);

  -- ================================================================ PHASE 1
  -- Invariants that hold for any random draw.
  v_draw := simulate_draw(v_period, 'random');
  select * into d from draws where id = v_draw;

  -- 1. Eligibility: five scores AND an active subscription.
  assert d.entrant_count = 3, format('expected 3 entrants, got %s', d.entrant_count);
  assert not exists (select 1 from draw_entries e where e.draw_id = d.id and e.user_id = v_partial),
    'user with fewer than 5 scores must not be entered';
  assert not exists (select 1 from draw_entries e where e.draw_id = d.id and e.user_id = v_lapsed),
    'user without an active subscription must not be entered';

  -- 2. Numbers are five distinct values in range.
  assert array_length(d.numbers, 1) = 5, 'draw must contain 5 numbers';
  assert (select count(distinct x) from unnest(d.numbers) x) = 5, 'draw numbers must be distinct';
  assert (select bool_and(x between 1 and 45) from unnest(d.numbers) x), 'draw numbers out of range';

  -- 3. Pool accounting.
  assert d.pool_pence = 1800 + d.carry_in_pence,
    format('pool %s should equal 1800 contributions + %s carry', d.pool_pence, d.carry_in_pence);

  -- 4. Match counts recomputed independently, counting distinct values only.
  for v_got, v_expected in
    select e.match_count,
           (select count(distinct v) from unnest(e.numbers) v where v = any(d.numbers))
    from draw_entries e where e.draw_id = d.id
  loop
    assert v_got = v_expected, format('match_count %s disagrees with recount %s', v_got, v_expected);
  end loop;

  -- 5. A winner exists for every 3+ match and for nothing else.
  assert (select count(*) from draw_entries e where e.draw_id = d.id and e.match_count >= 3)
       = (select count(*) from winners w where w.draw_id = d.id),
    'winners must correspond exactly to entries matching 3 or more';

  -- 6. Publishing freezes the reviewed result rather than redrawing it.
  perform publish_draw(v_draw);
  assert (select numbers from draws where id = v_draw) = d.numbers,
    'publishing must not change the drawn numbers';
  assert (select status from draws where id = v_draw) = 'published', 'draw should be published';

  -- Clear phase 1 so the same period can be redrawn (cascades to entries/winners).
  delete from draws where id = v_draw;

  -- ================================================================ PHASE 2
  -- Exact payout arithmetic. random() is seeded, so the same seed produces the
  -- same 45-row ordering inside pick_random_numbers() and the draw is known in
  -- advance. If Postgres ever changes that ordering the assertion below fails
  -- loudly rather than silently weakening the test.
  perform setseed(0.5);
  v_forecast := pick_random_numbers();

  -- Two numbers that are deliberately NOT in the draw.
  v_others := array(select n from generate_series(1,45) n
                    where n <> all(v_forecast) order by n limit 2);

  delete from scores where user_id in (v_u1, v_u2, v_u3);

  -- v_u1 and v_u2 hold all five drawn numbers  -> tier 5, prize split in half.
  insert into scores (user_id, value, played_on)
  select uid, v_forecast[i], current_date - i
  from unnest(array[v_u1, v_u2]) uid, generate_series(1,5) i;

  -- v_u3 holds three of them plus two blanks   -> tier 3, sole winner.
  insert into scores (user_id, value, played_on) values
    (v_u3, v_forecast[1], current_date - 1),
    (v_u3, v_forecast[2], current_date - 2),
    (v_u3, v_forecast[3], current_date - 3),
    (v_u3, v_others[1],   current_date - 4),
    (v_u3, v_others[2],   current_date - 5);

  perform setseed(0.5);
  v_draw := simulate_draw(v_period, 'random');
  select * into d from draws where id = v_draw;

  assert d.numbers = v_forecast,
    format('seeded draw %s did not match forecast %s', d.numbers, v_forecast);
  assert d.pool_pence = 1800, format('expected pool 1800p, got %s', d.pool_pence);

  -- Tier 5: pot is 40%% of 1800 = 720p, two winners, 360p each.
  assert (select count(*) from winners w where w.draw_id = d.id and w.tier = 5) = 2,
    'expected two jackpot winners';
  assert (select distinct prize_pence from winners w where w.draw_id = d.id and w.tier = 5) = 360,
    'jackpot should split equally at 360p each';

  -- Tier 3: pot is 25%% of 1800 = 450p, one winner takes it all.
  assert (select count(*) from winners w where w.draw_id = d.id and w.tier = 3) = 1,
    'expected one 3-match winner';
  assert (select prize_pence from winners w where w.draw_id = d.id and w.tier = 3) = 450,
    'sole 3-match winner should take the whole 450p tier pot';

  -- Tier 4 had no winners, and only the jackpot ever rolls over.
  assert not exists (select 1 from winners w where w.draw_id = d.id and w.tier = 4),
    'no 4-match winners were set up';
  assert d.carry_out_pence = 0, 'jackpot was won, nothing should roll over';

  -- No tier may overpay its share of the pool.
  foreach v_tier in array array[5,4,3] loop
    v_pot := (d.pool_pence * case v_tier when 5 then 40 when 4 then 35 else 25 end) / 100;
    assert coalesce((select sum(prize_pence) from winners w
                     where w.draw_id = d.id and w.tier = v_tier), 0) <= v_pot,
      format('tier %s paid out more than its pot of %s', v_tier, v_pot);
  end loop;

  -- A prize cannot be marked paid before the proof is approved.
  begin
    update winners set payment_status = 'paid'
    where draw_id = d.id and verification_status = 'pending';
    assert false, 'payment_status should not reach paid while verification is pending';
  exception when check_violation then
    null;  -- expected
  end;

  -- ================================================================ rollover
  -- Strip every match so the jackpot goes unclaimed, and check it rolls.
  delete from draws where id = v_draw;
  delete from scores where user_id in (v_u1, v_u2, v_u3);
  insert into scores (user_id, value, played_on)
  select uid, v_others[1] + i, current_date - i
  from unnest(array[v_u1, v_u2, v_u3]) uid, generate_series(1,5) i
  where v_others[1] + i <> all(v_forecast);

  perform setseed(0.5);
  v_draw := simulate_draw(v_period, 'random');
  select * into d from draws where id = v_draw;

  assert not exists (select 1 from winners w where w.draw_id = d.id and w.tier = 5),
    'rollover case should have no jackpot winner';
  assert d.carry_out_pence = (d.pool_pence * 40) / 100,
    format('unclaimed jackpot should roll over 40%% of pool, got %s', d.carry_out_pence);

  -- ---------------------------------------------------------------- teardown
  delete from draws where id = v_draw;
  delete from auth.users
   where id in (v_admin, v_u1, v_u2, v_u3, v_partial, v_lapsed);

  raise notice 'draw engine self-check passed (drawn %, pool %p)', v_forecast, 1800;
end $$;
