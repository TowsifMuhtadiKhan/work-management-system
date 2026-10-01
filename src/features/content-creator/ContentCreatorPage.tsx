import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import {
  CONTENT_STATUS_LABELS,
  fetchContentCreators,
  fetchContentPackages,
} from "@/services/contentPackages.service";
import { SheetDraftRows } from "@/components/common/SheetDraftRows";
import { captionText } from "@/utils/caption";
import { format } from "date-fns";
import { ContentPackageRow } from "./ContentPackageRow";

export function ContentCreatorPage() {
  const { user } = useAuth();
  const profile = useProfile(user?.id);
  const isContentCreatorDepartment = [
    "content creator",
    "content creator team",
  ].includes(profile.data?.department?.name?.trim().toLowerCase() ?? "");
  const isInchargeDepartment =
    profile.data?.department?.name?.trim().toLowerCase() === "incharge";
  const isAdmin = profile.data?.application_role === "administrator";
  const canAccess = profile.data?.is_active === true;
  const canApprove = isAdmin || isInchargeDepartment;
  const canEditContent = isAdmin || isContentCreatorDepartment;
  const [params] = useSearchParams();
  const people = useQuery({
    queryKey: ["content-creators"],
    queryFn: fetchContentCreators,
    enabled: !!user && profile.isSuccess && canAccess,
  });
  const query = useQuery({
    queryKey: ["content-packages", user?.id],
    queryFn: fetchContentPackages,
    enabled: !!user && profile.isSuccess && canAccess,
    refetchInterval: 30000,
  });
  const [view, setView] = useState("all");
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [creatorFilter, setCreatorFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const packages = query.data ?? [];
  const activeFilters =
    Number(creatorFilter !== "all") +
    Number(statusFilter !== "all") +
    Number(!!fromDate) +
    Number(!!toDate);
  const rows = packages.filter((entry) => {
    if (view === "mine" && entry.creator_id !== user?.id) return false;
    if (creatorFilter !== "all" && entry.creator_id !== creatorFilter)
      return false;
    if (statusFilter !== "all" && entry.status !== statusFilter) return false;
    const date = format(new Date(entry.created_at), "yyyy-MM-dd");
    if ((fromDate && date < fromDate) || (toDate && date > toDate))
      return false;
    const q = search.trim().toLowerCase();
    return (
      !q ||
      [
        entry.package_name,
        captionText(entry.script),
        entry.caption,
        entry.thumbnail_url,
        entry.creator?.full_name,
      ].some((value) => value?.toLowerCase().includes(q))
    );
  });
  if (profile.isSuccess && !canAccess) {
    return (
      <div className="p-6" role="alert">
        <h1 className="text-xl font-bold">Content Creator access required</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Only Content Creator team members and administrators can use this
          section.
        </p>
      </div>
    );
  }
  return (
    <div className="p-3 sm:p-6 space-y-4">
      <div>
        <h1 id="content-packages-title" className="text-xl font-bold">
          Content Creator PKG List
        </h1>
        <p className="text-sm text-muted-foreground">
          Fill in a blank row and save. Choose Export done to map the package to
          Daily Tasks.
        </p>
      </div>
      <div className="flex flex-wrap justify-between gap-2">
        <div className="flex gap-2">
          {[
            ["all", "All packages"],
            ["mine", "My packages"],
          ].map(([value, label]) => (
            <Button
              key={value}
              variant={view === value ? "default" : "outline"}
              aria-pressed={view === value}
              onClick={() => setView(value)}
            >
              {label}
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Input
            aria-label="Search packages"
            placeholder="Search packages, script, caption..."
            className="w-60"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Button
            variant="outline"
            aria-expanded={showFilters}
            onClick={() => setShowFilters((v) => !v)}
          >
            <SlidersHorizontal className="h-4 w-4 mr-2" />
            Filters{activeFilters > 0 ? ` (${activeFilters})` : ""}
          </Button>
          <Button
            variant="outline"
            disabled={query.isFetching || people.isFetching}
            onClick={() => {
              void query.refetch();
              void people.refetch();
            }}
          >
            Refresh
          </Button>
        </div>
      </div>
      <Dialog open={showFilters} onOpenChange={setShowFilters}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Filter packages</DialogTitle>
            <DialogDescription>
              Filter packages by creation date, creator, and status.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-sm">
              Creator
              <select
                aria-label="Filter by creator"
                className="w-full rounded-md border bg-background p-2"
                value={creatorFilter}
                onChange={(e) => setCreatorFilter(e.target.value)}
              >
                <option value="all">All Creators</option>
                {(people.data ?? []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-sm">
              Status
              <select
                aria-label="Filter by status"
                className="w-full rounded-md border bg-background p-2"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Statuses</option>
                {Object.entries(CONTENT_STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-sm">
              From date
              <Input
                aria-label="From date"
                type="date"
                value={fromDate}
                max={toDate || undefined}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </label>
            <label className="space-y-1 text-sm">
              To date
              <Input
                aria-label="To date"
                type="date"
                value={toDate}
                min={fromDate || undefined}
                onChange={(e) => setToDate(e.target.value)}
              />
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                setCreatorFilter("all");
                setStatusFilter("all");
                setFromDate("");
                setToDate("");
                setSearch("");
              }}
            >
              Clear all
            </Button>
            <Button onClick={() => setShowFilters(false)}>Apply filters</Button>
          </div>
        </DialogContent>
      </Dialog>
      {query.isError && (
        <p role="alert" className="text-destructive">
          Unable to load packages. Your unsaved rows are kept. Refresh to retry.
        </p>
      )}
      {query.isPending && <p role="status">Loading packages...</p>}
      {people.isError && (
        <p role="alert" className="text-destructive">
          Unable to load Content Creator team members. Refresh to retry.
        </p>
      )}
      {people.isSuccess && !people.data.length && (
        <p role="status">
          No active members in the Content Creator team. Assign employees to the
          Content Creator department to select them here.
        </p>
      )}
      <div className="overflow-x-auto rounded-md border">
        <table
          aria-labelledby="content-packages-title"
          className="responsive-sheet w-full min-w-[1350px] table-fixed border-collapse text-sm"
        >
          <thead className="bg-muted">
            <tr>
              {[
                "PKG name",
                "Creator name",
                "Script",
                "Approved",
                "Status",
                "Caption",
                "Thumbnail",
                "Actions",
              ].map((label) => (
                <th
                  scope="col"
                  key={label}
                  className="border px-3 py-2 text-left uppercase"
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {user &&
              rows.map((entry) => (
                <ContentPackageRow
                  key={entry.id}
                  entry={entry}
                  userId={user.id}
                  canApprove={canApprove}
                  canEditContent={canEditContent}
                  isAdmin={isAdmin}
                  people={people.data ?? []}
                  highlighted={params.get("package") === entry.id}
                  unavailable={!query.isSuccess || !people.isSuccess}
                />
              ))}
            {user && canEditContent && (
              <SheetDraftRows>
                {(actions) => (
                  <ContentPackageRow
                    userId={user.id}
                    canApprove={canApprove}
                    canEditContent={canEditContent}
                    isAdmin={isAdmin}
                    people={people.data ?? []}
                    unavailable={!query.isSuccess || !people.isSuccess}
                    {...actions}
                  />
                )}
              </SheetDraftRows>
            )}
          </tbody>
        </table>
      </div>
      {query.isSuccess && !rows.length && (
        <p className="text-sm text-muted-foreground">
          {packages.length
            ? "No packages match these filters."
            : "Start typing in the blank row to create a package."}
        </p>
      )}
      {params.has("package") &&
        query.isSuccess &&
        !packages.some((p) => p.id === params.get("package")) && (
          <p role="alert">
            This package is unavailable or you do not have access.
          </p>
        )}
    </div>
  );
}
