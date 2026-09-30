# Digital and Web sections

The Tasks menu contains only Daily Task (Digital) and Daily Task (Web). Marketing contains Marketing (Digital) and Marketing (Web).

Apply `20260930153033_digital_web_sections.sql` after `20260930152002_content_export_workflow.sql`. Existing tasks, campaigns, and exported content packages default to Digital. Existing `/tasks` and `/marketing` URLs remain Digital aliases and preserve date links.

Each task and campaign has a Digital or Web section. New sheet rows inherit their page's section; campaign administration provides a Section dropdown. Task lists, marketing campaign lists, daily counts, and marketing-sheet totals are filtered by section. The database rejects a task linked to a campaign in another section. Campaign reports follow their campaign's tasks. Existing department and role permissions still apply; My Tasks and dashboard totals continue to cover both sections.

Content Creator export mapping includes Daily Task (Digital) / Daily Task (Web), defaults to Digital, and links to the selected destination after export.
