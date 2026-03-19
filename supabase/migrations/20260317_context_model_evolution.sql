begin;

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.system_projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  slug text not null,
  description text,
  system_type text not null default 'other',
  primary_model text,
  ontology_version text,
  notes text,
  tags jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.system_environments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.system_projects(id) on delete cascade,
  name text not null,
  slug text not null,
  environment_type text not null default 'production',
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table public.system_projects
  add column if not exists description text,
  add column if not exists system_type text default 'other',
  add column if not exists primary_model text,
  add column if not exists ontology_version text,
  add column if not exists notes text,
  add column if not exists tags jsonb default '[]'::jsonb,
  add column if not exists updated_at timestamptz default now(),
  add column if not exists deleted_at timestamptz;

alter table public.system_environments
  add column if not exists environment_type text default 'production',
  add column if not exists description text,
  add column if not exists updated_at timestamptz default now(),
  add column if not exists deleted_at timestamptz;

create index if not exists system_projects_workspace_idx
  on public.system_projects(workspace_id);
create index if not exists system_projects_active_workspace_idx
  on public.system_projects(workspace_id, lower(name))
  where deleted_at is null;
create unique index if not exists system_projects_workspace_slug_unique
  on public.system_projects(workspace_id, slug)
  where deleted_at is null;

create index if not exists system_environments_project_idx
  on public.system_environments(project_id);
create index if not exists system_environments_active_project_idx
  on public.system_environments(project_id, lower(name))
  where deleted_at is null;
create unique index if not exists system_environments_project_slug_unique
  on public.system_environments(project_id, slug)
  where deleted_at is null;

do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'trg_system_projects_updated_at'
  ) then
    create trigger trg_system_projects_updated_at
      before update on public.system_projects
      for each row
      execute function public.set_updated_at();
  end if;

  if not exists (
    select 1 from pg_trigger where tgname = 'trg_system_environments_updated_at'
  ) then
    create trigger trg_system_environments_updated_at
      before update on public.system_environments
      for each row
      execute function public.set_updated_at();
  end if;
end $$;

alter table public.system_projects enable row level security;
alter table public.system_environments enable row level security;

drop policy if exists "System projects visible to workspace owner" on public.system_projects;
create policy "System projects visible to workspace owner"
  on public.system_projects
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.workspaces w
      where w.id = system_projects.workspace_id
        and w.owner_user_id = auth.uid()
        and w.deleted_at is null
    )
  );

drop policy if exists "System projects writable by workspace owner" on public.system_projects;
create policy "System projects writable by workspace owner"
  on public.system_projects
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.workspaces w
      where w.id = system_projects.workspace_id
        and w.owner_user_id = auth.uid()
        and w.deleted_at is null
    )
  )
  with check (
    exists (
      select 1
      from public.workspaces w
      where w.id = system_projects.workspace_id
        and w.owner_user_id = auth.uid()
        and w.deleted_at is null
    )
  );

drop policy if exists "System environments visible to workspace owner" on public.system_environments;
create policy "System environments visible to workspace owner"
  on public.system_environments
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.system_projects sp
      join public.workspaces w on w.id = sp.workspace_id
      where sp.id = system_environments.project_id
        and sp.deleted_at is null
        and w.owner_user_id = auth.uid()
        and w.deleted_at is null
    )
  );

drop policy if exists "System environments writable by workspace owner" on public.system_environments;
create policy "System environments writable by workspace owner"
  on public.system_environments
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.system_projects sp
      join public.workspaces w on w.id = sp.workspace_id
      where sp.id = system_environments.project_id
        and sp.deleted_at is null
        and w.owner_user_id = auth.uid()
        and w.deleted_at is null
    )
  )
  with check (
    exists (
      select 1
      from public.system_projects sp
      join public.workspaces w on w.id = sp.workspace_id
      where sp.id = system_environments.project_id
        and sp.deleted_at is null
        and w.owner_user_id = auth.uid()
        and w.deleted_at is null
    )
  );

