-- Track recipe authorship and attach new data to a household.
-- Existing recipe rows stay valid with null ownership fields until they are backfilled.

create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'My Household',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint households_name_not_blank check (char_length(trim(name)) > 0)
);

create table if not exists public.household_members (
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member',
  created_at timestamptz not null default timezone('utc', now()),
  primary key (household_id, user_id),
  constraint household_members_role_valid check (role in ('owner', 'member'))
);

create index if not exists household_members_user_id_idx on public.household_members (user_id);

drop trigger if exists households_set_updated_at on public.households;
create trigger households_set_updated_at
before update on public.households
for each row
execute function public.set_updated_at();

alter table public.households enable row level security;
alter table public.household_members enable row level security;

grant usage on schema public to authenticated;
grant select on table public.households to authenticated;
grant select on table public.household_members to authenticated;

create or replace function public.ensure_current_user_household()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_household_id uuid;
begin
  if auth.uid() is null then
    return null;
  end if;

  select household_id
  into current_household_id
  from public.household_members
  where user_id = auth.uid()
  order by created_at asc
  limit 1;

  if current_household_id is null then
    insert into public.households default values
    returning id into current_household_id;

    insert into public.household_members (household_id, user_id, role)
    values (current_household_id, auth.uid(), 'owner');
  end if;

  return current_household_id;
end;
$$;

create or replace function public.is_household_member(target_household_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.household_members
    where household_id = target_household_id
      and user_id = auth.uid()
  );
$$;

revoke all on function public.ensure_current_user_household() from public;
revoke all on function public.is_household_member(uuid) from public;
grant execute on function public.ensure_current_user_household() to authenticated;
grant execute on function public.is_household_member(uuid) to authenticated;

drop policy if exists "Members can read their households" on public.households;
create policy "Members can read their households"
on public.households
for select
to authenticated
using (public.is_household_member(id));

drop policy if exists "Members can read their household memberships" on public.household_members;
create policy "Members can read their household memberships"
on public.household_members
for select
to authenticated
using (public.is_household_member(household_id));

alter table public.recipes
add column if not exists author_id uuid references auth.users (id) on delete set null;

alter table public.recipes
alter column author_id set default auth.uid();

alter table public.recipes
add column if not exists household_id uuid references public.households (id) on delete set null;

alter table public.recipes
alter column household_id set default public.ensure_current_user_household();

create index if not exists recipes_author_id_idx on public.recipes (author_id);
create index if not exists recipes_household_id_idx on public.recipes (household_id);

create or replace function public.manage_recipe_ownership()
returns trigger
language plpgsql
as $$
declare
  current_household_id uuid;
begin
  if tg_op = 'INSERT' then
    if auth.uid() is not null then
      current_household_id = public.ensure_current_user_household();

      if new.author_id is null then
        new.author_id = auth.uid();
      elsif new.author_id is distinct from auth.uid() then
        raise exception 'author_id must match the signed-in user';
      end if;

      if new.household_id is null then
        new.household_id = current_household_id;
      elsif not public.is_household_member(new.household_id) then
        raise exception 'household_id must belong to the signed-in user';
      end if;
    end if;
  elsif tg_op = 'UPDATE' then
    if auth.uid() is not null and new.author_id is distinct from old.author_id then
      raise exception 'author_id cannot be changed after creation';
    end if;

    if new.household_id is distinct from old.household_id then
      raise exception 'household_id cannot be changed after creation';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists recipes_manage_author_id on public.recipes;
create trigger recipes_manage_author_id
before insert or update on public.recipes
for each row
execute function public.manage_recipe_ownership();

drop policy if exists "Editors can insert recipes" on public.recipes;
create policy "Editors can insert recipes"
on public.recipes
for insert
to authenticated
with check (
  public.is_recipe_editor()
  and (author_id is null or author_id = auth.uid())
  and (household_id is null or public.is_household_member(household_id))
);

drop policy if exists "Editors can update recipes" on public.recipes;
create policy "Editors can update recipes"
on public.recipes
for update
to authenticated
using (
  public.is_recipe_editor()
  and (household_id is null or public.is_household_member(household_id))
)
with check (
  public.is_recipe_editor()
  and (household_id is null or public.is_household_member(household_id))
);

drop policy if exists "Editors can delete recipes" on public.recipes;
create policy "Editors can delete recipes"
on public.recipes
for delete
to authenticated
using (
  public.is_recipe_editor()
  and (household_id is null or public.is_household_member(household_id))
);

comment on column public.recipes.author_id is 'Supabase Auth user id of the recipe creator.';
comment on column public.recipes.household_id is 'Owning household for private recipes. Null means a shared/global recipe.';
comment on table public.households is 'A shared planning group such as a household.';
comment on table public.household_members is 'Membership links between authenticated users and households.';
