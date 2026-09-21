-- ---------------------------------------------------------------------------
-- platform_stats
-- ---------------------------------------------------------------------------
-- Aggregates the homepage and admin dashboard both need. Returning totals from
-- a SECURITY DEFINER function keeps the payments table itself private: a
-- visitor can see that £4,210 has gone to charity without being able to read a
-- single payment row.
create function platform_stats() returns json
language sql stable security definer set search_path = public as $$
  select json_build_object(
    'total_users',        (select count(*) from profiles),
    'active_subscribers', (select count(*) from subscriptions
                           where status = 'active' and current_period_end > now()),
    'charity_total_pence',(select coalesce(sum(charity_pence), 0) from payments
                           where status = 'succeeded'),
    'donation_total_pence',(select coalesce(sum(amount_pence), 0) from payments
                           where status = 'succeeded' and kind = 'donation'),
    'pool_total_pence',   (select coalesce(sum(prize_pool_pence), 0) from payments
                           where status = 'succeeded'),
    'paid_out_pence',     (select coalesce(sum(prize_pence), 0) from winners
                           where payment_status = 'paid'),
    'current_pool_pence', pool_contributions_for(date_trunc('month', current_date)::date)
                          + jackpot_carry_before(date_trunc('month', current_date)::date),
    'draws_published',    (select count(*) from draws where status = 'published'),
    'winners_total',      (select count(*) from winners w
                           join draws d on d.id = w.draw_id where d.status = 'published'),
    'charities_count',    (select count(*) from charities where is_active)
  );
$$;

grant execute on function platform_stats() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- charity_totals
-- ---------------------------------------------------------------------------
-- Per-charity raised amounts, for the directory and each charity profile.
-- Same reasoning: totals are public, the rows behind them are not.
create function charity_totals() returns table (charity_id uuid, raised_pence bigint, supporters bigint)
language sql stable security definer set search_path = public as $$
  select p.charity_id,
         coalesce(sum(p.charity_pence), 0) as raised_pence,
         count(distinct p.user_id)         as supporters
  from payments p
  where p.status = 'succeeded' and p.charity_id is not null
  group by p.charity_id;
$$;

grant execute on function charity_totals() to anon, authenticated;
