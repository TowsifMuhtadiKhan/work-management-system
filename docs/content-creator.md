# Content Creator

Apply `supabase/migrations/20260930152002_content_export_workflow.sql` after the existing Content Creator migrations (including the script column migration) before running this UI against Supabase.

- **Approved** has Ongoing and Done options. It is independent of export status.
- **Status** has Video panel and Export done options. Save an Export done row to open the Daily Task mapping dialog. Confirming the mapping saves the package and creates exactly one task in the same transaction. Cancel keeps the unsaved row available.
- **Creator name** lists active employees in an active department named `Content Creator` or `Content Creator Team` (case insensitive). Other employees are excluded; the database enforces the same membership rule.
- **Script** opens a large rich-text popup with formatting, links, lists, and undo/redo. Apply the editor changes, then save the row.
- **Thumbnail** accepts plain text/notes. Existing URLs remain stored as text.
- Filters combine creator, inclusive creation-date range (local calendar dates), and status, along with search.
- The creator and existing manager/admin roles can edit a saved package until export. Exported packages are immutable and retain their Daily Task link. Old approval/review history is retained in the database; previously approved packages become Done / Export done without creating duplicate tasks. Other old statuses become Ongoing / Video panel.

## Daily Task mapping

| Package / mapping field | Daily Task field |
| --- | --- |
| Package name | File name |
| Caption | Caption |
| Creator name + thumbnail text | Remarks (`Creator Thumb: text`) |
| Selected work date | Work date |
| Selected time section | Time slot (or Unscheduled) |
| Selected task type | Task type |
| Selected assigned person (defaults to creator) | Assigned person |
| Package ID | Content source link |

Tasks start Pending with Normal priority. Script stays on the linked source package.

Validation: `node --test tests/content-export-db.test.mjs`, `npx playwright test tests/browser/content-creator.spec.ts`, `npm run build`. The older `content-approval-db.test.mjs` continues to test the historical approval migration in isolation.
