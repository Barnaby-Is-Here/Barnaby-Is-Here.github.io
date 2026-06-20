-- Allow approved recipe editors to delete recipes.

grant delete on table public.recipes to authenticated;

drop policy if exists "Editors can delete recipes" on public.recipes;
create policy "Editors can delete recipes"
on public.recipes
for delete
to authenticated
using (public.is_recipe_editor());
