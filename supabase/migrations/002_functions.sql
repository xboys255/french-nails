-- Increment promo code usage
create or replace function increment_promo_usage(promo_id uuid)
returns void language plpgsql security definer as $$
begin
  update public.promo_codes set uses_count = uses_count + 1 where id = promo_id;
end;
$$;

-- Add loyalty points
create or replace function add_loyalty_points(
  p_client_id uuid,
  p_points int,
  p_appointment_id uuid,
  p_description text
) returns void language plpgsql security definer as $$
begin
  -- Upsert loyalty account
  insert into public.loyalty_accounts (client_id, points, total_earned, total_redeemed)
  values (p_client_id, p_points, p_points, 0)
  on conflict (client_id) do update set
    points = loyalty_accounts.points + p_points,
    total_earned = loyalty_accounts.total_earned + p_points;

  -- Record transaction
  insert into public.loyalty_transactions (client_id, appointment_id, points, type, description)
  values (p_client_id, p_appointment_id, p_points, 'earned', p_description);
end;
$$;

-- Redeem loyalty points
create or replace function redeem_loyalty_points(
  p_client_id uuid,
  p_points int,
  p_description text
) returns void language plpgsql security definer as $$
begin
  update public.loyalty_accounts
  set points = points - p_points,
      total_redeemed = total_redeemed + p_points
  where client_id = p_client_id and points >= p_points;

  if not found then
    raise exception 'Insufficient points';
  end if;

  insert into public.loyalty_transactions (client_id, points, type, description)
  values (p_client_id, p_points, 'redeemed', p_description);
end;
$$;

-- Auto-create profile on user signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, full_name, phone, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    -- NULLIF converts '' → NULL so multiple OAuth/email users don't collide on UNIQUE(phone)
    nullif(coalesce(new.phone, new.raw_user_meta_data->>'phone', ''), ''),
    new.email,
    'client'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
