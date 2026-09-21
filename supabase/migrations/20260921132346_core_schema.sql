-- fivefold core schema
-- Money is stored in integer pence everywhere. Never floats.

-- ---------------------------------------------------------------------------
-- Charities
-- ---------------------------------------------------------------------------
create table charities (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,
  name        text not null,
  tagline     text not null,
  description text not null,
  category    text not null,
  image_url   text,
  is_featured boolean not null default false,  -- drives homepage spotlight
  is_active   boolean not null default true,   -- soft delete: keeps historical payment links intact
  created_at  timestamptz not null default now()
);

-- Upcoming events shown on a charity profile (golf days, fundraisers).
create table charity_events (
  id          uuid primary key default gen_random_uuid(),
  charity_id  uuid not null references charities(id) on delete cascade,
  title       text not null,
  description text,
  location    text,
  event_date  date not null,
  created_at  timestamptz not null default now()
);
create index on charity_events (charity_id, event_date);

-- ---------------------------------------------------------------------------
-- Profiles (extends auth.users)
-- ---------------------------------------------------------------------------
-- charity_percent is the share of the subscription fee the user directs to
-- their chosen charity. PRD sets a 10% floor; the 40% ceiling is ours, so that
-- floor + the fixed 50% prize-pool share can never exceed 100%.
create table profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  full_name       text,
  role            text not null default 'subscriber' check (role in ('subscriber','admin')),
  charity_id      uuid references charities(id) on delete set null,
  charity_percent int  not null default 10 check (charity_percent between 10 and 40),
  created_at      timestamptz not null default now()
);

-- Every new auth user gets a profile automatically.
create function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---------------------------------------------------------------------------
-- Subscriptions
-- ---------------------------------------------------------------------------
-- 'lapsed' = payment failed or period ended without renewal. Distinct from
-- 'cancelled', which the user chose. Both mean no access, but admin reporting
-- and win-back flows care about the difference.
create table subscriptions (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references auth.users(id) on delete cascade,
  plan                 text not null check (plan in ('monthly','yearly')),
  status               text not null check (status in ('active','cancelled','lapsed')),
  amount_pence         int  not null check (amount_pence > 0),
  current_period_start timestamptz not null default now(),
  current_period_end   timestamptz not null,
  cancel_at_period_end boolean not null default false,
  created_at           timestamptz not null default now()
);
create index on subscriptions (user_id, status);

-- One active subscription per user.
create unique index subscriptions_one_active_per_user
  on subscriptions (user_id) where status = 'active';

-- ---------------------------------------------------------------------------
-- Payments — the money ledger
-- ---------------------------------------------------------------------------
-- Each row records how one payment was split at the moment it was taken.
-- Splits are frozen here rather than recomputed, so later changes to a user's
-- charity choice never rewrite history. This table is the source of truth for
-- both the prize pool and charity contribution totals.
create table payments (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  subscription_id   uuid references subscriptions(id) on delete set null,
  kind              text not null default 'subscription' check (kind in ('subscription','donation')),
  amount_pence      int  not null check (amount_pence > 0),
  charity_id        uuid references charities(id) on delete set null,
  charity_pence     int  not null default 0 check (charity_pence >= 0),
  prize_pool_pence  int  not null default 0 check (prize_pool_pence >= 0),
  platform_pence    int  not null default 0 check (platform_pence >= 0),
  status            text not null default 'succeeded' check (status in ('succeeded','failed','refunded')),
  provider_ref      text,  -- Stripe payment intent id once a real gateway is wired
  paid_at           timestamptz not null default now(),
  -- The split must always account for the whole payment, to the penny.
  constraint payments_split_balances
    check (charity_pence + prize_pool_pence + platform_pence = amount_pence)
);
create index on payments (user_id, paid_at desc);
create index on payments (charity_id) where charity_id is not null;

-- ---------------------------------------------------------------------------
-- Scores — the user's lottery ticket
-- ---------------------------------------------------------------------------
-- Stableford points, 1-45. A user holds at most 5 at any time; these five
-- numbers are what a draw is matched against.
create table scores (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  value      int  not null check (value between 1 and 45),
  played_on  date not null check (played_on <= current_date),
  created_at timestamptz not null default now(),
  -- PRD: one entry per date. A second score for a date must be an edit.
  unique (user_id, played_on)
);
create index on scores (user_id, played_on desc);

-- Rolling window of 5: inserting a 6th score drops the one with the oldest
-- play date. Enforced in the database so no code path can bypass it.
create function trim_scores_to_five() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  delete from scores
  where user_id = new.user_id
    and id in (
      select id from scores
      where user_id = new.user_id
      order by played_on desc, created_at desc
      offset 5
    );
  return null;
end;
$$;

create trigger scores_trim_to_five
  after insert on scores
  for each row execute function trim_scores_to_five();
