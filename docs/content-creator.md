# Content Creator

Apply `supabase/migrations/20260927155159_content_creator_approval.sql` after the existing schema, RLS, administration access, task work-time, and task completion migrations. It is independent of the Rush migration. This migration has been tested locally; it must also be applied to the Supabase project configured by `VITE_SUPABASE_URL` before using this feature.

- Active employees type directly into a blank sheet row with a name, caption, optional thumbnail URL, and a selected approver. A new blank row appears automatically, matching Daily Tasks. Use the row's Save, Send for approval, or Cancel icons; there is no Add button. The creator cannot select themselves.
- Save a draft or send it for approval. Only the creator may edit a draft or a package returned for changes.
- Only the selected approver can send feedback, request changes, or approve a submitted package. Any active employee can be selected as an approver.
- Approval requires a task type, assignee, and work date. The approver can choose a time section, including Unscheduled. Approval and creation of the Daily Task happen together in one database transaction.
- Feedback and submission history are retained across revisions. Approved packages are immutable, and their linked Daily Task cannot be deleted; its normal task fields can still be edited according to existing task permissions.
- The leftmost clapperboard icon on a Daily Task links to its approved source package. Approved packages are visible to active employees; drafts and pending packages are visible to their creator, selected approver, and administrators. Administrators cannot approve another person's package unless selected as its approver.

Validation: `node --test tests/content-approval-db.test.mjs` and `npx playwright test tests/browser/content-creator.spec.ts`.
