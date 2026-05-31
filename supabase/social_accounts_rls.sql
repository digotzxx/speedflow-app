alter table public.social_accounts enable row level security;

drop policy if exists "Users can read their own social accounts" on public.social_accounts;
create policy "Users can read their own social accounts"
on public.social_accounts
for select
using (auth.uid()::text = user_id);

drop policy if exists "Users can update their own social accounts" on public.social_accounts;
create policy "Users can update their own social accounts"
on public.social_accounts
for update
using (auth.uid()::text = user_id);

drop policy if exists "Users can insert their own social accounts" on public.social_accounts;
create policy "Users can insert their own social accounts"
on public.social_accounts
for insert
with check (auth.uid()::text = user_id);
