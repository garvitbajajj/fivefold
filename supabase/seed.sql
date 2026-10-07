-- Demo data for fivefold.
--
-- Run once on a fresh project, after every migration in supabase/migrations/:
--
--   psql "$DATABASE_URL" -f supabase/seed.sql
--
-- Creates:
--   - the two test logins          member@fivefold.app / admin@fivefold.app
--   - fourteen more members         with subscriptions, payments and scores
--   - last month's draw, published  with three winners, one of them paid
--   - this month's draw, simulated  left unpublished, so the review step shows
--
-- Every password is fivefold2026. Seeded subscriptions are not billed through
-- Stripe; anyone who subscribes through the site is.

-- Supabase Auth reads several token columns as strings, and four of them have
-- no default. A user inserted without them gets NULLs there and cannot sign in.
-- Auth also expects a matching identity row for the email provider.
create function pg_temp.seed_user(p_email text, p_name text, p_created timestamptz)
returns uuid
language plpgsql as $$
declare
  v_id uuid := gen_random_uuid();
begin
  insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                          email_confirmed_at, created_at, updated_at,
                          raw_app_meta_data, raw_user_meta_data,
                          confirmation_token, recovery_token,
                          email_change_token_new, email_change)
  values (v_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
          p_email, extensions.crypt('fivefold2026', extensions.gen_salt('bf')),
          now(), p_created, now(),
          '{"provider":"email","providers":["email"]}',
          jsonb_build_object('full_name', p_name, 'email_verified', true),
          '', '', '', '');

  insert into auth.identities (provider_id, user_id, identity_data, provider,
                               last_sign_in_at, created_at, updated_at)
  values (v_id::text, v_id,
          jsonb_build_object('sub', v_id::text, 'email', p_email,
                             'email_verified', true, 'phone_verified', false),
          'email', now(), now(), now());

  return v_id;
end;
$$;

do $$
declare
  v_last    date := (date_trunc('month', current_date) - interval '1 month')::date;
  v_this    date := date_trunc('month', current_date)::date;
  v_names   text[] := array['Priya Raman','Tom Okafor','Niamh Doyle','Ben Carter','Lucy Whitfield',
                            'Omar Haddad','Grace Lin','Callum Fraser','Ruth Adeyemi','Jonas Berg',
                            'Mira Patel','Dev Sharma','Ellie Novak','Marcus Webb'];
  v_admin    uuid;
  v_member   uuid;
  v_priya    uuid;
  v_tom      uuid;
  v_uid      uuid;
  v_sub      uuid;
  v_charity  uuid;
  v_plan     text;
  v_amount   int;
  v_pct      int;
  v_forecast int[];
  v_blanks   int[];
  v_draw     uuid;
  i          int;
  j          int;
