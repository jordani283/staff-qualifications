-- Create the certification_audit_logs table
create table public.certification_audit_logs (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null,
  certification_id uuid not null,
  action_type text not null,
  field text null,
  old_value text null,
  new_value text null,
  note text null,
  created_at timestamp with time zone not null default now(),
  constraint certification_audit_logs_pkey primary key (id),
  constraint certification_audit_logs_user_id_fkey foreign key (user_id)
    references auth.users (id) on delete set null,
  constraint certification_audit_logs_certification_id_fkey foreign key (certification_id)
    references staff_certifications (id) on delete cascade
) tablespace pg_default;

-- Create indexes for better query performance
create index certification_audit_logs_certification_id_idx
  on public.certification_audit_logs (certification_id);

create index certification_audit_logs_user_id_idx
  on public.certification_audit_logs (user_id);

create index certification_audit_logs_created_at_idx
  on public.certification_audit_logs (created_at desc);

-- Enable Row Level Security
alter table public.certification_audit_logs enable row level security;

-- RLS Policy: Allow authenticated users to insert audit logs
create policy "Allow authenticated users to insert audit logs"
  on public.certification_audit_logs
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- RLS Policy: Allow authenticated users to read all audit logs
create policy "Allow authenticated users to read audit logs"
  on public.certification_audit_logs
  for select
  to authenticated
  using (true);

-- Create a view that joins audit logs with user information for better display
create or replace view public.v_certification_audit_logs as
select 
  cal.id,
  cal.user_id,
  cal.certification_id,
  cal.action_type,
  cal.field,
  cal.old_value,
  cal.new_value,
  cal.note,
  cal.created_at,
  coalesce(p.full_name, au.email) as performed_by
from public.certification_audit_logs cal
left join auth.users au on cal.user_id = au.id
left join public.profiles p on cal.user_id = p.id
order by cal.created_at desc;

-- Grant necessary permissions
grant usage on schema public to authenticated;
grant select on public.v_certification_audit_logs to authenticated;
grant insert on public.certification_audit_logs to authenticated;
grant select on public.certification_audit_logs to authenticated; 