import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronDown, Save, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { DraftRowActions } from "@/components/common/SheetDraftRows";
import {
  CONTENT_STATUS_LABELS,
  saveContentPackage,
  type ContentPackage,
  type PackageValues,
  type ApprovalValues,
} from "@/services/contentPackages.service";
import { fetchTaskTypes } from "@/services/taskTypes.service";
import { CaptionEditor } from "@/features/tasks/CaptionEditor";
import { TIME_SLOTS, slotLabel } from "@/features/tasks/timeSlots";
import { todayISO } from "@/utils/date";

const fieldClass =
  "w-full rounded-md border bg-background px-2 py-2 text-sm disabled:opacity-60";

function PackageDropdown({
  label,
  value,
  options,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  options: Record<string, string>;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={label}
          disabled={disabled}
          className="sheet-select h-9 w-full flex items-center justify-between gap-1 rounded-md px-2.5 text-xs font-medium border bg-background text-foreground transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <span className="truncate">{options[value]}</span>
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
        {Object.entries(options).map(([id, text]) => (
          <DropdownMenuItem
            key={id}
            onSelect={() => onChange(id)}
            className="flex items-center justify-between py-1.5 px-3 text-xs cursor-pointer rounded-lg hover:bg-accent focus:bg-accent"
          >
            <span className="font-medium truncate mr-2">{text}</span>
            {value === id && (
              <Check
                className="h-4 w-4 text-blue-600 dark:text-blue-400"
                aria-hidden="true"
              />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface Props extends Partial<DraftRowActions> {
  entry?: ContentPackage;
  userId: string;
  canApprove: boolean;
  canEditContent: boolean;
  isAdmin: boolean;
  people: { id: string; full_name: string }[];
  unavailable: boolean;
  highlighted?: boolean;
}

export function ContentPackageRow({
  entry,
  userId,
  canApprove,
  canEditContent,
  isAdmin,
  people,
  unavailable,
  highlighted,
  onStartEditing,
  onRemove,
}: Props) {
  const client = useQueryClient();
  const [changes, setChanges] = useState<Partial<PackageValues>>({});
  const [base, setBase] = useState<ContentPackage>();
  const [error, setError] = useState("");
  const [mappingOpen, setMappingOpen] = useState(false);
  const original = base ?? entry;
  const values: PackageValues = {
    package_name: original?.package_name ?? "",
    creator_id:
      original?.creator_id ??
      (people.some((p) => p.id === userId) ? userId : ""),
    script: original?.script ?? "",
    caption: original?.caption ?? "",
    thumbnail_url: original?.thumbnail_url ?? "",
    approval_state: original?.approval_state ?? "ongoing",
    status: original?.status ?? "video_panel",
    ...changes,
  };
  const [mapping, setMapping] = useState<ApprovalValues>({
    work_section: "digital",
    work_date: todayISO(),
    time_slot: "08:00",
    task_type_id: "",
    assigned_to: null,
  });
  const types = useQuery({
    queryKey: ["task-types"],
    queryFn: fetchTaskTypes,
    enabled: mappingOpen,
  });
  const dirty = Object.keys(changes).length > 0;
  const canEditDetails =
    (canEditContent && (!entry || entry.creator_id === userId)) || isAdmin;
  const canSaveApproval =
    !!entry && entry.status !== "export_done" && canApprove;
  const editable = canEditDetails || canSaveApproval;
  const change = <K extends keyof PackageValues>(
    field: K,
    value: PackageValues[K],
  ) => {
    setBase((current) => current ?? entry);
    setChanges((current) => ({ ...current, [field]: value }));
    onStartEditing?.();
  };
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
  const mutation = useMutation({
    mutationFn: () =>
      saveContentPackage(values, original, {
        ...mapping,
        assigned_to: null,
      }),
    onSuccess: (saved) => {
      client.setQueryData<ContentPackage[]>(
        ["content-packages", userId],
        (current) =>
          entry
            ? (current ?? []).map((row) => (row.id === saved.id ? saved : row))
            : [saved, ...(current ?? [])],
      );
      setChanges({});
      setBase(undefined);
      setError("");
      setMappingOpen(false);
      onRemove?.();
      toast.success(
        saved.status === "export_done"
          ? "Export done  added to Daily Tasks"
          : "Package saved",
      );
      for (const key of [
        "content-packages",
        "tasks",
        "daily-stats",
        "tasks-by-employee",
      ])
        void client.invalidateQueries({ queryKey: [key] });
    },
    onError: () =>
      setError(
        "Unable to save. Your changes are kept. Check the creator and mapping, or refresh if this package changed.",
      ),
  });
  const save = () => {
    setError("");
    if (
      !values.package_name.trim() ||
      !people.some((p) => p.id === values.creator_id)
    ) {
      setError(
        "Enter a package name and select a Content Creator team member.",
      );
      return;
    }
    if (values.status === "export_done") {
      if (!mappingOpen) {
        setMappingOpen(true);
        return;
      }
      if (!mapping.work_date || !mapping.task_type_id) {
        setError("Choose a work date and task type.");
        return;
      }
    }
    if (!mutation.isPending && !unavailable) mutation.mutate();
  };
  const disabled = mutation.isPending || !canEditDetails;
  return (
    <tr
      id={entry ? `package-${entry.id}` : undefined}
      className={`align-top border-b ${highlighted ? "bg-accent" : ""}`}
    >
      <td data-label="PKG name" className="border p-1.5">
        <Input
          aria-label="PKG name"
          maxLength={300}
          value={values.package_name}
          disabled={disabled}
          onChange={(e) => change("package_name", e.target.value)}
        />
      </td>
      <td data-label="Creator name" className="border p-1.5">
        <select
          aria-label="Creator name"
          className={fieldClass}
          value={values.creator_id}
          disabled={disabled}
          onChange={(e) => change("creator_id", e.target.value)}
        >
          <option value="">Select creator</option>
          {original && !people.some((p) => p.id === original.creator_id) && (
            <option value={original.creator_id} disabled>
              {original.creator?.full_name ?? "Previous creator"} (unavailable)
            </option>
          )}
          {people.map((p) => (
            <option key={p.id} value={p.id}>
              {p.full_name}
            </option>
          ))}
        </select>
      </td>
      <td data-label="Script" className="border p-1.5">
        <CaptionEditor
          label="Script"
          value={values.script}
          onChange={(value) => change("script", value)}
          disabled={disabled}
        />
      </td>
      <td data-label="Approved" className="border p-1.5">
        <PackageDropdown
          label="Approved"
          value={values.approval_state}
          disabled={mutation.isPending || !canSaveApproval}
          options={{ ongoing: "Ongoing", done: "Done" }}
          onChange={(value) =>
            change("approval_state", value as PackageValues["approval_state"])
          }
        />
      </td>
      <td data-label="Status" className="border p-1.5">
        <PackageDropdown
          label="Status"
          value={values.status}
          disabled={disabled}
          options={CONTENT_STATUS_LABELS}
          onChange={(value) =>
            change("status", value as PackageValues["status"])
          }
        />
      </td>
      <td data-label="Caption" className="border p-1.5">
        <textarea
          aria-label="Caption"
          rows={2}
          className={fieldClass}
          value={values.caption}
          disabled={disabled}
          onChange={(e) => change("caption", e.target.value)}
        />
      </td>
      <td data-label="Thumbnail" className="border p-1.5">
        <textarea
          aria-label="Thumbnail"
          placeholder="Thumbnail text / notes"
          rows={2}
          className={fieldClass}
          value={values.thumbnail_url}
          disabled={disabled}
          onChange={(e) => change("thumbnail_url", e.target.value)}
        />
      </td>
      <td data-label="Actions" className="border p-1.5">
        <div className="flex flex-wrap gap-1">
          {editable && (
            <>
              <Button
                size="icon"
                variant="ghost"
                aria-label="Save package"
                title="Save package"
                disabled={!dirty || unavailable || mutation.isPending}
                onClick={save}
              >
                <Save className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                aria-label="Discard changes"
                disabled={!dirty || mutation.isPending}
                onClick={() => {
                  setChanges({});
                  setBase(undefined);
                  setError("");
                  onRemove?.();
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </>
          )}
          {entry?.task_id && (
            <Link
              className="text-primary underline text-xs"
              to={`/tasks/${entry.work_section ?? "digital"}?date=${entry.work_date}`}
            >
              View Daily Task
            </Link>
          )}
        </div>
        {error && (
          <p role="alert" className="text-xs text-destructive">
            {error}
          </p>
        )}
        <Dialog
          open={mappingOpen}
          onOpenChange={(open) => {
            if (!mutation.isPending) {
              setMappingOpen(open);
              setError("");
            }
          }}
        >
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Export done  Daily Task mapping</DialogTitle>
              <DialogDescription>
                The package name becomes the task file name. Caption is copied,
                and creator name and thumbnail text go into remarks.
              </DialogDescription>
            </DialogHeader>
            <fieldset
              disabled={mutation.isPending}
              className="grid grid-cols-1 sm:grid-cols-2 gap-4"
            >
              <label className="text-sm space-y-1">
                Daily Task section
                <select
                  aria-label="Daily Task section"
                  className={fieldClass}
                  value={mapping.work_section ?? "digital"}
                  onChange={(e) =>
                    setMapping({
                      ...mapping,
                      work_section: e.target.value as "digital" | "web",
                    })
                  }
                >
                  <option value="digital">Daily Task (Digital)</option>
                  <option value="web">Daily Task (Web)</option>
                </select>
              </label>
              <label className="text-sm space-y-1">
                Work date
                <Input
                  type="date"
                  value={mapping.work_date ?? ""}
                  onChange={(e) =>
                    setMapping({ ...mapping, work_date: e.target.value })
                  }
                />
              </label>
              <label className="text-sm space-y-1">
                Time section
                <select
                  aria-label="Time section"
                  className={fieldClass}
                  value={mapping.time_slot ?? ""}
                  onChange={(e) =>
                    setMapping({
                      ...mapping,
                      time_slot: e.target.value || null,
                    })
                  }
                >
                  <option value="">Unscheduled</option>
                  {TIME_SLOTS.map((slot) => (
                    <option key={slot} value={slot}>
                      {slotLabel(slot)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm space-y-1">
                Task type
                <select
                  aria-label="Task type"
                  className={fieldClass}
                  value={mapping.task_type_id ?? ""}
                  onChange={(e) =>
                    setMapping({ ...mapping, task_type_id: e.target.value })
                  }
                >
                  <option value="">Select type</option>
                  {(types.data ?? []).map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </label>
            </fieldset>
            {types.isError && (
              <p role="alert" className="text-destructive">
                Unable to load mapping options. Close and retry.
              </p>
            )}
            {error && (
              <p role="alert" className="text-destructive">
                {error}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                disabled={mutation.isPending}
                onClick={() => setMappingOpen(false)}
              >
                Cancel
              </Button>
              <Button
                disabled={mutation.isPending || unavailable || !types.isSuccess}
                onClick={save}
              >
                {mutation.isPending
                  ? "Saving..."
                  : "Export & add to Daily Tasks"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </td>
    </tr>
  );
}