begin
  if exists (select 1 from auth.users where email = 'admin@fivefold.app') then
    raise exception 'already seeded: admin@fivefold.app exists';
  end if;

  -- --------------------------------------------------------- test logins
  v_admin  := pg_temp.seed_user('admin@fivefold.app',  'Sam Reid',    now() - interval '40 days');
  v_member := pg_temp.seed_user('member@fivefold.app', 'Alex Morgan', now() - interval '40 days');
  update profiles set role = 'admin' where id = v_admin;

  -- ----------------------------------------------------- fourteen members
  for i in 1..array_length(v_names, 1) loop
    v_uid := pg_temp.seed_user(lower(replace(v_names[i], ' ', '.')) || '@fivefold.app',
                               v_names[i], v_last + (i || ' days')::interval);

    -- Spread across causes, plans and charity shares.
    select id into v_charity from charities where is_active
    order by md5(id::text || i::text) limit 1;
    v_plan   := case when i % 4 = 0 then 'yearly' else 'monthly' end;
    v_amount := plan_price(v_plan);
    v_pct    := (array[10,10,15,20,25,40])[1 + (i % 6)];

    update profiles set charity_id = v_charity, charity_percent = v_pct where id = v_uid;

    insert into subscriptions (user_id, plan, status, amount_pence,
                               current_period_start, current_period_end)
    values (v_uid, v_plan, 'active', v_amount, v_last,
            case v_plan when 'yearly' then v_last + interval '1 year'
                        else now() + interval '20 days' end)
    returning id into v_sub;

    -- Last month's payment funds last month's pool; monthly members renewed
    -- this month too.
    insert into payments (user_id, subscription_id, amount_pence, charity_id,
                          charity_pence, prize_pool_pence, platform_pence, paid_at, provider_ref)
    values (v_uid, v_sub, v_amount, v_charity,
            (v_amount * v_pct) / 100, (v_amount * 50) / 100,
            v_amount - (v_amount * v_pct) / 100 - (v_amount * 50) / 100,
            v_last + (i || ' days')::interval, 'seed_' || i || '_last');

    if v_plan = 'monthly' then
      insert into payments (user_id, subscription_id, amount_pence, charity_id,
                            charity_pence, prize_pool_pence, platform_pence, paid_at, provider_ref)
      values (v_uid, v_sub, v_amount, v_charity,
              (v_amount * v_pct) / 100, (v_amount * 50) / 100,
              v_amount - (v_amount * v_pct) / 100 - (v_amount * 50) / 100,
              v_this + interval '2 days', 'seed_' || i || '_this');
    end if;

    -- Five scores each, except the last two, left short to show that a
    -- partial ticket sits the month out.
    for j in 1..(case when i in (13, 14) then 3 else 5 end) loop
      insert into scores (user_id, value, played_on)
      values (v_uid, 1 + ((i * 7 + j * 11) % 45), current_date - (j * 3 + i % 4));
    end loop;
  end loop;

  select id into v_priya from profiles where full_name = 'Priya Raman';
  select id into v_tom   from profiles where full_name = 'Tom Okafor';

  -- ---------------------------------------- the two test logins subscribe
  select id into v_charity from charities where slug = 'mind-the-gap';
  update profiles set charity_id = v_charity, charity_percent = 25 where id = v_member;
  insert into subscriptions (user_id, plan, status, amount_pence, current_period_end)
  values (v_member, 'yearly', 'active', 12000, now() + interval '1 year')
  returning id into v_sub;
  insert into payments (user_id, subscription_id, amount_pence, charity_id,
                        charity_pence, prize_pool_pence, platform_pence, paid_at, provider_ref)
  values (v_member, v_sub, 12000, v_charity, 3000, 6000, 3000,
          v_this + interval '1 day', 'seed_member');

  select id into v_charity from charities where slug = 'the-long-walk';
  update profiles set charity_id = v_charity, charity_percent = 20 where id = v_admin;
  insert into subscriptions (user_id, plan, status, amount_pence, current_period_end)
  values (v_admin, 'monthly', 'active', 1200, now() + interval '25 days')
  returning id into v_sub;
  insert into payments (user_id, subscription_id, amount_pence, charity_id,
                        charity_pence, prize_pool_pence, platform_pence, paid_at, provider_ref)
  values (v_admin, v_sub, 1200, v_charity, 240, 600, 360,
          v_this + interval '1 day', 'seed_admin');

  -- ------------------------------------------------------ last month's draw
  -- The draw functions are admin-gated.
  perform set_config('request.jwt.claims',
                     json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);

  -- A real draw rarely produces winners from fifteen tickets. Seed the RNG,
  -- learn the numbers it will draw, and give three tickets realistic matches,
  -- so the demo shows a 4-match, a 3-match tier split two ways, and a
  -- jackpot rolling over.
  perform setseed(0.31);
  v_forecast := pick_random_numbers();
  v_blanks := array(select n from generate_series(1,45) n
                    where n <> all(v_forecast) order by n limit 3);

  delete from scores where user_id in (v_member, v_priya, v_tom);
  insert into scores (user_id, value, played_on) values
    -- Alex, the member login: three matches.
    (v_member, v_forecast[1], current_date - 1), (v_member, v_forecast[2], current_date - 2),
    (v_member, v_forecast[3], current_date - 3), (v_member, v_blanks[1],   current_date - 4),
    (v_member, v_blanks[2],   current_date - 5),
    -- Priya: four matches.
    (v_priya, v_forecast[1], current_date - 1), (v_priya, v_forecast[2], current_date - 2),
    (v_priya, v_forecast[3], current_date - 3), (v_priya, v_forecast[4], current_date - 4),
    (v_priya, v_blanks[3],   current_date - 5),
    -- Tom: three matches, splitting the tier with Alex.
    (v_tom, v_forecast[2], current_date - 1), (v_tom, v_forecast[3], current_date - 2),
    (v_tom, v_forecast[5], current_date - 3), (v_tom, v_blanks[1],   current_date - 4),
    (v_tom, v_blanks[2],   current_date - 5);

  perform setseed(0.31);
  v_draw := simulate_draw(v_last, 'random');
  if (select numbers from draws where id = v_draw) <> v_forecast then
    raise exception 'seeded draw did not reproduce the forecast';
  end if;
  perform publish_draw(v_draw);

  -- Alex's claim has been through the whole lifecycle: verified and paid.
  update winners
  set verification_status = 'approved', payment_status = 'paid', paid_at = now()
  where draw_id = v_draw and user_id = v_member;

  -- ------------------------------------------------------ this month's draw
  -- Simulated, never published: an admin can review it and press Publish.
  perform simulate_draw(v_this, 'random');

  raise notice 'seeded: 16 members, last month published (%), this month simulated',
    v_forecast;
end $$;
