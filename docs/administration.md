# Administration setup and daily use

The administration UI is available to active administrators at `/admin/employees`.

## Apply the database update once

In the **WorkManagementSystem** Supabase project, open **SQL Editor**, paste the contents of
[`20260926071225_administration_access.sql`](../supabase/migrations/20260926071225_administration_access.sql), and run it.
The original schema and RLS scripts must already have been applied. Do not rerun the demo seed.

Then open `/admin/settings` and click **Check setup again**. It should show **Ready**.
This update adds administrator-only employee editing, blocks self-promotion, prevents an
administrator removing their own access, checks manager cycles, and restricts inactive users'
data access. No data is deleted. The UI deliberately disables employee mutations until this
update is detected.

This migration has not been applied to the hosted project by the coding agent: the connected
Supabase account does not have access to that project. Run Supabase's Security Advisor after
applying it. Local regression tests cover authorization and the role/hierarchy guards.

## First administrator

The first administrator must be chosen by the project owner, not through public signup.
Create and confirm your account at `/signup`, then in Supabase **Table Editor → profiles**
find your email and change `application_role` to `administrator` and `is_active` to `true`.
Refresh the app. Your current screenshot already shows an administrator, so no bootstrap
change is needed for that account.

## Add an employee or administrator

1. Go to **Administration → Employees → Add Employee**.
2. Enter their full name, email, and initial password. Registration preserves your admin session.
3. If email confirmation is enabled, the employee must confirm their email before signing in.
4. Refresh the employee list and click **Edit** to set department, designation, employee code,
   reporting manager, and role.
5. To make them an administrator, select **Administrator**, acknowledge the access confirmation,
   and save. Their next page refresh loads the updated role.

Employees may also register themselves at `/signup`; all new registrations use the database's
employee default. Share the deployed app URL with other computers, not a localhost link.
An existing registered email is not recreated or assigned a new password by the registration form.
Supabase signup email limits and confirmation settings apply. No service-role key is shipped to
the browser. Staff can change their initial password through **My Profile** after signing in.

## Configure work and distribute tasks

- **Departments:** create/edit name and unique code; deactivate retired departments.
- **Task Types:** create/edit name, code, color, display order, and active status.
- **Channels:** create/edit name, platform, and active status.
- **Marketing Ads:** create/edit advertiser, package, non-negative daily target, description,
  validity dates, and active status. End date must not precede start date.
- **Settings:** check access setup, copy the registration link, review roles, and change your password.

Use **Daily Tasks → Add Assignment**, select the employee under **Assigned To**, choose the
work date and task details, and save. The employee sees it in **My Tasks** for that date.
Catalog changes invalidate the reference-data cache so assignment forms load updated options.
Deactivation preserves existing references instead of deleting task history.

## Validation

`npm run build` builds the application.
`npm run test:admin-db` exercises the actual administration migration in an isolated PostgreSQL
runtime with simulated authenticated users; it never touches the hosted database.
`npm run test:admin-ui` runs browser tests with mocked Supabase responses, without real emails,
accounts, or task writes. Hosted email delivery and production permissions still need a smoke
test after applying the migration.
