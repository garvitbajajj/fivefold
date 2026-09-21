-- ---------------------------------------------------------------------------
-- Access helpers
-- ---------------------------------------------------------------------------
-- SECURITY DEFINER so the lookup bypasses RLS on profiles. Reading the role
-- inside a profiles policy would otherwise recurse into that same policy.
create function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- Real-time subscription check, used by policies and by the app on every
-- authenticated request. Period end is checked against now(), so a lapsed
-- subscription loses access the moment it expires without needing a cron job.
create function has_active_subscription(uid uuid default auth.uid()) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from subscriptions
    where user_id = uid
      and status = 'active'
      and current_period_end > now()
  );
$$;

alter table charities       enable row level security;
alter table charity_events  enable row level security;
alter table profiles        enable row level security;
alter table subscriptions   enable row level security;
alter table payments        enable row level security;
alter table scores          enable row level security;
alter table draws           enable row level security;
alter table draw_entries    enable row level security;
alter table winners         enable row level security;

-- Charities and their events are public content: anyone, signed in or not,
-- can browse the directory. Only admins change them.
create policy charities_public_read on charities
  for select using (is_active or is_admin());
create policy charities_admin_write on charities
  for all using (is_admin()) with check (is_admin());

create policy charity_events_public_read on charity_events
  for select using (true);
create policy charity_events_admin_write on charity_events
  for all using (is_admin()) with check (is_admin());

-- Profiles: own row, or any row for an admin.
create policy profiles_read_own on profiles
  for select using (id = auth.uid() or is_admin());
create policy profiles_update_own on profiles
  for update using (id = auth.uid() or is_admin());
create policy profiles_admin_all on profiles
  for all using (is_admin()) with check (is_admin());

-- Subscriptions and payments are written by SECURITY DEFINER functions, so
-- users get read-only access to their own rows.
create policy subscriptions_read_own on subscriptions
  for select using (user_id = auth.uid() or is_admin());
create policy subscriptions_admin_write on subscriptions
  for all using (is_admin()) with check (is_admin());

create policy payments_read_own on payments
  for select using (user_id = auth.uid() or is_admin());
create policy payments_admin_write on payments
  for all using (is_admin()) with check (is_admin());

-- Scores: a user manages their own, but only while subscribed. Admins may
-- edit anyone's, per the admin dashboard spec.
create policy scores_read_own on scores
  for select using (user_id = auth.uid() or is_admin());
create policy scores_insert_own on scores
  for insert with check (user_id = auth.uid() and has_active_subscription());
create policy scores_update_own on scores
  for update using (user_id = auth.uid() and has_active_subscription());
create policy scores_delete_own on scores
  for delete using (user_id = auth.uid() and has_active_subscription());
create policy scores_admin_all on scores
  for all using (is_admin()) with check (is_admin());

-- Draws: published results are public so visitors can see how the game works.
-- Drafts and simulations stay admin-only until published.
create policy draws_read_published on draws
  for select using (status = 'published' or is_admin());
create policy draws_admin_write on draws
  for all using (is_admin()) with check (is_admin());

create policy draw_entries_read_own on draw_entries
  for select using (
    is_admin() or (
      user_id = auth.uid()
      and exists (select 1 from draws d where d.id = draw_id and d.status = 'published')
    )
  );
create policy draw_entries_admin_write on draw_entries
  for all using (is_admin()) with check (is_admin());

-- Winners of a published draw are public (a winners board is part of the
-- product story); proof and verification notes are never exposed to the
-- client, the app selects only the safe columns.
create policy winners_read on winners
  for select using (
    is_admin() or user_id = auth.uid() or
    exists (select 1 from draws d where d.id = draw_id and d.status = 'published')
  );
-- A winner may attach their own proof, and nothing else.
create policy winners_update_own_proof on winners
  for update using (user_id = auth.uid() and verification_status <> 'approved');
create policy winners_admin_write on winners
  for all using (is_admin()) with check (is_admin());
