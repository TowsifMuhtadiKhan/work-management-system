import type { WorkSection } from "@/types/workSection";
import { taskCompletionError } from "@/utils/taskCompletion";
import { PlatformIcon } from "./PlatformIcon";
import { createContext, useContext, useEffect, useId, useState } from "react";
import type { CSSProperties } from "react";
import { createPortal } from "react-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Check,
  ChevronDown,
  History,
  Loader2,
  MoreVertical,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/utils/cn";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { fetchAssignableProfiles } from "@/services/profiles.service";
import { fetchTaskTypes } from "@/services/taskTypes.service";
import { fetchChannels } from "@/services/channels.service";
import { fetchMarketingAds } from "@/services/marketingAds.service";
import {
  createTask,
  updateTask,
  deleteTask,
  markTaskDone,
} from "@/services/tasks.service";
import { usePermissions } from "@/hooks/usePermissions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { TASK_STATUS_LABELS, TASK_PRIORITY_LABELS } from "@/types/enums";
import type { Task, Profile } from "@/types/entities";
import type { DbTaskInsert } from "@/types/database";
import { TaskHistoryDrawer } from "./TaskHistoryDrawer";
import { TIME_SLOTS, slotLabel } from "./timeSlots";
import { CaptionEditor } from "./CaptionEditor";
import { ContentSourceIcon } from "@/components/common/ContentSourceIcon";

type Option = { id: string; label: string; color?: string | null };
type Props = {
  section?: WorkSection;
  tasks: Task[];
  profile: Profile;
  workDate: string;
  mine: boolean;
  departmentId?: string;
};
const CellEditorContext = createContext<{
  host: HTMLDivElement | null;
  selected: string | null;
  select: (id: string) => void;
}>({ host: null, selected: null, select: () => {} });

