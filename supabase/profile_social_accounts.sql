create extension if not exists pgcrypto;

create table if not exists public.social_profile_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  group_id uuid,
  profile_id uuid not null,
  social_account_id uuid not null references public.social_accounts(id) on delete cascade,
  provider text not null default 'tiktok',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint social_profile_accounts_user_profile_account_key
    unique (user_id, profile_id, social_account_id)
);

create index if not exists social_profile_accounts_user_profile_idx
on public.social_profile_accounts(user_id, profile_id);

create index if not exists social_profile_accounts_social_account_idx
on public.social_profile_accounts(social_account_id);

create or replace function public.set_social_profile_accounts_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_social_profile_accounts_updated_at
on public.social_profile_accounts;

create trigger set_social_profile_accounts_updated_at
before update on public.social_profile_accounts
for each row
execute function public.set_social_profile_accounts_updated_at();

alter table public.social_profile_accounts enable row level security;

drop policy if exists "Users can read their own social profile accounts"
on public.social_profile_accounts;

create policy "Users can read their own social profile accounts"
on public.social_profile_accounts
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert their own social profile accounts"
on public.social_profile_accounts;

create policy "Users can insert their own social profile accounts"
on public.social_profile_accounts
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own social profile accounts"
on public.social_profile_accounts;

create policy "Users can update their own social profile accounts"
on public.social_profile_accounts
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own social profile accounts"
on public.social_profile_accounts;

create policy "Users can delete their own social profile accounts"
on public.social_profile_accounts
for delete
using (auth.uid() = user_id);
