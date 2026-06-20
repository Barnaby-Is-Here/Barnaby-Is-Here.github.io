-- Run this after each editor has signed in once through add-recipe.html.
-- Replace the email addresses and notes with your real values before running.

insert into public.recipe_editors (user_id, note)
select id, 'Barnaby'
from auth.users
where email = 'barnaby@example.com'
on conflict (user_id) do update
set note = excluded.note;

insert into public.recipe_editors (user_id, note)
select id, 'Partner'
from auth.users
where email = 'partner@example.com'
on conflict (user_id) do update
set note = excluded.note;

-- Optional check:
select editors.user_id, users.email, editors.note, editors.created_at
from public.recipe_editors editors
join auth.users users on users.id = editors.user_id
order by editors.created_at asc;
