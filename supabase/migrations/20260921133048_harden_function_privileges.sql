-- ---------------------------------------------------------------------------
-- Function hardening
-- ---------------------------------------------------------------------------
-- Every function gets a pinned search_path so it cannot be hijacked by a
-- caller-controlled schema, and the ones that are not part of the public API
-- have EXECUTE revoked from the PostgREST roles.

alter function plan_price(text)              set search_path = public;
alter function prize_pool_share()            set search_path = public;
alter function draw_numbers_valid(int[])     set search_path = public;
alter function pick_random_numbers()         set search_path = public;
alter function pick_weighted_numbers(uuid)   set search_path = public;
alter function pool_contributions_for(date)  set search_path = public;
alter function jackpot_carry_before(date)    set search_path = public;

-- Trigger functions are invoked by the trigger as the table owner and should
-- never be reachable over the REST API.
revoke all on function handle_new_user()      from public, anon, authenticated;
revoke all on function trim_scores_to_five()  from public, anon, authenticated;

-- Internals of the draw engine. simulate_draw is the only supported entry
-- point, and it is admin-gated.
revoke all on function pick_random_numbers()        from public, anon, authenticated;
revoke all on function pick_weighted_numbers(uuid)  from public, anon, authenticated;
revoke all on function pool_contributions_for(date) from public, anon, authenticated;
revoke all on function jackpot_carry_before(date)   from public, anon, authenticated;

-- Signed-in-only actions. Each already rejects an anonymous caller, but there
-- is no reason for the anon role to hold EXECUTE at all.
revoke all on function subscribe(text, uuid, int, text)  from anon;
revoke all on function donate(uuid, int, text)           from anon;
revoke all on function cancel_subscription()             from anon;
revoke all on function resume_subscription()             from anon;
revoke all on function update_charity_choice(uuid, int)  from anon;
revoke all on function expire_lapsed_subscriptions()     from anon;
revoke all on function simulate_draw(date, text)         from anon;
revoke all on function publish_draw(uuid)                from anon;

-- is_admin() and has_active_subscription() deliberately keep EXECUTE for both
-- roles: RLS policies call them as the querying user, so revoking would lock
-- every policy that depends on them.
