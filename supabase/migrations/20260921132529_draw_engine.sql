-- ---------------------------------------------------------------------------
-- Draw engine
-- ---------------------------------------------------------------------------
-- Lives in the database rather than the app so a draw runs as one atomic
-- transaction: entries, matches, tier splits and rollover either all land or
-- none do. A half-run draw would be unrecoverable.

-- Uniform pick of 5 distinct numbers from 1-45.
create function pick_random_numbers() returns int[]
language sql volatile as $$
  select array(select n from generate_series(1,45) n order by random() limit 5);
$$;

-- Weighted pick: each ball's weight is 1 + how many times that score appears
-- across all eligible entrants, so numbers golfers actually shoot come up more
-- often. The +1 floor keeps every ball reachable.
--
-- Sampling without replacement uses the Efraimidis-Spirakis key
-- -ln(u)/w, taking the 5 smallest keys. Ordering by random()*weight would
-- be subtly biased.
create function pick_weighted_numbers(p_draw_id uuid) returns int[]
language sql volatile as $$
  with freq as (
    select n as value, count(*) as hits
    from draw_entries e, unnest(e.numbers) n
    where e.draw_id = p_draw_id
    group by n
  )
  select array(
    select b.n
    from generate_series(1,45) b(n)
    left join freq f on f.value = b.n
    order by -ln(random()) / (1 + coalesce(f.hits, 0))
    limit 5
  );
$$;

-- Prize-pool money contributed during a given month.
create function pool_contributions_for(p_period date) returns int
language sql stable as $$
  select coalesce(sum(prize_pool_pence), 0)::int
  from payments
  where status = 'succeeded'
    and paid_at >= p_period
    and paid_at <  (p_period + interval '1 month');
$$;

-- Jackpot carried forward from the most recent published draw that nobody won.
create function jackpot_carry_before(p_period date) returns int
language sql stable as $$
  select coalesce(
    (select carry_out_pence from draws
     where status = 'published' and period < p_period
     order by period desc limit 1),
    0);
$$;

-- ---------------------------------------------------------------------------
-- simulate_draw
-- ---------------------------------------------------------------------------
-- Builds (or rebuilds) a draw for a month without publishing it: snapshots
-- entrants, draws the numbers, scores the matches and works out every prize.
-- Admins can run this as often as they like to see what a draw would pay out;
-- each run replaces the previous simulation.
create function simulate_draw(p_period date, p_mode text default 'random')
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_draw_id  uuid;
  v_period   date := date_trunc('month', p_period)::date;
  v_carry    int;
  v_pool     int;
  v_numbers  int[];
  v_tier     int;
  v_tier_pot int;
  v_count    int;
begin
  if not is_admin() then
    raise exception 'admin only';
  end if;
  if p_mode not in ('random','weighted') then
    raise exception 'unknown draw mode: %', p_mode;
  end if;

  insert into draws (period, mode, status)
  values (v_period, p_mode, 'draft')
  on conflict (period) do update set mode = excluded.mode
  returning id into v_draw_id;

  if (select status from draws where id = v_draw_id) = 'published' then
    raise exception 'draw for % is already published', v_period;
  end if;

  -- Clear any previous simulation for this period.
  delete from winners      where draw_id = v_draw_id;
  delete from draw_entries where draw_id = v_draw_id;

  -- Entrants: active subscribers holding a full set of five scores. A partial
  -- set cannot form a ticket, so those users sit the month out.
  insert into draw_entries (draw_id, user_id, numbers)
  select v_draw_id, s.user_id, array_agg(s.value order by s.played_on desc)
  from scores s
  where has_active_subscription(s.user_id)
  group by s.user_id
  having count(*) = 5;

  -- Numbers. Weighted mode reads the entry snapshot above, so entries must
  -- already exist by this point.
  v_numbers := case p_mode
    when 'weighted' then pick_weighted_numbers(v_draw_id)
    else pick_random_numbers()
  end;

  -- Matches are counted over DISTINCT values: a golfer who shot 30 twice holds
  -- four distinct numbers, not five, and covers less of the board.
  update draw_entries e
  set match_count = (
    select count(distinct n) from unnest(e.numbers) n where n = any(v_numbers)
  )
  where e.draw_id = v_draw_id;

  v_carry := jackpot_carry_before(v_period);
  v_pool  := pool_contributions_for(v_period) + v_carry;

  update draws set
    numbers       = v_numbers,
    pool_pence    = v_pool,
    carry_in_pence = v_carry,
    carry_out_pence = 0,
    entrant_count = (select count(*) from draw_entries where draw_id = v_draw_id),
    status        = 'simulated',
    simulated_at  = now()
  where id = v_draw_id;

  -- Tier pots: 40 / 35 / 25 per the PRD, split equally inside a tier.
  -- Integer division floors each share, so the pot is never overpaid; the
  -- few remaining pence stay in the pool.
  foreach v_tier in array array[5,4,3] loop
    v_tier_pot := (v_pool * case v_tier when 5 then 40 when 4 then 35 else 25 end) / 100;

    select count(*) into v_count
    from draw_entries where draw_id = v_draw_id and match_count = v_tier;

    if v_count > 0 then
      insert into winners (draw_id, entry_id, user_id, tier, prize_pence)
      select v_draw_id, e.id, e.user_id, v_tier, v_tier_pot / v_count
      from draw_entries e
      where e.draw_id = v_draw_id and e.match_count = v_tier;
    elsif v_tier = 5 then
      -- Only the jackpot rolls over. Unclaimed 4- and 3-match money stays in
      -- the platform float, as the PRD marks those tiers non-rollover.
      update draws set carry_out_pence = v_tier_pot where id = v_draw_id;
    end if;
  end loop;

  return v_draw_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- publish_draw
-- ---------------------------------------------------------------------------
-- Freezes a simulated draw and reveals it to users. Deliberately does not
-- re-run the draw: publishing shows exactly what the admin reviewed.
create function publish_draw(p_draw_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then
    raise exception 'admin only';
  end if;

  if (select status from draws where id = p_draw_id) <> 'simulated' then
    raise exception 'only a simulated draw can be published';
  end if;

  update draws
  set status = 'published', published_at = now()
  where id = p_draw_id;
end;
$$;
