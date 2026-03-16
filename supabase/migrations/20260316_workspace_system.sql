begin;

create extension if not exists pgcrypto;

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_user_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table public.workspaces
  add column if not exists name text,
  add column if not exists owner_user_id uuid,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now(),
  add column if not exists deleted_at timestamptz;

-- Optional compatibility column used by older UI paths.
alter table public.workspaces
  add column if not exists slug text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'workspaces_owner_user_id_fkey'
  ) then
    alter table public.workspaces
      add constraint workspaces_owner_user_id_fkey
      foreign key (owner_user_id)
      references auth.users(id)
      on delete cascade;
  end if;
end $$;

create index if not exists workspaces_owner_user_id_idx
  on public.workspaces(owner_user_id);

create index if not exists workspaces_deleted_at_idx
  on public.workspaces(deleted_at);

create index if not exists workspaces_owner_name_active_idx
  on public.workspaces(owner_user_id, lower(name))
  where deleted_at is null;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'trg_workspaces_updated_at'
  ) then
    create trigger trg_workspaces_updated_at
      before update on public.workspaces
      for each row
      execute function public.set_updated_at();
  end if;
end $$;

do $$
declare
  target_table text;
  target_tables text[] := array['analysis', 'analysis_runs', 'analysis_results', 'analysis_jobs'];
  fk_name text;
  idx_name text;
begin
  foreach target_table in array target_tables loop
    if to_regclass(format('public.%I', target_table)) is not null then
      execute format(
        'alter table public.%I add column if not exists workspace_id uuid',
        target_table
      );

      fk_name := format('%s_workspace_id_fkey', target_table);
      if not exists (
        select 1
        from pg_constraint c
          join pg_class t on t.oid = c.conrelid
          join pg_namespace n on n.oid = t.relnamespace
        where n.nspname = 'public'
          and t.relname = target_table
          and c.conname = fk_name
      ) then
        execute format(
          'alter table public.%I add constraint %I foreign key (workspace_id) references public.workspaces(id)',
          target_table,
          fk_name
        );
      end if;

      idx_name := format('%s_workspace_id_idx', target_table);
      execute format(
        'create index if not exists %I on public.%I(workspace_id)',
        idx_name,
        target_table
      );
    end if;
  end loop;
end $$;

commit;

-- Rollback reference (manual):
-- begin;
-- alter table public.analysis drop constraint if exists analysis_workspace_id_fkey;
-- alter table public.analysis_runs drop constraint if exists analysis_runs_workspace_id_fkey;
-- alter table public.analysis_results drop constraint if exists analysis_results_workspace_id_fkey;
-- alter table public.analysis_jobs drop constraint if exists analysis_jobs_workspace_id_fkey;
-- alter table public.analysis drop column if exists workspace_id;
-- alter table public.analysis_runs drop column if exists workspace_id;
-- alter table public.analysis_results drop column if exists workspace_id;
-- alter table public.analysis_jobs drop column if exists workspace_id;
-- drop trigger if exists trg_workspaces_updated_at on public.workspaces;
-- drop function if exists public.set_updated_at();
-- drop table if exists public.workspaces;
-- commit;
