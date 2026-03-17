begin;

alter table if exists public.workspaces enable row level security;

drop policy if exists "Workspace owners can update workspace" on public.workspaces;
create policy "Workspace owners can update workspace"
  on public.workspaces
  for update
  to authenticated
  using (owner_user_id = auth.uid())
  with check (owner_user_id = auth.uid());

drop policy if exists "Workspace owners can delete workspace" on public.workspaces;
create policy "Workspace owners can delete workspace"
  on public.workspaces
  for delete
  to authenticated
  using (owner_user_id = auth.uid());

commit;

-- Rollback reference (manual):
-- begin;
-- drop policy if exists "Workspace owners can update workspace" on public.workspaces;
-- drop policy if exists "Workspace owners can delete workspace" on public.workspaces;
-- commit;
