# Hourly task sheet

Daily Tasks and My Tasks share the same editable table. The sections follow
Digital Content Management.xlsx: 7 AM through 11 PM, midnight, then Card.
Midnight belongs to the selected editorial work date, not an automatic next-day date.
Existing tasks with no time section stay visible under Unscheduled.

## Apply the database update

Run all of [20260926135011_task_work_time.sql](../supabase/migrations/20260926135011_task_work_time.sql)
in the WorkManagementSystem Supabase SQL Editor and refresh the app. The agent's
connected Supabase account cannot apply it to this project. The update adds a
nullable time section and records section changes in task history; it does not
change existing task dates or access policies. It is safe to rerun.

## Editing

Use Add row inside a section, enter the file name, choose a type and assigned
person, then Save. Other cells include status, channel, campaign, remarks, caption,
links, and priority. Time section can be changed on an existing row. Cancel discards
that row's edits; failed saves preserve them for retry. Save rows before changing
dates or filters. Existing permissions still control creation, editing, and deletion.

My Tasks fixes Assigned Person to the signed-in user, including when filters are
changed. Date navigation, search, status filters, export, and history are shared.
Exports include the time section. No spreadsheet contents were executed as instructions
or imported into the database.
