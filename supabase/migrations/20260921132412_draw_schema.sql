-- ---------------------------------------------------------------------------
-- Draws
-- ---------------------------------------------------------------------------
-- One draw per calendar month. Five numbers are drawn from 1-45, the same
-- range as a Stableford score, and matched against each subscriber's five
-- stored scores.
--
-- mode:
--   random   - uniform pick, standard lottery
--   weighted - each of the 45 balls is weighted by how often that score
--              appears across all active subscribers' entries
--
-- status flows draft -> simulated -> published. A simulation writes entries
-- and provisional winners so an admin can inspect the outcome; publishing
-- freezes it and makes it visible to users.
create table draws (
  id                  uuid primary key default gen_random_uuid(),
  period              date not null unique,  -- always the 1st of the month
  mode                text not null default 'random' check (mode in ('random','weighted')),
  status              text not null default 'draft' check (status in ('draft','simulated','published')),
  numbers             int[] check (array_length(numbers, 1) = 5),
  -- Money snapshot, frozen when the draw is simulated so results reproduce.
  pool_pence          int not null default 0 check (pool_pence >= 0),
  carry_in_pence      int not null default 0 check (carry_in_pence >= 0),  -- jackpot rolled in
  carry_out_pence     int not null default 0 check (carry_out_pence >= 0), -- jackpot rolling on
  entrant_count       int not null default 0,
  simulated_at        timestamptz,
  published_at        timestamptz,
  created_at          timestamptz not null default now()
);

-- Draw numbers must be five distinct values in range.
create function draw_numbers_valid(n int[]) returns boolean
language sql immutable as $$
  select n is null or (
    array_length(n, 1) = 5
    and (select count(distinct x) from unnest(n) x) = 5
    and (select bool_and(x between 1 and 45) from unnest(n) x)
  );
$$;
alter table draws add constraint draws_numbers_distinct_in_range
  check (draw_numbers_valid(numbers));

-- ---------------------------------------------------------------------------
-- Draw entries
-- ---------------------------------------------------------------------------
-- A frozen snapshot of the five scores a user held when the draw ran. Scores
-- keep rolling after the draw, so the entry cannot reference the live rows or
-- past results would silently change.
create table draw_entries (
  id          uuid primary key default gen_random_uuid(),
  draw_id     uuid not null references draws(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  numbers     int[] not null check (array_length(numbers, 1) = 5),
  match_count int  not null default 0 check (match_count between 0 and 5),
  created_at  timestamptz not null default now(),
  unique (draw_id, user_id)
);
create index on draw_entries (draw_id, match_count desc);
create index on draw_entries (user_id);

-- ---------------------------------------------------------------------------
-- Winners
-- ---------------------------------------------------------------------------
-- Created for every entry matching 3+. Prize is the tier pool split equally
-- among that tier's winners.
--
-- Two independent state machines, per the PRD:
--   verification: pending -> approved | rejected   (admin reviews score proof)
--   payment:      pending -> paid                  (only after approval)
create table winners (
  id                  uuid primary key default gen_random_uuid(),
  draw_id             uuid not null references draws(id) on delete cascade,
  entry_id            uuid not null references draw_entries(id) on delete cascade,
  user_id             uuid not null references auth.users(id) on delete cascade,
  tier                int  not null check (tier in (3,4,5)),
  prize_pence         int  not null check (prize_pence >= 0),
  proof_url           text,
  verification_status text not null default 'pending' check (verification_status in ('pending','approved','rejected')),
  verification_note   text,
  payment_status      text not null default 'pending' check (payment_status in ('pending','paid')),
  paid_at             timestamptz,
  created_at          timestamptz not null default now(),
  unique (draw_id, user_id),
  -- A prize can only be marked paid once the proof has been approved.
  constraint winners_paid_requires_approval
    check (payment_status = 'pending' or verification_status = 'approved')
);
create index on winners (draw_id, tier);
create index on winners (user_id);
create index on winners (verification_status) where verification_status = 'pending';
