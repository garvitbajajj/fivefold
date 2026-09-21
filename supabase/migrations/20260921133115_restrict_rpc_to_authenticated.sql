-- Postgres grants EXECUTE to PUBLIC on every new function, and anon inherits
-- from PUBLIC, so revoking from anon alone achieves nothing. Revoke from
-- PUBLIC and grant back only to signed-in users.

revoke all on function subscribe(text, uuid, int, text)  from public;
revoke all on function donate(uuid, int, text)           from public;
revoke all on function cancel_subscription()             from public;
revoke all on function resume_subscription()             from public;
revoke all on function update_charity_choice(uuid, int)  from public;
revoke all on function expire_lapsed_subscriptions()     from public;
revoke all on function simulate_draw(date, text)         from public;
revoke all on function publish_draw(uuid)                from public;

grant execute on function subscribe(text, uuid, int, text) to authenticated;
grant execute on function donate(uuid, int, text)          to authenticated;
grant execute on function cancel_subscription()            to authenticated;
grant execute on function resume_subscription()            to authenticated;
grant execute on function update_charity_choice(uuid, int) to authenticated;
grant execute on function expire_lapsed_subscriptions()    to authenticated;

-- The draw functions stay authenticated-callable because admins are ordinary
-- signed-in users; both refuse anyone whose profile is not an admin.
grant execute on function simulate_draw(date, text) to authenticated;
grant execute on function publish_draw(uuid)        to authenticated;