do $$
declare
  target_table text;
  target_tables text[] := array['analysis', 'analysis_runs', 'analysis_results', 'analysis_jobs'];
  fk_project_name text;
  fk_environment_name text;
  idx_project_name text;
  idx_environment_name text;
begin
  foreach target_table in array target_tables loop
    if to_regclass(format('public.%I', target_table)) is not null then
      execute format(
        'alter table public.%I add column if not exists project_id uuid',
        target_table
      );
      execute format(
        'alter table public.%I add column if not exists environment_id uuid',
        target_table
      );

      fk_project_name := format('%s_project_id_fkey', target_table);
      if not exists (
        select 1
        from pg_constraint c
          join pg_class t on t.oid = c.conrelid
          join pg_namespace n on n.oid = t.relnamespace
        where n.nspname = 'public'
          and t.relname = target_table
          and c.conname = fk_project_name
      ) then
        execute format(
          'alter table public.%I add constraint %I foreign key (project_id) references public.system_projects(id)',
          target_table,
          fk_project_name
        );
      end if;

      fk_environment_name := format('%s_environment_id_fkey', target_table);
      if not exists (
        select 1
        from pg_constraint c
          join pg_class t on t.oid = c.conrelid
          join pg_namespace n on n.oid = t.relnamespace
        where n.nspname = 'public'
          and t.relname = target_table
          and c.conname = fk_environment_name
      ) then
        execute format(
          'alter table public.%I add constraint %I foreign key (environment_id) references public.system_environments(id)',
          target_table,
          fk_environment_name
        );
      end if;

      idx_project_name := format('%s_project_id_idx', target_table);
      execute format(
        'create index if not exists %I on public.%I(project_id)',
        idx_project_name,
        target_table
      );

      idx_environment_name := format('%s_environment_id_idx', target_table);
      execute format(
        'create index if not exists %I on public.%I(environment_id)',
        idx_environment_name,
        target_table
      );
    end if;
  end loop;
end $$;

insert into public.system_projects (
  workspace_id,
  name,
  slug,
  description,
  system_type
)
select
  w.id,
  'System 1',
  'system-1',
  'Auto-created default system for legacy analyses',
  'other'
from public.workspaces w
where w.deleted_at is null
  and not exists (
    select 1
    from public.system_projects sp
    where sp.workspace_id = w.id
      and sp.deleted_at is null
  );

insert into public.system_environments (
  project_id,
  name,
  slug,
  environment_type,
  description
)
select
  sp.id,
  'Production',
  'production',
  'production',
  'Auto-created default environment for legacy analyses'
from public.system_projects sp
where sp.deleted_at is null
  and not exists (
    select 1
    from public.system_environments se
    where se.project_id = sp.id
      and se.deleted_at is null
  );

do $$
declare
  target_table text;
  target_tables text[] := array['analysis', 'analysis_runs', 'analysis_results', 'analysis_jobs'];
begin
  foreach target_table in array target_tables loop
    if to_regclass(format('public.%I', target_table)) is not null then
      execute format(
        'update public.%1$I t
         set project_id = sub.project_id
         from (
           select
             t2.id as target_id,
             (
               select sp.id
               from public.system_projects sp
               where sp.workspace_id = t2.workspace_id
                 and sp.deleted_at is null
               order by sp.created_at asc
               limit 1
             ) as project_id
           from public.%1$I t2
           where t2.workspace_id is not null
             and t2.project_id is null
         ) sub
         where t.id = sub.target_id
           and sub.project_id is not null',
        target_table
      );

      execute format(
        'update public.%1$I t
         set environment_id = sub.environment_id
         from (
           select
             t2.id as target_id,
             (
               select se.id
               from public.system_environments se
               where se.project_id = t2.project_id
                 and se.deleted_at is null
               order by se.created_at asc
               limit 1
             ) as environment_id
           from public.%1$I t2
           where t2.project_id is not null
             and t2.environment_id is null
         ) sub
         where t.id = sub.target_id
           and sub.environment_id is not null',
        target_table
      );
    end if;
  end loop;
end $$;

commit;