export function TaskSheet({
  tasks,
  profile,
  workDate,
  mine,
  departmentId,
  section = "digital",
}: Props) {
  const queryClient = useQueryClient();
  const [history, setHistory] = useState<Task | null>(null);
  const [deletingTask, setDeletingTask] = useState<Task | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [editorHost, setEditorHost] = useState<HTMLDivElement | null>(null);
  const [selectedCell, setSelectedCell] = useState<string | null>(null);
  const permissions = usePermissions(profile);
  const people = useQuery({
    queryKey: ["assignable-profiles"],
    queryFn: fetchAssignableProfiles,
  });
  const types = useQuery({ queryKey: ["task-types"], queryFn: fetchTaskTypes });
  const channels = useQuery({ queryKey: ["channels"], queryFn: fetchChannels });
  const ads = useQuery({
    queryKey: ["marketing-ads", section],
    queryFn: () => fetchMarketingAds(section),
  });

  const rawPeople = people.data ?? [];
  const filteredPeople = departmentId
    ? rawPeople.filter((p) => p.department_id === departmentId)
    : rawPeople;
  const assignablePeople =
    filteredPeople.length > 0 ? filteredPeople : rawPeople;

  const STATUS_COLORS: Record<string, string> = {
    pending: "#b45309",
    assigned: "#1d4ed8",
    in_progress: "#d97706",
    done: "#047857",
    hold: "#c2410c",
    cancelled: "#e11d48",
  };

  const catalogs = {
    assigned_to: assignablePeople.map((p) => ({
      id: p.id,
      label: p.full_name,
    })),
    task_type_id: (types.data ?? []).map((t) => ({
      id: t.id,
      label: t.name,
      color: t.color_hex,
    })),
    channel_id: (channels.data ?? []).map((c) => ({
      id: c.id,
      label: c.name,
      color: c.color_hex,
    })),
    marketing_ad_id: (ads.data ?? []).map((a) => ({
      id: a.id,
      label: a.advertiser,
    })),
    status: Object.entries(TASK_STATUS_LABELS).map(([id, label]) => ({
      id,
      label,
      color: STATUS_COLORS[id],
    })),
    priority: Object.entries(TASK_PRIORITY_LABELS).map(([id, label]) => ({
      id,
      label,
    })),
  };
  return (
    <CellEditorContext.Provider
      value={{
        host: editorHost,
        selected: selectedCell,
        select: setSelectedCell,
      }}
    >
      <div className="task-sheet p-2 sm:p-4 space-y-4">
        <div
          data-cell-editor
          className="cell-editor-panel sticky top-0 z-20 w-full max-h-[40vh] overflow-y-auto rounded-lg border border-indigo-200 bg-background p-3 shadow-sm dark:border-indigo-800"
        >
          {selectedCell && (
            <Button
              variant="ghost"
              size="sm"
              className="mb-2"
              onClick={() => setSelectedCell(null)}
            >
              Close expanded editor
            </Button>
          )}
          <div ref={setEditorHost} className="empty:hidden" />
        </div>
        {[people, types, channels, ads].some((q) => q.isError) && (
          <p role="alert" className="text-destructive">
            Some dropdown options could not load. Refresh to try again.
          </p>
        )}
        {["", ...TIME_SLOTS].map((slot) => {
          const rows = tasks.filter((t) => (t.time_slot ?? "") === slot);
          const isCollapsed = collapsed[slot] ?? false;
          const contentId = `task-section-${mine ? "mine" : "daily"}-${slot || "unscheduled"}`;
          const canCreate = permissions.canCreateTask();
          if ((!slot || slot === "card") && !rows.length) return null;
          const hue = (38 + TIME_SLOTS.indexOf(slot) * 137.5) % 360;
          const sectionStyle = slot
            ? ({
                "--section-color": `hsl(${hue} 70% 28%)`,
                "--section-tint": `hsl(${hue} 85% 92%)`,
              } as CSSProperties)
            : undefined;
          return (
            <section
              key={slot}
              aria-label={slotLabel(slot)}
              style={sectionStyle}
              className="sheet-section rounded-xl border overflow-hidden shadow-sm"
            >
              <div className="sheet-section-heading flex items-center justify-between gap-3 px-4 py-3 border-b">
                <h2 className="flex-1 font-semibold text-sm">
                  <button
                    type="button"
                    aria-expanded={!isCollapsed}
                    aria-controls={contentId}
                    onClick={() =>
                      setCollapsed((previous) => ({
                        ...previous,
                        [slot]: !isCollapsed,
                      }))
                    }
                    className="flex w-full items-center gap-2 rounded text-left py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current"
                  >
                    <ChevronDown
                      aria-hidden="true"
                      className={`h-4 w-4 shrink-0 transition-transform ${isCollapsed ? "-rotate-90" : ""}`}
                    />
                    {slotLabel(slot)}{" "}
                    <span className="ml-1.5 inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold leading-4 text-blue-800 dark:bg-blue-950 dark:text-blue-200">
                      {rows.length} tasks
                    </span>
                  </button>
                </h2>
              </div>
              <div id={contentId} hidden={isCollapsed}>
                {rows.length || canCreate ? (
                  <div className="overflow-x-auto">
                    <table className="responsive-sheet w-full text-xs">
                      <thead className="sheet-columns">
                        <tr>
                          <th scope="col" className="w-10 px-1">
                            <span className="sr-only">Source</span>
                          </th>
                          {[
                            "File name",
                            "Type",
                            "Assigned person",
                            "Status",
                            "Channel / Page",
                            "Marketing ad",
                            "Remarks",
                            "Caption",
                            "YouTube link",
                            "Facebook link",
                            "Priority",
                            "Actions",
                          ].map((label) => (
                            <th
                              key={label}
                              className={`text-left px-2 py-1.5 whitespace-nowrap font-extrabold ${label === "Actions" ? "sheet-actions w-[68px] min-w-[68px] max-w-[68px] text-center whitespace-nowrap" : ""}`}
                            >
                              <span className="inline-flex items-center gap-1.5">
                                {(label === "YouTube link" ||
                                  label === "Facebook link") && (
                                  <PlatformIcon platform={label} />
                                )}
                                {label}
                              </span>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((task) => (
                          <SheetRow
                            section={section}
                            key={task.id}
                            task={task}
                            slot={slot}
                            profile={profile}
                            workDate={workDate}
                            mine={mine}
                            catalogs={catalogs}
                            editable={permissions.canEditTask(
                              task.assigned_to,
                              task.assigned_profile,
                            )}
                            onHistory={() => setHistory(task)}
                            onDelete={() => setDeletingTask(task)}
                          />
                        ))}
                        {canCreate && (
                          <DraftRows
                            section={section}
                            key={`${workDate}-${mine}-${profile.id}`}
                            slot={slot}
                            profile={profile}
                            workDate={workDate}
                            mine={mine}
                            catalogs={catalogs}
                            editable
                          />
                        )}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="px-4 py-3 text-xs text-muted-foreground">
                    No tasks in this section.
                  </p>
                )}
              </div>
            </section>
          );
        })}
        {history && (
          <TaskHistoryDrawer
            task={history}
            open
            onClose={() => setHistory(null)}
          />
        )}
        <AlertDialog
          open={!!deletingTask}
          onOpenChange={(open) => {
            if (!open && !isDeleting) setDeletingTask(null);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Task</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete{" "}
                <span className="font-semibold text-foreground">
                  "{deletingTask?.file_name}"
                </span>
                ? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                disabled={isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={async (e) => {
                  e.preventDefault();
                  if (!deletingTask || isDeleting) return;
                  setIsDeleting(true);
                  try {
                    await deleteTask(deletingTask.id);
                    await queryClient.invalidateQueries({
                      queryKey: ["tasks"],
                    });
                    await queryClient.invalidateQueries({
                      queryKey: ["daily-stats"],
                    });
                    await queryClient.invalidateQueries({
                      queryKey: ["tasks-by-employee"],
                    });
                    toast.success(`Task "${deletingTask.file_name}" deleted`);
                    setDeletingTask(null);
                  } catch {
                    toast.error("Unable to delete task. Please try again.");
                  } finally {
                    setIsDeleting(false);
                  }
                }}
              >
                {isDeleting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </CellEditorContext.Provider>
  );
}

type RowProps = {
  section?: WorkSection;
  task?: Task;
  slot: string;
  profile: Profile;
  workDate: string;
  mine: boolean;
  catalogs: Record<string, Option[]>;
  editable: boolean;
  onRemove?: () => void;
  onHistory?: () => void;
  onStartEditing?: () => void;
  onDelete?: () => void;
};

function DraftRows(props: RowProps) {
  const [ids, setIds] = useState(() => [crypto.randomUUID()]);
  return (
    <>
      {ids.map((id) => (
        <SheetRow
          key={id}
          {...props}
          onStartEditing={() => {
            const nextId = crypto.randomUUID();
            setIds((current) =>
              current.at(-1) === id ? [...current, nextId] : current,
            );
          }}
          onRemove={() => {
            const nextId = crypto.randomUUID();
            setIds((current) => {
              const remaining = current.filter((rowId) => rowId !== id);
              return current.at(-1) === id ? [...remaining, nextId] : remaining;
            });
          }}
        />
      ))}
    </>
  );
}

function SheetDropdown({
  field,
  value,
  options,
  disabled,
  canComplete,
  completionError,
  onChange,
  placeholder = "Select…",
  fallbackColor,
}: {
  field: string;
  value: string;
  options: Option[];
  disabled: boolean;
  canComplete: boolean;
  completionError?: string | null;
  onChange: (val: string) => void;
  placeholder?: string;
  fallbackColor?: string | null;
}) {
  const currentOption = options.find((o) => o.id === value);
  const displayLabel = currentOption?.label || (value ? value : placeholder);

  const activeColor =
    field === "task_type_id" || field === "channel_id"
      ? currentOption?.color || fallbackColor || null
      : null;

  const colorStyle = activeColor
    ? {
        backgroundColor: `${activeColor}18`,
        borderColor: `${activeColor}88`,
        color: activeColor,
        fontWeight: 600,
      }
    : undefined;

  const widthClass =
    field === "status"
      ? "w-[108px] min-w-[108px] max-w-[108px]"
      : field === "task_type_id"
        ? "w-[114px] min-w-[114px] max-w-[114px]"
        : field === "marketing_ad_id"
          ? "w-[124px] min-w-[124px] max-w-[124px]"
          : field === "priority"
            ? "w-24 min-w-24 max-w-24"
            : "min-w-32 max-w-44";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          data-field={field}
          data-value={value}
          aria-label={field.replaceAll("_", " ")}
          title={displayLabel}
          style={colorStyle}
          className={cn(
            "sheet-select h-9 flex items-center justify-between gap-1 rounded-md px-2.5 text-xs font-medium border bg-background text-foreground transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-60 disabled:cursor-not-allowed",
            widthClass,
          )}
        >
          <span className="truncate">{displayLabel}</span>
          <ChevronDown
            className="h-3.5 w-3.5 opacity-50 shrink-0 ml-1"
            aria-hidden="true"
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="min-w-[150px] max-h-64 overflow-y-auto rounded-xl p-1 shadow-lg border bg-popover text-popover-foreground z-50"
      >
        <DropdownMenuItem
          className="flex items-center justify-between py-1.5 px-3 text-xs cursor-pointer rounded-lg hover:bg-accent focus:bg-accent"
          onSelect={() => onChange("")}
          onClick={() => onChange("")}
        >
          <span className="text-muted-foreground">{placeholder}</span>
          {!value && (
            <Check
              className="h-4 w-4 text-blue-600 dark:text-blue-400"
              aria-hidden="true"
            />
          )}
        </DropdownMenuItem>
        {options.map((o) => {
          const isSelected = value === o.id;
          const isOptionDisabled =
            field === "status" &&
            o.id === "done" &&
            (!canComplete || !!completionError);
          return (
            <DropdownMenuItem
              key={o.id}
              disabled={isOptionDisabled}
              className="flex items-center justify-between py-1.5 px-3 text-xs cursor-pointer rounded-lg hover:bg-accent focus:bg-accent disabled:opacity-40 disabled:cursor-not-allowed"
              onSelect={() => onChange(o.id)}
              onClick={() => onChange(o.id)}
            >
              <span
                className="font-medium truncate mr-2"
                style={
                  o.color ? { color: o.color, fontWeight: 600 } : undefined
                }
              >
                {o.label}
              </span>
              {isSelected && (
                <Check
                  className={cn(
                    "h-4 w-4 shrink-0",
                    !o.color && "text-blue-600 dark:text-blue-400",
                  )}
                  style={o.color ? { color: o.color } : undefined}
                  aria-hidden="true"
                />
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SheetRow({
  section = "digital",
  task,
  slot,
  profile,
  workDate,
  mine,
  catalogs,
  editable,
  onRemove,
  onHistory,
  onStartEditing,
  onDelete,
}: RowProps) {
  const cellEditor = useContext(CellEditorContext);
  const rowId = useId();
  const [focusedField, setFocusedField] = useState<string>("file_name");
  const queryClient = useQueryClient();
  const [changes, setChanges] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const handleChange = (field: string, value: string) => {
    setChanges((v) => ({ ...v, [field]: value }));
    if (value.trim()) onStartEditing?.();
  };
  const defaults: DbTaskInsert = {
    work_section: section,
    work_date: workDate,
    time_slot: slot || null,
    file_name: "",
    task_type_id: "",
    assigned_to: mine ? profile.id : "",
    status: "pending",
    priority: "normal",
    channel_id: null,
    marketing_ad_id: null,
    remarks: null,
    caption: null,
    youtube_link: null,
    facebook_link: null,
    google_drive_link: null,
    created_by: profile.id,
  };
  const form = { ...defaults, ...task, ...changes };
  const dirty = Object.keys(changes).length > 0;
  const completionError = taskCompletionError(form);
  const canComplete =
    profile.is_active &&
    (task?.assigned_to ?? form.assigned_to) === profile.id &&
    form.assigned_to === profile.id;
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (dirty) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  const refresh = async () => {
    await Promise.all(
      [
        "tasks",
        "daily-stats",
        "tasks-by-employee",
        "marketing-progress",
        "task-history",
      ].map((key) => queryClient.invalidateQueries({ queryKey: [key] })),
    );
  };
  const notifyError = (msg: string) => {
    setError(msg);
    toast.error(msg);
  };
  const save = async () => {
    if (!form.file_name.trim() || !form.task_type_id || !form.assigned_to) {
      notifyError("Enter file name, type, and assigned person.");
      return;
    }
    if (form.status === "done" && completionError) {
      notifyError(completionError);
      return;
    }
    for (const key of [
      "youtube_link",
      "facebook_link",
      "google_drive_link",
    ] as const) {
      const value = form[key]?.trim();
      if (value) {
        try {
          if (!["http:", "https:"].includes(new URL(value).protocol))
            throw new Error();
        } catch {
          notifyError("Links must be valid http or https URLs.");
          return;
        }
      }
    }
    setSaving(true);
    setError("");
    try {
      // Send only edited fields on updates so untouched cells keep remote changes.
      const payload = Object.fromEntries(
        Object.entries(task ? changes : { ...defaults, ...changes }).map(
          ([key, value]) => [
            key,
            typeof value === "string" ? value.trim() || null : value,
          ],
        ),
      );
      if (task)
        await updateTask(task.id, { ...payload, updated_by: profile.id });
      else await createTask(payload as DbTaskInsert);
      await refresh();
      setChanges({});
      onRemove?.();
      toast.success("Row saved");
    } catch (e) {
      const message =
        e && typeof e === "object" && "message" in e
          ? String(e.message)
          : "Unable to save row";
      notifyError(
        /time_slot/.test(message)
          ? "Apply the task_work_time SQL update in Supabase, then retry. Your row has been kept."
          : message,
      );
    } finally {
      setSaving(false);
    }
  };
  const fields = [
    "file_name",
    "task_type_id",
    "assigned_to",
    "status",
    "channel_id",
    "marketing_ad_id",
    "remarks",
    "caption",
    "youtube_link",
    "facebook_link",
    "priority",
  ] as const;
  return (
    <tr
      data-status={form.status}
      data-dirty={dirty}
      className="sheet-row border-b align-top"
    >
      <td data-label="Source" className="p-1.5">
        <ContentSourceIcon packageId={task?.source_content_id} />
      </td>
      {fields.map((field) => {
        const value = String(form[field] ?? "");
        const rawOptions = catalogs[field];
        const options = rawOptions ? [...rawOptions] : undefined;
        if (options && value && !options.some((o) => o.id === value)) {
          const fallback =
            field === "assigned_to"
              ? (task?.assigned_profile?.full_name ?? profile.full_name)
              : field === "task_type_id"
                ? (task?.task_type?.name ?? value)
                : field === "channel_id"
                  ? (task?.channel?.name ?? value)
                  : (task?.marketing_ad?.advertiser ?? value);
          options.unshift({ id: value, label: fallback });
        }
        const disabled =
          !editable || saving || (mine && field === "assigned_to");
        const fieldColor =
          field === "task_type_id" || field === "channel_id"
            ? field === "task_type_id"
              ? task?.task_type?.color_hex
              : task?.channel?.color_hex
            : null;
        return (
          <td
            key={field}
            data-label={field.replaceAll("_", " ")}
            className="p-1.5"
          >
            {field === "caption" ? (
              <CaptionEditor
                value={value}
                disabled={disabled}
                onChange={(caption) => handleChange("caption", caption)}
              />
            ) : options ? (
              <SheetDropdown
                field={field}
                value={value}
                options={options}
                disabled={disabled}
                canComplete={canComplete}
                completionError={completionError}
                fallbackColor={fieldColor}
                onChange={(val) => handleChange(field, val)}
              />
            ) : (
              <>
                <Input
                  data-cell-editor={disabled ? undefined : true}
                  aria-label={field.replaceAll("_", " ")}
                  title={value}
                  className={`${field === "file_name" ? "min-w-64" : "min-w-48"} text-xs ${cellEditor.selected === rowId && focusedField === field ? "ring-2 ring-indigo-500 bg-indigo-50 dark:bg-indigo-950/30" : ""}`}
                  value={value}
                  readOnly={disabled}
                  onFocus={() => {
                    if (!disabled) {
                      setFocusedField(field);
                      cellEditor.select(rowId);
                    }
                  }}
                  onChange={(e) => handleChange(field, e.target.value)}
                />
                {cellEditor.host &&
                  cellEditor.selected === rowId &&
                  focusedField === field &&
                  createPortal(
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <label
                          htmlFor={`${rowId}-full-cell`}
                          className="font-semibold text-indigo-700 dark:text-indigo-300"
                        >
                          {field.replaceAll("_", " ")} · {slotLabel(slot)}
                        </label>
                        <span className="text-muted-foreground">
                          {disabled
                            ? "Read only"
                            : "Changes apply to this row. Click Save when finished."}
                        </span>
                      </div>
                      <textarea
                        id={`${rowId}-full-cell`}
                        aria-label={`Full ${field.replaceAll("_", " ")}`}
                        value={value}
                        readOnly={disabled}
                        rows={3}
                        className="w-full resize-y rounded-md border bg-background p-2 text-sm leading-relaxed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                        style={{ overflowWrap: "anywhere" }}
                        onChange={(e) =>
                          handleChange(
                            field,
                            e.target.value.replace(
                              /[\r\n]+/g,
                              field === "remarks" ? "\n" : " ",
                            ),
                          )
                        }
                      />
                    </div>,
                    cellEditor.host,
                  )}
              </>
            )}
          </td>
        );
      })}
      <td
        data-label="Actions"
        className="sheet-actions p-1 text-center w-[68px] min-w-[68px] max-w-[68px]"
      >
        <div className="flex items-center justify-center">
          {(task || editable) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="relative h-7 w-7 text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label="Actions"
                  title={dirty ? "Actions (unsaved changes)" : "Actions"}
                >
                  {saving ? (
                    <Loader2
                      className="h-4 w-4 animate-spin text-muted-foreground"
                      aria-hidden="true"
                    />
                  ) : (
                    <span className="relative inline-flex items-center justify-center">
                      <MoreVertical className="h-4 w-4" aria-hidden="true" />
                      {dirty && (
                        <span
                          className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-amber-400 ring-1.5 ring-background"
                          aria-hidden="true"
                        />
                      )}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-40 rounded-xl p-1 shadow-lg border bg-popover text-popover-foreground z-50"
              >
                {editable && (dirty || !task) && (
                  <>
                    <DropdownMenuItem
                      className="text-xs font-medium text-emerald-600 focus:text-emerald-700 focus:bg-emerald-50 dark:focus:bg-emerald-950/40 cursor-pointer rounded-lg"
                      disabled={saving || !dirty}
                      onClick={() => void save()}
                    >
                      <Save
                        className="mr-2 h-3.5 w-3.5 text-emerald-600"
                        aria-hidden="true"
                      />
                      Save
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-xs text-muted-foreground hover:text-foreground cursor-pointer rounded-lg"
                      disabled={saving || !dirty}
                      onClick={() => {
                        setChanges({});
                        setError("");
                        onRemove?.();
                      }}
                    >
                      <X className="mr-2 h-3.5 w-3.5" aria-hidden="true" />
                      Discard
                    </DropdownMenuItem>
                    {task && <DropdownMenuSeparator />}
                  </>
                )}
                {task && canComplete && task.status !== "done" && (
                  <DropdownMenuItem
                    className="text-xs font-medium text-emerald-600 focus:text-emerald-700 focus:bg-emerald-50 dark:focus:bg-emerald-950/40 cursor-pointer rounded-lg"
                    disabled={saving || dirty || !!completionError}
                    onClick={async () => {
                      if (dirty) {
                        toast.warning(
                          "Save or cancel row edits before marking done.",
                        );
                        return;
                      }
                      if (completionError) {
                        toast.error(completionError);
                        return;
                      }
                      setSaving(true);
                      setError("");
                      try {
                        await markTaskDone(task.id, profile.id);
                        await refresh();
                        toast.success("Task marked as done");
                      } catch {
                        notifyError(
                          "Unable to mark done. The task may have been reassigned. Refresh and try again.",
                        );
                      } finally {
                        setSaving(false);
                      }
                    }}
                  >
                    <Check
                      className="mr-2 h-3.5 w-3.5 text-emerald-600"
                      aria-hidden="true"
                    />
                    Mark as done
                  </DropdownMenuItem>
                )}
                {task && (
                  <DropdownMenuItem
                    className="text-xs cursor-pointer rounded-lg"
                    onClick={onHistory}
                  >
                    <History
                      className="mr-2 h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400"
                      aria-hidden="true"
                    />
                    History
                  </DropdownMenuItem>
                )}
                {task &&
                  !task.source_content_id &&
                  profile.application_role === "administrator" && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-xs text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer rounded-lg"
                        disabled={saving}
                        onClick={onDelete}
                      >
                        <Trash2
                          className="mr-2 h-3.5 w-3.5"
                          aria-hidden="true"
                        />
                        Delete
                      </DropdownMenuItem>
                    </>
                  )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {dirty && <span className="sr-only">Unsaved changes</span>}
          {error && (
            <p role="alert" className="sr-only">
              {error}
            </p>
          )}
        </div>
      </td>
    </tr>
  );
}
