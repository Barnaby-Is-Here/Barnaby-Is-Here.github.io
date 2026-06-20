-- Create the main recipes table for the GitHub Pages frontend.
-- This migration keeps reads public, but leaves writes locked down for now.
-- The browser app can safely read from this table with the publishable key.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.recipes (
  id bigint generated always as identity primary key,
  name text not null,
  path text not null,
  ingredients text not null,
  method text not null,
  tags text not null default '',
  picture_url text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint recipes_name_not_blank check (char_length(trim(name)) > 0),
  constraint recipes_path_not_blank check (char_length(trim(path)) > 0),
  constraint recipes_ingredients_not_blank check (char_length(trim(ingredients)) > 0),
  constraint recipes_method_not_blank check (char_length(trim(method)) > 0),
  constraint recipes_path_name_unique unique (path, name)
);

create index if not exists recipes_path_idx on public.recipes (path);
create index if not exists recipes_created_at_idx on public.recipes (created_at desc);

drop trigger if exists recipes_set_updated_at on public.recipes;
create trigger recipes_set_updated_at
before update on public.recipes
for each row
execute function public.set_updated_at();

alter table public.recipes enable row level security;

grant usage on schema public to anon, authenticated;
grant select on table public.recipes to anon, authenticated;

drop policy if exists "Public can read recipes" on public.recipes;
create policy "Public can read recipes"
on public.recipes
for select
to anon, authenticated
using (true);

comment on table public.recipes is 'Recipe records for the static recipe site.';
comment on column public.recipes.path is 'Recipe category/group shown in the left navigation.';
comment on column public.recipes.ingredients is 'Comma-separated ingredient list to match the current frontend.';
comment on column public.recipes.tags is 'Comma-separated tag list to match the current frontend.';
comment on column public.recipes.picture_url is 'Public image URL. This can later point at Supabase Storage.';
