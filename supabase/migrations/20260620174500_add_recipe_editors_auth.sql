-- Add editor-only browser write access for recipes using Supabase Auth.
-- Editors are identified by auth.users.id and can be managed without changing policies.

create table if not exists public.recipe_editors (
  user_id uuid primary key references auth.users (id) on delete cascade,
  note text,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.recipe_editors enable row level security;

grant usage on schema public to authenticated;
grant select on table public.recipe_editors to authenticated;
grant insert, update on table public.recipes to authenticated;

create or replace function public.is_recipe_editor()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.recipe_editors
    where user_id = auth.uid()
  );
$$;

revoke all on function public.is_recipe_editor() from public;
grant execute on function public.is_recipe_editor() to authenticated;

drop policy if exists "Editors can view their own membership" on public.recipe_editors;
create policy "Editors can view their own membership"
on public.recipe_editors
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Editors can insert recipes" on public.recipes;
create policy "Editors can insert recipes"
on public.recipes
for insert
to authenticated
with check (public.is_recipe_editor());

drop policy if exists "Editors can update recipes" on public.recipes;
create policy "Editors can update recipes"
on public.recipes
for update
to authenticated
using (public.is_recipe_editor())
with check (public.is_recipe_editor());

comment on table public.recipe_editors is 'Approved recipe editors keyed by Supabase Auth user id.';
comment on column public.recipe_editors.note is 'Optional note for identifying the editor in the dashboard.';
