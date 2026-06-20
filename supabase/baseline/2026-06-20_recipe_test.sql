-- Baseline reference captured from the live Supabase project on 2026-06-20.
-- This is intentionally stored outside supabase/migrations until the first
-- official `supabase db pull` can be run from a machine with the CLI installed.

create table public.recipe_test (
  id bigint generated always as identity primary key,
  name text not null,
  note text,
  created_at timestamptz not null default now()
);

alter table public.recipe_test enable row level security;

grant usage on schema public to anon;
grant select, insert on table public.recipe_test to anon;

create policy "recipe_test public read"
on public.recipe_test
for select
to anon
using (true);

create policy "recipe_test public insert"
on public.recipe_test
for insert
to anon
with check (true);
