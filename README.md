# olamdev_mls201 - OlamDev MLS201 Quiz (PWA)

Static site: HTML + CSS + vanilla JS. No npm, no build, no Vercel env variables.

## 1. Supabase (use your EXISTING project - do not create a new one)
1. Supabase dashboard -> open your existing project -> **SQL Editor** -> New query.
2. Paste the SQL below (replace `YOUR_ADMIN_EMAIL`) -> **Run**.
3. URL and key are already in `supabase-config.js` (Project Settings -> API -> Project URL + publishable/anon key). Never use or paste the `service_role` key.
4. Authentication -> URL Configuration: add your Vercel URL to **Site URL** and **Redirect URLs** (needed for forgot-password and email confirmation).
5. In `supabase-config.js` set `ADMIN_EMAIL` to your email.

```sql
create table if not exists public.profiles(
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text, email text, app_name text not null default 'mls201',
  role text default 'student', created_at timestamptz default now());
create table if not exists public.results(
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  full_name text, email text, app_name text not null, topics text, mode text,
  score int, total_questions int, percentage numeric, grade text, pass_fail text,
  time_used int, created_at timestamptz default now());
alter table public.profiles enable row level security;
alter table public.results enable row level security;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  insert into public.profiles(id,full_name,email,app_name)
  values(new.id,new.raw_user_meta_data->>'full_name',new.email,coalesce(new.raw_user_meta_data->>'app_name','unknown'))
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create policy "own profile" on public.profiles for select using (auth.uid()=id);
create policy "own results read" on public.results for select using (auth.uid()=user_id and app_name='mls201');
create policy "own results insert" on public.results for insert with check (auth.uid()=user_id and app_name='mls201');
create policy "admin profiles" on public.profiles for all
  using (app_name='mls201' and (auth.jwt()->>'email')='YOUR_ADMIN_EMAIL');
create policy "admin results" on public.results for all
  using (app_name='mls201' and (auth.jwt()->>'email')='YOUR_ADMIN_EMAIL');
```
If your project already has a `profiles` table or an `on_auth_user_created` trigger from another app, tell me before running this.

## 2. GitHub
1. github.com -> New repository -> name `olamdev_mls201` -> Create.
2. **Add file -> Upload files** -> drag all files from this folder -> Commit.

## 3. Vercel
1. vercel.com -> Add New -> Project -> import the repo.
2. Framework preset: **Other**. No build command. Deploy. No environment variables needed.

## 4. Student login rules
Sign-up stores `app_name = 'mls201'`. On login, any account whose profile is not `mls201` is signed out with "This account is not for MLS201".
