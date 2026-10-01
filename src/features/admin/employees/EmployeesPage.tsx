import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  MoreVertical,
  Pencil,
  Plus,
  ShieldCheck,
  Trash2,
  Users,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fetchAllProfilesAdmin } from "@/services/profiles.service";
import { fetchDepartments } from "@/services/departments.service";
import {
  deleteEmployee,
  registerEmployee,
  saveEmployee,
} from "@/services/admin.service";
import { useAuth } from "@/hooks/useAuth";
import { APP_ROLE_LABELS } from "@/types/enums";
import type { AppRole } from "@/types/enums";
import type { Profile, Department } from "@/types/entities";
import { errorMessage } from "../adminConfig";
import { Pagination } from "@/components/common/Pagination";
import { useAdministrationReady } from "../useAdministrationReady";

const selectClass =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm";

export const MAX_ADMINS = 3; // 1 Main Admin + up to 2 additional admins

export function EmployeesPage() {
  const client = useQueryClient();
  const { user } = useAuth();
  const ready = useAdministrationReady();
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [editing, setEditing] = useState<Profile | null>(null);
  const [adding, setAdding] = useState(false);
  const profiles = useQuery({
    queryKey: ["admin-profiles"],
    queryFn: fetchAllProfilesAdmin,
  });
  const departments = useQuery({
    queryKey: ["departments"],
    queryFn: fetchDepartments,
  });
  const people = profiles.data ?? [];
  const adminCount = people.filter(
    (p) => p.is_active && p.application_role === "administrator",
  ).length;
  const visible = people.filter(
    (p) =>
      (role === "all" || p.application_role === role) &&
      `${p.full_name} ${p.email} ${p.employee_code ?? ""}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const paginatedEmployees = visible.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [role, search]);

  const saved = () => {
    setEditing(null);
    void client.invalidateQueries();
  };
  return (
    <div className="p-3 sm:p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">Employees & access</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your team, reporting structure, and administrator access.
          </p>
        </div>
        <Button disabled={!ready.data} onClick={() => setAdding(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Employee
        </Button>
      </div>
      {!ready.data && (
        <div role="status" className="rounded-lg border p-4 text-sm space-y-2">
          <p>
            {ready.isPending
              ? "Checking employee management access..."
              : "Employee management setup is required or could not be verified."}
          </p>
          <Link className="text-primary underline" to="/admin/settings">
            Open Settings for setup details
          </Link>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          ["Team members", people.length, Users],
          ["Active employees", people.filter((p) => p.is_active).length, Users],
          ["Administrators", `${adminCount} / ${MAX_ADMINS}`, ShieldCheck],
        ].map(([title, count, Icon]) => {
          const Symbol = Icon as typeof Users;
          return (
            <div key={String(title)} className="rounded-lg border bg-card p-4">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                {String(title)}
                <Symbol className="h-4 w-4" />
              </div>
              <p className="text-2xl font-semibold mt-2">{String(count)}</p>
            </div>
          );
        })}
      </div>
      <div className="rounded-lg border bg-blue-50/50 dark:bg-blue-950/20 p-4 text-sm">
        <p className="font-medium">
          Administrator Access (Limit: 1 Main Admin + at most 2 additional
          admins)
        </p>
        <p className="mt-1 text-muted-foreground">
          Currently {adminCount} of {MAX_ADMINS} administrator slots are in use.
          {adminCount < MAX_ADMINS
            ? " To add an administrator, choose Edit → Role → Administrator → Save changes."
            : " The maximum limit of 3 administrators is reached. An existing administrator must be demoted before another can be promoted."}{" "}
          <Link className="text-primary underline" to="/admin/settings">
            View role guide
          </Link>
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            aria-label="Search employees"
            placeholder="Search name, email, or employee code"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className={selectClass + " max-w-[200px]"}
          aria-label="Filter by role"
          value={role}
          onChange={(e) => setRole(e.target.value)}
        >
          <option value="all">All roles</option>
          {Object.entries(APP_ROLE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <Button
          variant="outline"
          disabled={profiles.isFetching}
          onClick={() => void profiles.refetch()}
        >
          Refresh list
        </Button>
      </div>
      {profiles.isPending ? (
        <p role="status">Loading employees...</p>
      ) : profiles.isError ? (
        <div role="alert">
          <p className="text-destructive">{errorMessage(profiles.error)}</p>
          <Button variant="outline" onClick={() => void profiles.refetch()}>
            Try again
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="rounded-lg border bg-card overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {[
                    "Employee",
                    "Code",
                    "Designation",
                    "Department",
                    "Manager",
                    "Role",
                    "Status",
                    "Actions",
                  ].map((label) => (
                    <TableHead key={label}>{label}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {!visible.length && (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="py-10 text-center text-muted-foreground"
                    >
                      No employees match these filters.
                    </TableCell>
                  </TableRow>
                )}
                {paginatedEmployees.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <p className="font-medium">
                        {p.full_name}
                        {p.id === user?.id && " (you)"}
                      </p>
                      <p className="text-xs text-muted-foreground">{p.email}</p>
                    </TableCell>
                    <TableCell>{p.employee_code ?? "—"}</TableCell>
                    <TableCell>{p.designation ?? "—"}</TableCell>
                    <TableCell>{p.department?.name ?? "—"}</TableCell>
                    <TableCell>{p.manager?.full_name ?? "—"}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          p.application_role === "administrator"
                            ? "default"
                            : "secondary"
                        }
                      >
                        {APP_ROLE_LABELS[p.application_role]}
                      </Badge>
                    </TableCell>
                    <TableCell>{p.is_active ? "Active" : "Inactive"}</TableCell>
                    <TableCell>
                      <Button
                        disabled={!ready.data}
                        size="sm"
                        variant="outline"
                        onClick={() => setEditing(p)}
                      >
                        <Pencil className="mr-2 h-3 w-3" />
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {visible.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalItems={visible.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
            />
          )}
        </div>
      )}
      {adding && (
        <AddEmployee
          onClose={() => setAdding(false)}
          onAdded={() => void client.invalidateQueries()}
          existing={people}
          departments={departments.data ?? []}
          departmentsReady={departments.isSuccess}
        />
      )}
      {editing && (
        <EmployeeEditor
          key={editing.id}
          profile={editing}
          people={people}
          departments={departments.data ?? []}
          departmentsReady={departments.isSuccess}
          currentId={user?.id}
          onClose={() => setEditing(null)}
          onSaved={saved}
        />
      )}
    </div>
  );
}

function AddEmployee({
  onClose,
  onAdded,
  existing,
  departments,
  departmentsReady,
}: {
  onClose: () => void;
  onAdded: () => void;
  existing: Profile[];
  departments: Department[];
  departmentsReady: boolean;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [designation, setDesignation] = useState("");
  const [department, setDepartment] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<string | null>(null);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (saving) return;
    setError("");
    if (!name.trim()) {
      setError("Full name is required.");
      return;
    }
    if (
      existing.some((p) => p.email.toLowerCase() === email.trim().toLowerCase())
    ) {
      setError(
        "This employee already exists. Close this form and edit their account instead.",
      );
      return;
    }
    setSaving(true);
    try {
      const data = await registerEmployee(
        name,
        email,
        password,
        designation,
        department,
      );
      setPassword("");
      setResult(
        data.needsConfirmation
          ? "Registration submitted. If this email is new, the employee will receive a confirmation link. After confirmation they can sign in."
          : "Account created with employee access and assigned to department. They can now sign in.",
      );
      onAdded();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !saving) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Employee</DialogTitle>
          <DialogDescription>
            Create an employee account without signing out of your administrator
            account.
          </DialogDescription>
        </DialogHeader>
        {result ? (
          <div className="space-y-4">
            <p role="status" className="text-sm">
              {result}
            </p>
            <Button onClick={onClose}>Done</Button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <fieldset disabled={saving} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="new-name">Full name</Label>
                <Input
                  id="new-name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new-email">Email address</Label>
                <Input
                  id="new-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new-department">Department</Label>
                <select
                  id="new-department"
                  className={selectClass}
                  disabled={!departmentsReady}
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                >
                  <option value="">Select department…</option>
                  {departments
                    .filter((d) => d.is_active)
                    .map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new-designation">Designation</Label>
                <Input
                  id="new-designation"
                  placeholder="e.g. Senior Content Producer"
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new-password">Initial password</Label>
                <Input
                  id="new-password"
                  type="password"
                  minLength={8}
                  required
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  At least 8 characters. Share this initial password with the
                  employee. Once signed in, they can reset and change their
                  password anytime from My Profile.
                </p>
              </div>
            </fieldset>
            <p className="text-xs text-muted-foreground">
              Alternatively, ask the employee to create their own account at{" "}
              <span className="break-all">{window.location.origin}/signup</span>
              . New accounts always start as employees.
            </p>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button disabled={saving}>
                {saving ? "Creating..." : "Create employee account"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function EmployeeEditor({
  profile,
  people,
  departments,
  departmentsReady,
  currentId,
  onClose,
  onSaved,
}: {
  profile: Profile;
  people: Profile[];
  departments: Department[];
  departmentsReady: boolean;
  currentId?: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(profile.full_name);
  const [code, setCode] = useState(profile.employee_code ?? "");
  const [designation, setDesignation] = useState(profile.designation ?? "");
  const [department, setDepartment] = useState(profile.department_id ?? "");
  const [manager, setManager] = useState(profile.manager_id ?? "");
  const [role, setRole] = useState<AppRole>(profile.application_role);
  const [active, setActive] = useState(profile.is_active);
  const [confirmed, setConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const ownAccount = profile.id === currentId;
  const isAlreadyAdmin = profile.application_role === "administrator";
  const activeOtherAdmins = people.filter(
    (p) =>
      p.is_active &&
      p.application_role === "administrator" &&
      p.id !== profile.id,
  ).length;
  const adminLimitReached = !isAlreadyAdmin && activeOtherAdmins >= MAX_ADMINS;
  const promoting = role === "administrator" && !isAlreadyAdmin;
  function createsCycle(managerId: string) {
    const visited = new Set([profile.id]);
    let next: string | null | undefined = managerId;
    while (next) {
      if (visited.has(next)) return true;
      visited.add(next);
      next = people.find((p) => p.id === next)?.manager_id;
    }
    return false;
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (saving) return;
    setError("");
    if (!name.trim()) {
      setError("Full name is required.");
      return;
    }
    if (createsCycle(manager)) {
      setError("Choose a manager outside this employee’s reporting chain.");
      return;
    }
    if (promoting && adminLimitReached) {
      setError(
        `Cannot promote to Administrator: maximum limit of ${MAX_ADMINS} administrators reached (1 Main Admin + up to 2 additional admins). Demote an existing administrator first.`,
      );
      return;
    }
    if (promoting && !confirmed) {
      setError("Confirm administrator access before saving.");
      return;
    }
    setSaving(true);
    try {
      await saveEmployee(profile.id, {
        full_name: name.trim(),
        employee_code: code.trim() || null,
        designation: designation.trim() || null,
        department_id: department || null,
        manager_id: manager || null,
        application_role: role,
        is_active: active,
      });
      toast.success("Employee updated");
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }
  async function remove() {
    if (
      saving ||
      ownAccount ||
      !window.confirm(
        `Permanently delete ${profile.full_name}'s account? This cannot be undone.`,
      )
    )
      return;
    setError("");
    setSaving(true);
    try {
      await deleteEmployee(profile.id);
      toast.success("Employee deleted");
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !saving) onClose();
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit employee</DialogTitle>
          <DialogDescription>{profile.email}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <fieldset disabled={saving} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit-name">Full name</Label>
              <Input
                id="edit-name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-code">Employee code</Label>
                <Input
                  id="edit-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-designation">Designation</Label>
                <Input
                  id="edit-designation"
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-department">Department</Label>
              <select
                id="edit-department"
                className={selectClass}
                disabled={!departmentsReady}
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
              >
                <option value="">No department</option>
                {departments
                  .filter((d) => d.is_active || d.id === department)
                  .map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                      {!d.is_active ? " (inactive)" : ""}
                    </option>
                  ))}
              </select>
              {!departmentsReady && (
                <p className="text-xs text-muted-foreground">
                  Departments are unavailable; the current department will be
                  kept.
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-manager">Reports to</Label>
              <select
                id="edit-manager"
                className={selectClass}
                value={manager}
                onChange={(e) => setManager(e.target.value)}
              >
                <option value="">No manager</option>
                {people
                  .filter(
                    (p) =>
                      p.id !== profile.id && (p.is_active || p.id === manager),
                  )
                  .map((p) => (
                    <option
                      key={p.id}
                      value={p.id}
                      disabled={createsCycle(p.id)}
                    >
                      {p.full_name} — {APP_ROLE_LABELS[p.application_role]}
                    </option>
                  ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-role">Role</Label>
              <select
                id="edit-role"
                className={selectClass}
                value={role}
                disabled={ownAccount}
                onChange={(e) => {
                  setRole(e.target.value as AppRole);
                  setConfirmed(false);
                }}
              >
                {Object.entries(APP_ROLE_LABELS).map(([value, label]) => {
                  const isAdminOption = value === "administrator";
                  const disableAdmin = isAdminOption && adminLimitReached;
                  return (
                    <option key={value} value={value} disabled={disableAdmin}>
                      {label}
                      {disableAdmin
                        ? ` (Limit reached: max ${MAX_ADMINS})`
                        : ""}
                    </option>
                  );
                })}
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={active}
                disabled={ownAccount}
                onChange={(e) => setActive(e.target.checked)}
              />
              Account is active
            </label>
            {ownAccount && (
              <p className="text-xs text-muted-foreground">
                Ask another administrator to change your role or deactivate your
                account.
              </p>
            )}
            {promoting && (
              <label className="flex items-start gap-2 rounded border border-amber-300 bg-amber-50 dark:bg-amber-950/20 p-3 text-sm">
                <input
                  type="checkbox"
                  className="mt-1"
                  required
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                />
                I confirm this person may manage employees, grant administrator
                access, and change all administrative records.
              </label>
            )}
          </fieldset>
          <div className="flex justify-end gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  disabled={saving || ownAccount}
                  title="More employee actions"
                  aria-label="More employee actions"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onSelect={() => void remove()}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete employee
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button disabled={saving}>
              {saving ? "Saving..." : "Save changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
