# V35.2 Tester Feedback

## Player workflow

Authenticated testers can open Tester Feedback from the Village header, the
More/Settings screen, Gothic Audio settings, or the battle pause overlay. The
same form supports bug reports, suggestions, and general feedback.

The client attaches the current release, campaign chapter, visible screen,
browser/device summary, authenticated account UUID, client timestamp, and up
to 20 recent sanitized client errors. Passwords, authorization values, JWTs,
Supabase keys, and fields whose names indicate secrets or tokens are redacted.

Failed or offline submissions are stored under the account-specific payload's
UUID in local browser storage and retried when the browser reconnects. The
unique `client_submission_id` prevents a response-loss retry from creating a
duplicate report.

## Supabase setup

Apply this migration in Supabase SQL Editor:

`supabase/migrations/002_tester_feedback.sql`

The migration creates `public.tester_feedback`, enables RLS, revokes anonymous
access, and grants authenticated clients only `INSERT`. The insert policy
requires `auth.uid() = user_id`. No player-facing select, update, or delete
policy exists.

## Administrative review

In Supabase Dashboard, open **Table Editor → tester_feedback**. Sort by
`submitted_at` descending and filter `review_status = new`. Administrators can
update `review_status` and `admin_notes` from the dashboard's privileged
server-side session; those fields are unavailable to the public game client.

Useful SQL Editor query:

```sql
select
  id, submitted_at, submission_type, severity, review_status,
  game_version, current_chapter, current_screen, title, description,
  steps_to_reproduce, expected_result, actual_result,
  device_info, client_errors, contact_email, user_id
from public.tester_feedback
order by
  case severity
    when 'critical' then 1 when 'high' then 2
    when 'medium' then 3 when 'low' then 4 else 5
  end,
  submitted_at desc;
```

Never add a service-role or secret key to the browser client. Dashboard review
and future administrative tooling must use privileged credentials only on a
trusted server.
