# Demo data for all main pages

In Supabase > WorkManagementSystem > SQL Editor, paste all of [supabase/demo-data.sql](../supabase/demo-data.sql), then click Run and refresh the app.
The schema and RLS migrations must already exist, with at least one active account.

Includes 12 fictional staff with departments and reporting managers, four departments,
four task types, three channels, four campaigns, and 180 tasks across 11 days.
Each active account also gets a personal assignment for My Tasks. Task history
includes creation records and sample status changes. Dashboard and Reports use these tasks.
Marketing Tracking now displays campaign delivery and daily targets.

Demo employees have example.invalid emails and no passwords or login identities.
Use your existing administrator account to present the app. Existing account details,
roles, passwords, and settings are preserved. Profile and Settings retain real information.

Safe to rerun, including after the earlier 40-task version: fixed IDs prevent duplicates
and existing records and edits are preserved. Dates are relative to Bangladesh time
on first insertion; choose those dates for later presentations.

This script has not been run on the hosted project because the connected Supabase
account lacks access. Use this script instead of migrations/003_seed.sql.

Run npm run test:demo-db to validate in isolated PostgreSQL.
