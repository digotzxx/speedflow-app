create extension if not exists pgcrypto;

create table if not exists public.social_groups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.social_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  group_id uuid not null references public.social_groups(id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists social_groups_user_idx
on public.social_groups(user_id);

create index if not exists social_profiles_user_group_idx
on public.social_profiles(user_id, group_id);

create or replace function public.set_social_groups_profiles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_social_groups_updated_at
on public.social_groups;

create trigger set_social_groups_updated_at
before update on public.social_groups
for each row
execute function public.set_social_groups_profiles_updated_at();

drop trigger if exists set_social_profiles_updated_at
on public.social_profiles;

create trigger set_social_profiles_updated_at
before update on public.social_profiles
for each row
execute function public.set_social_groups_profiles_updated_at();

alter table public.social_groups enable row level security;
alter table public.social_profiles enable row level security;

drop policy if exists "Users can read their own social groups"
on public.social_groups;

create policy "Users can read their own social groups"
on public.social_groups
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert their own social groups"
on public.social_groups;

create policy "Users can insert their own social groups"
on public.social_groups
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own social groups"
on public.social_groups;

create policy "Users can update their own social groups"
on public.social_groups
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own social groups"
on public.social_groups;

create policy "Users can delete their own social groups"
on public.social_groups
for delete
using (auth.uid() = user_id);

drop policy if exists "Users can read their own social profiles"
on public.social_profiles;

create policy "Users can read their own social profiles"
on public.social_profiles
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert their own social profiles"
on public.social_profiles;

create policy "Users can insert their own social profiles"
on public.social_profiles
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own social profiles"
on public.social_profiles;

create policy "Users can update their own social profiles"
on public.social_profiles
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own social profiles"
on public.social_profiles;

create policy "Users can delete their own social profiles"
on public.social_profiles
for delete
using (auth.uid() = user_id);
