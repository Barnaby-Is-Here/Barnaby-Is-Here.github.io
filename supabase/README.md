# Supabase Project Notes

This repository can safely contain Supabase schema and migration files.

Safe to commit:
- SQL migration files
- Schema baselines and notes
- `supabase/config.toml` after the CLI creates it

Do not commit:
- `service_role` keys
- database passwords
- secret environment files

Current remote project:
- Project ref: `majgnbtdmraehpjqlazi`
- Dashboard: `https://supabase.com/dashboard/project/majgnbtdmraehpjqlazi`

## Why this folder starts with a baseline instead of a migration

The initial `recipe_test` table and policies were created in the Supabase dashboard on 2026-06-20 before the CLI was set up locally.

The Supabase CLI is installed on this machine, but Docker is not currently set up. Because `supabase db pull` uses Docker for its diff step, this repo is not yet linked and pulled from the remote project.

To avoid creating a fake migration history that could drift from the remote database, the current schema is recorded in `baseline/` and the `migrations/` folder is prepared for the first canonical pull.

## Recommended next step once the CLI is installed

Run these commands from the repository root:

```powershell
supabase login
supabase link --project-ref majgnbtdmraehpjqlazi
supabase db pull
```

That will create the first real migration file in `supabase/migrations/` based on the live remote schema.

Supabase recommends this workflow when schema changes were first made in the dashboard.

## After the first pull

Use the CLI workflow for future schema changes:

```powershell
supabase migration new describe_change_here
```

Then edit the generated SQL file, apply it locally or to the linked project, and commit the migration to Git.

## Manual dashboard workflow for now

If you are not using Docker yet, you can still keep this repository as the source of truth:

1. Add new SQL files under `supabase/migrations/`.
2. Run those files manually in the Supabase SQL Editor in timestamp order.
3. Commit the SQL files to Git after they have been applied.

That is a reasonable lightweight workflow for a small static site. The only tradeoff is that the remote migration history is not being updated automatically by the CLI yet.
