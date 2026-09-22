-- Demo data for fivefold.
--
-- Creates fourteen members with subscriptions, payments spread across every
-- charity, and scores. Two of them deliberately hold fewer than five scores so
-- a partial ticket is visible in the admin panel.
--
-- Run AFTER the migrations, and after creating the two test accounts through
-- the signup form (member@fivefold.app and admin@fivefold.app) so their
-- passwords are hashed by Supabase Auth rather than here.
--
--   psql "$DATABASE_URL" -f supabase/seed.sql
--
-- Safe to skip entirely: the app works from an empty database, it just has
-- nothing to show.

do $$
declare
  v_admin   uuid;
  v_last    date := (date_trunc('month', current_date) - interval '1 month')::date;
  v_this    date := date_trunc('month', current_date)::date;
  v_names   text[] := array['Priya Raman','Tom Okafor','Niamh Doyle','Ben Carter','Lucy Whitfield',
                            'Omar Haddad','Grace Lin','Callum Fraser','Ruth Adeyemi','Jonas Berg',
                            'Mira Patel','Dev Sharma','Ellie Novak','Marcus Webb'];
  v_uid     uuid;
  v_sub     uuid;
  v_charity uuid;
  v_plan    text;
  v_amount  int;
  v_pct     int;
  i         int;
  j         int;
begin
  select id into v_admin from auth.users where email = 'admin@fivefold.app';
  if v_admin is null then
    raise exception 'create admin@fivefold.app through the signup form first';
  end if;
  update profiles set role = 'admin' where id = v_admin;

  for i in 1..array_length(v_names, 1) loop
    v_uid := gen_random_uuid();

    insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                            email_confirmed_at, created_at, updated_at,
                            raw_app_meta_data, raw_user_meta_data)
    values (v_uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
            lower(replace(v_names[i], ' ', '.')) || '@fivefold.app',
            crypt('fivefold2026', gen_salt('bf')),
            now(), v_last + (i || ' days')::interval, now(), '{}',
            json_build_object('full_name', v_names[i])::jsonb);

    -- Spread members across causes, plans and charity shares.
    select id into v_charity from charities where is_active order by md5(id::text || i::text) limit 1;
    v_plan   := case when i % 4 = 0 then 'yearly' else 'monthly' end;
    v_amount := case v_plan when 'yearly' then 12000 else 1200 end;
    v_pct    := (array[10,10,15,20,25,40])[1 + (i % 6)];

    update profiles set full_name = v_names[i], charity_id = v_charity, charity_percent = v_pct
    where id = v_uid;

    insert into subscriptions (user_id, plan, status, amount_pence,
                               current_period_start, current_period_end)
    values (v_uid, v_plan, 'active', v_amount, v_last,
            case v_plan when 'yearly' then v_last + interval '1 year'
                        else now() + interval '20 days' end)
    returning id into v_sub;

    -- Last month's payment funds last month's pool.
    insert into payments (user_id, subscription_id, amount_pence, charity_id,
                          charity_pence, prize_pool_pence, platform_pence, paid_at, provider_ref)
    values (v_uid, v_sub, v_amount, v_charity,
            (v_amount * v_pct) / 100, (v_amount * 50) / 100,
            v_amount - (v_amount * v_pct) / 100 - (v_amount * 50) / 100,
            v_last + (i || ' days')::interval, 'sim_seed_' || i);

    if v_plan = 'monthly' then
      insert into payments (user_id, subscription_id, amount_pence, charity_id,
                            charity_pence, prize_pool_pence, platform_pence, paid_at, provider_ref)
      values (v_uid, v_sub, v_amount, v_charity,
              (v_amount * v_pct) / 100, (v_amount * 50) / 100,
              v_amount - (v_amount * v_pct) / 100 - (v_amount * 50) / 100,
              v_this + interval '2 days', 'sim_renew_' || i);
    end if;

    -- Five scores each, except two members left short on purpose.
    if i not in (13, 14) then
      for j in 1..5 loop
        insert into scores (user_id, value, played_on)
        values (v_uid, 1 + ((i * 7 + j * 11) % 45), current_date - (j * 3 + i % 4));
      end loop;
    else
      for j in 1..3 loop
        insert into scores (user_id, value, played_on)
        values (v_uid, 1 + ((i * 5 + j * 9) % 45), current_date - (j * 4));
      end loop;
    end if;
  end loop;

  -- The admin plays too, so their own dashboard has something on it.
  select id into v_charity from charities where slug = 'the-long-walk';
  insert into subscriptions (user_id, plan, status, amount_pence, current_period_end)
  values (v_admin, 'monthly', 'active', 1200, now() + interval '25 days')
  returning id into v_sub;
  update profiles set charity_id = v_charity, charity_percent = 20 where id = v_admin;
  insert into payments (user_id, subscription_id, amount_pence, charity_id,
                        charity_pence, prize_pool_pence, platform_pence, paid_at, provider_ref)
  values (v_admin, v_sub, 1200, v_charity, 240, 600, 360, v_this + interval '1 day', 'sim_admin');

  raise notice 'seeded % members', array_length(v_names, 1);
end $$;
