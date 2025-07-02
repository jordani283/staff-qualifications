-- Create the view that joins audit logs with user information for better display
-- Run this in your Supabase SQL editor to fix the missing view issue

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
  coalesce(p.full_name, au.email, 'Unknown User') as performed_by
from public.certification_audit_logs cal
left join auth.users au on cal.user_id = au.id
left join public.profiles p on cal.user_id = p.id
order by cal.created_at desc;

-- Grant necessary permissions
grant select on public.v_certification_audit_logs to authenticated; 