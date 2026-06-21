-- Create the shared meal entry table used for both planning and history.
-- Future planned meals and completed meals live in one place and are split by status.

create table if not exists public.meal_entries (
  id bigint generated always as identity primary key,
  household_id uuid not null references public.households(id) on delete cascade,
  recipe_id bigint not null references public.recipes(id) on delete cascade,
  meal_date date not null,
  status text not null default 'planned',
  created_by_user_id uuid references auth.users(id) on delete set null default auth.uid(),
  eaten_at timestamptz,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint meal_entries_status_valid check (
    status in ('planned', 'eaten', 'skipped', 'cancelled')
  ),
  constraint meal_entries_eaten_state_valid check (
    (status = 'eaten' and eaten_at is not null)
    or (status <> 'eaten' and eaten_at is null)
  )
);

create index if not exists meal_entries_household_id_idx on public.meal_entries (household_id);
create index if not exists meal_entries_recipe_id_idx on public.meal_entries (recipe_id);
create index if not exists meal_entries_household_date_idx on public.meal_entries (household_id, meal_date asc);
create index if not exists meal_entries_household_status_date_idx on public.meal_entries (household_id, status, meal_date asc);
create index if not exists meal_entries_created_by_user_id_idx on public.meal_entries (created_by_user_id);

create or replace function public.manage_meal_entry_household()
returns trigger
language plpgsql
as $$
declare
  current_household_id uuid;
  recipe_household_id uuid;
begin
  if auth.uid() is not null then
    current_household_id = public.ensure_current_user_household();

    if tg_op = 'INSERT' then
      if new.created_by_user_id is null then
        new.created_by_user_id = auth.uid();
      elsif new.created_by_user_id is distinct from auth.uid() then
        raise exception 'created_by_user_id must match the signed-in user';
      end if;

      if new.household_id is null then
        new.household_id = current_household_id;
      elsif not public.is_household_member(new.household_id) then
        raise exception 'household_id must belong to the signed-in user';
      end if;
    elsif tg_op = 'UPDATE' then
      if new.household_id is distinct from old.household_id then
        raise exception 'household_id cannot be changed after creation';
      end if;
    end if;
  end if;

  select household_id
  into recipe_household_id
  from public.recipes
  where id = new.recipe_id;

  if recipe_household_id is not null and recipe_household_id is distinct from new.household_id then
    raise exception 'meal entry household must match the recipe household';
  end if;

  return new;
end;
$$;

drop trigger if exists meal_entries_set_updated_at on public.meal_entries;
create trigger meal_entries_set_updated_at
before update on public.meal_entries
for each row
execute function public.set_updated_at();

drop trigger if exists meal_entries_manage_household on public.meal_entries;
create trigger meal_entries_manage_household
before insert or update on public.meal_entries
for each row
execute function public.manage_meal_entry_household();

alter table public.meal_entries enable row level security;

grant usage on schema public to authenticated;
grant select, insert, update, delete on table public.meal_entries to authenticated;

drop policy if exists "Household members can read meal entries" on public.meal_entries;
create policy "Household members can read meal entries"
on public.meal_entries
for select
to authenticated
using (public.is_household_member(household_id));

drop policy if exists "Household members can insert meal entries" on public.meal_entries;
create policy "Household members can insert meal entries"
on public.meal_entries
for insert
to authenticated
with check (public.is_household_member(household_id));

drop policy if exists "Household members can update meal entries" on public.meal_entries;
create policy "Household members can update meal entries"
on public.meal_entries
for update
to authenticated
using (public.is_household_member(household_id))
with check (public.is_household_member(household_id));

drop policy if exists "Household members can delete meal entries" on public.meal_entries;
create policy "Household members can delete meal entries"
on public.meal_entries
for delete
to authenticated
using (public.is_household_member(household_id));

comment on table public.meal_entries is 'Shared meal schedule and meal history entries for the static recipe site.';
comment on column public.meal_entries.household_id is 'Household that owns this plan/history entry.';
comment on column public.meal_entries.meal_date is 'The calendar date the meal is planned for or was eaten on.';
comment on column public.meal_entries.status is 'Meal state: planned, eaten, skipped, or cancelled.';
comment on column public.meal_entries.created_by_user_id is 'Supabase Auth user who created the meal entry.';
comment on column public.meal_entries.eaten_at is 'Timestamp set when the meal was actually eaten.';
