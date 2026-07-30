begin;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_login_at timestamptz,
  last_seen_at timestamptz,
  game_version text,
  total_play_time_seconds bigint not null default 0
);

create table if not exists public.player_saves (
  user_id uuid primary key references auth.users(id) on delete cascade,
  save_version integer not null default 1,
  game_version text,
  save_data jsonb not null default '{}'::jsonb,
  revision bigint not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists player_saves_set_updated_at on public.player_saves;
create trigger player_saves_set_updated_at
before update on public.player_saves
for each row execute function public.set_updated_at();

-- Email-confirmation projects may not issue a session at sign-up. This trigger
-- creates the profile safely while the application initializes it again after
-- the first authenticated login.
create or replace function public.handle_new_village_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_name text;
begin
  requested_name := left(trim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), 40);
  insert into public.profiles (id, display_name, game_version)
  values (
    new.id,
    coalesce(nullif(requested_name, ''), 'Village Player'),
    '35.0.0'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_village_profile on auth.users;
create trigger on_auth_user_created_village_profile
after insert on auth.users
for each row execute function public.handle_new_village_user();

alter table public.profiles enable row level security;
alter table public.player_saves enable row level security;

revoke all on table public.profiles from anon;
revoke all on table public.player_saves from anon;
grant select, insert, update on table public.profiles to authenticated;
grant select, insert, update on table public.player_saves to authenticated;

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
on public.profiles
for select
to authenticated
using ((select auth.uid()) = id);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
on public.profiles
for insert
to authenticated
with check ((select auth.uid()) = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
on public.profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

drop policy if exists "Users can read own save" on public.player_saves;
create policy "Users can read own save"
on public.player_saves
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own save" on public.player_saves;
create policy "Users can insert own save"
on public.player_saves
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own save" on public.player_saves;
create policy "Users can update own save"
on public.player_saves
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

commit;
