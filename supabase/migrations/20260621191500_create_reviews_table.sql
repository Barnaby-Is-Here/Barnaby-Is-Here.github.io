-- Create review data for completed meals and convenient plan/history views.
-- Reviews belong to meal entries, which means recipes gain many reviews over time.

create table if not exists public.meal_reviews (
  id bigint generated always as identity primary key,
  meal_entry_id bigint not null unique references public.meal_entries(id) on delete cascade,
  reviewer_user_id uuid references auth.users(id) on delete set null default auth.uid(),
  rating smallint not null,
  comment text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint meal_reviews_rating_valid check (rating >= 1 and rating <= 5)
);

create index if not exists meal_reviews_reviewer_user_id_idx on public.meal_reviews (reviewer_user_id);
create index if not exists meal_reviews_rating_idx on public.meal_reviews (rating);

create or replace function public.ensure_meal_review_entry_is_eaten()
returns trigger
language plpgsql
as $$
declare
  entry_status text;
  entry_household_id uuid;
begin
  if auth.uid() is not null and new.reviewer_user_id is null then
    new.reviewer_user_id = auth.uid();
  end if;

  if auth.uid() is not null and new.reviewer_user_id is distinct from auth.uid() then
    raise exception 'reviewer_user_id must match the signed-in user';
  end if;

  select status, household_id
  into entry_status, entry_household_id
  from public.meal_entries
  where id = new.meal_entry_id;

  if entry_status is distinct from 'eaten' then
    raise exception 'meal reviews can only be attached to eaten meal entries';
  end if;

  if not public.is_household_member(entry_household_id) then
    raise exception 'review meal_entry_id must belong to one of the signed-in user households';
  end if;

  return new;
end;
$$;

drop trigger if exists meal_reviews_set_updated_at on public.meal_reviews;
create trigger meal_reviews_set_updated_at
before update on public.meal_reviews
for each row
execute function public.set_updated_at();

drop trigger if exists meal_reviews_require_eaten_entry on public.meal_reviews;
create trigger meal_reviews_require_eaten_entry
before insert or update on public.meal_reviews
for each row
execute function public.ensure_meal_review_entry_is_eaten();

alter table public.meal_reviews enable row level security;

grant usage on schema public to authenticated;
grant select, insert, update, delete on table public.meal_reviews to authenticated;

drop policy if exists "Household members can read meal reviews" on public.meal_reviews;
create policy "Household members can read meal reviews"
on public.meal_reviews
for select
to authenticated
using (
  exists (
    select 1
    from public.meal_entries me
    where me.id = meal_entry_id
      and public.is_household_member(me.household_id)
  )
);

drop policy if exists "Household members can insert meal reviews" on public.meal_reviews;
create policy "Household members can insert meal reviews"
on public.meal_reviews
for insert
to authenticated
with check (
  exists (
    select 1
    from public.meal_entries me
    where me.id = meal_entry_id
      and public.is_household_member(me.household_id)
  )
);

drop policy if exists "Household members can update meal reviews" on public.meal_reviews;
create policy "Household members can update meal reviews"
on public.meal_reviews
for update
to authenticated
using (
  exists (
    select 1
    from public.meal_entries me
    where me.id = meal_entry_id
      and public.is_household_member(me.household_id)
  )
)
with check (
  exists (
    select 1
    from public.meal_entries me
    where me.id = meal_entry_id
      and public.is_household_member(me.household_id)
  )
);

drop policy if exists "Household members can delete meal reviews" on public.meal_reviews;
create policy "Household members can delete meal reviews"
on public.meal_reviews
for delete
to authenticated
using (
  exists (
    select 1
    from public.meal_entries me
    where me.id = meal_entry_id
      and public.is_household_member(me.household_id)
  )
);

create or replace view public.plan
with (security_invoker = true) as
select
  me.id,
  me.household_id,
  me.recipe_id,
  me.meal_date,
  me.status,
  me.created_by_user_id,
  me.eaten_at,
  me.notes,
  me.created_at,
  me.updated_at
from public.meal_entries me
where me.status = 'planned';

create or replace view public.history
with (security_invoker = true) as
select
  me.id,
  me.household_id,
  me.recipe_id,
  me.meal_date,
  me.status,
  me.created_by_user_id,
  me.eaten_at,
  me.notes,
  me.created_at,
  me.updated_at,
  mr.id as review_id,
  mr.reviewer_user_id,
  mr.rating,
  mr.comment as review_comment,
  mr.created_at as review_created_at,
  mr.updated_at as review_updated_at
from public.meal_entries me
left join public.meal_reviews mr on mr.meal_entry_id = me.id
where me.status in ('eaten', 'skipped');

create or replace view public.recipe_reviews
with (security_invoker = true) as
select
  mr.id,
  me.household_id,
  me.recipe_id,
  mr.meal_entry_id,
  mr.reviewer_user_id,
  mr.rating,
  mr.comment,
  mr.created_at,
  mr.updated_at
from public.meal_reviews mr
join public.meal_entries me on me.id = mr.meal_entry_id;

grant select on table public.plan to authenticated;
grant select on table public.history to authenticated;
grant select on table public.recipe_reviews to authenticated;

comment on table public.meal_reviews is 'One review per eaten meal entry.';
comment on column public.meal_reviews.meal_entry_id is 'Reviewed meal entry. Unique so each meal can only be reviewed once.';
comment on view public.plan is 'Convenience view over household-scoped upcoming planned meal entries.';
comment on view public.history is 'Convenience view over household-scoped completed or skipped meal entries with any attached review.';
comment on view public.recipe_reviews is 'Household-scoped recipe review stream derived from reviewed meal entries.';
