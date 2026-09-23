-- ---------------------------------------------------------------------------
-- Column-level write privileges
-- ---------------------------------------------------------------------------
-- Row level security decides WHICH rows a user may update. It says nothing
-- about WHICH columns. The policy "a member may update their own profile"
-- therefore let a member run
--
--     update profiles set role = 'admin' where id = auth.uid()
--
-- from the browser console, and "a winner may attach proof to their own
-- claim" let them rewrite prize_pence to any amount before review. Both were
-- reproduced against this database before this migration was written.
--
-- The fix is the same for both: members get UPDATE on only the columns they
-- genuinely own, and every privileged change goes through a function that
-- checks who is asking — the pattern the draw engine already uses.

-- ------------------------------------------------------------------ profiles
-- A member may change their display name directly. Charity choice already
-- goes through update_charity_choice(), which validates it; role changes now
-- go through set_user_role(), which requires an admin.
revoke update on profiles from authenticated;
grant  update (full_name) on profiles to authenticated;

create function set_user_role(p_user_id uuid, p_role text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then
    raise exception 'admin only';
  end if;
  if p_role not in ('subscriber', 'admin') then
    raise exception 'unknown role: %', p_role;
  end if;
  -- Stops the last admin locking everyone out of the panel.
  if p_role = 'subscriber' and p_user_id = auth.uid()
     and (select count(*) from profiles where role = 'admin') = 1 then
    raise exception 'you are the only admin; promote someone else first';
  end if;

  update profiles set role = p_role where id = p_user_id;
end;
$$;

-- ------------------------------------------------------------------- winners
-- No direct writes at all. Each of the three things that can happen to a
-- claim is a function with its own rule about who may do it.
revoke update on winners from authenticated;
drop policy winners_update_own_proof on winners;

-- The winner attaches (or replaces) their screenshot. Re-submitting after a
-- rejection puts the claim back in the review queue.
create function attach_winner_proof(p_winner_id uuid, p_path text) returns void
language plpgsql security definer set search_path = public as $$
begin
  -- The storage policy only allows uploads into the caller's own folder, so a
  -- path outside it cannot point at a file they uploaded.
  if split_part(p_path, '/', 1) <> auth.uid()::text then
    raise exception 'that file is not yours to attach';
  end if;

  update winners
  set proof_url = p_path, verification_status = 'pending', verification_note = null
  where id = p_winner_id
    and user_id = auth.uid()
    and verification_status <> 'approved';

  if not found then
    raise exception 'no open claim to attach proof to';
  end if;
end;
$$;

create function review_winner(p_winner_id uuid, p_decision text, p_note text default null)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then
    raise exception 'admin only';
  end if;
  if p_decision not in ('approved', 'rejected') then
    raise exception 'decision must be approved or rejected';
  end if;
  if p_decision = 'rejected' and coalesce(trim(p_note), '') = '' then
    raise exception 'a rejection needs a reason the winner can act on';
  end if;

  update winners
  set verification_status = p_decision, verification_note = nullif(trim(p_note), '')
  where id = p_winner_id and payment_status = 'pending';

  if not found then
    raise exception 'claim not found, or already paid';
  end if;
end;
$$;

-- The winners_paid_requires_approval constraint still backs this up.
create function mark_winner_paid(p_winner_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then
    raise exception 'admin only';
  end if;

  update winners
  set payment_status = 'paid', paid_at = now()
  where id = p_winner_id and payment_status = 'pending';

  if not found then
    raise exception 'claim not found, or already paid';
  end if;
end;
$$;

revoke all on function set_user_role(uuid, text)             from public, anon;
revoke all on function attach_winner_proof(uuid, text)       from public, anon;
revoke all on function review_winner(uuid, text, text)       from public, anon;
revoke all on function mark_winner_paid(uuid)                from public, anon;
grant execute on function set_user_role(uuid, text)          to authenticated;
grant execute on function attach_winner_proof(uuid, text)    to authenticated;
grant execute on function review_winner(uuid, text, text)    to authenticated;
grant execute on function mark_winner_paid(uuid)             to authenticated;
