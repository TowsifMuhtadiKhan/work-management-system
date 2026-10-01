import { ErrorPage } from "@/pages/ErrorPage";
import { WORK_SECTION_LABELS, type WorkSection } from "@/types/workSection";
import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Calendar, Clock, Download, Filter, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateNavigator } from "@/components/common/DateNavigator";
import { TaskFiltersPanel } from "./TaskFilters";
import { TaskSheet } from "./TaskSheet";
import { MarketingDailySheet } from "./MarketingDailySheet";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useTasksRealtime } from "@/hooks/useRealtime";
import { fetchTasks } from "@/services/tasks.service";
import { fetchDepartments } from "@/services/departments.service";
import { exportTasksToExcel } from "@/utils/export";
import { todayISO } from "@/utils/date";
import type { TaskFilters } from "@/types/entities";

export function DailyTasksPage({
  mine = false,
  section = "digital",
}: {
  mine?: boolean;
  section?: WorkSection;
}) {
  const { user } = useAuth();
  const profile = useProfile(user?.id);
  const isAdmin = profile.data?.application_role === "administrator";
  const userDeptId = profile.data?.department_id;

  const [params, setParams] = useSearchParams();
  const dateParam = params.get("date");
  const workDate =
    dateParam &&
    /^\d{4}-\d{2}-\d{2}$/.test(dateParam) &&
    !Number.isNaN(Date.parse(dateParam))
      ? dateParam
      : todayISO();
  const setWorkDate = (date: string) =>
    setParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        next.set("date", date);
        return next;
      },
      { replace: true },
    );
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<
    Omit<TaskFilters, "workDate" | "search">
  >({});
  const [now, setNow] = useState(() => new Date());

  const { data: departments = [] } = useQuery({
    queryKey: ["departments"],
    queryFn: fetchDepartments,
  });

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedToday = now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const formattedTime = now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  useTasksRealtime(workDate);

  const activeDepartmentId = isAdmin ? undefined : userDeptId || undefined;

  const activeDeptObj = departments.find(
    (d) => d.id === (isAdmin ? activeDepartmentId : userDeptId),
  );

  const queryFilters = {
    ...filters,
    workSection: mine ? undefined : section,
    workDate,
    search,
    ...(mine ? { assignedTo: user?.id } : {}),
    ...(activeDepartmentId ? { departmentId: activeDepartmentId } : {}),
  };

  const query = useQuery({
    queryKey: [
      "tasks",
      section,
      workDate,
      search,
      filters,
      mine ? user?.id : "all",
      activeDepartmentId ?? "all",
    ],
    queryFn: () => fetchTasks(queryFilters),
    enabled: !!user?.id,
  });
  const tasks = query.data ?? [];

  return (
    <div className="flex min-h-full flex-col">
      <div className="border-b px-3 sm:px-6 py-4 space-y-3 bg-gradient-to-r from-rose-50 via-background to-indigo-50 dark:from-rose-950/30 dark:to-indigo-950/30">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold">
                {mine
                  ? "My Tasks"
                  : `Daily Task (${WORK_SECTION_LABELS[section]})`}
              </h1>
              {activeDeptObj && (
                <span className="rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200 px-2.5 py-0.5 text-xs font-semibold">
                  {activeDeptObj.name}
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {mine
                ? "Your assignments, organized by time."
                : "Add rows under a time section, fill in the cells, then save each row."}
            </p>
          </div>
          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg border bg-card/90 shadow-xs text-xs sm:text-sm">
            <div className="flex items-center gap-1.5 text-muted-foreground font-medium">
              <Calendar className="h-4 w-4 text-primary" />
              <span className="text-foreground">{formattedToday}</span>
            </div>
            <span className="text-muted-foreground/50">•</span>
            <div className="flex items-center gap-1.5 font-mono font-bold text-foreground tabular-nums">
              <Clock className="h-4 w-4 text-primary" />
              <span>{formattedTime}</span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DateNavigator date={workDate} onDateChange={setWorkDate} />
          <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
            <MarketingDailySheet section={section} workDate={workDate} />
            <Input
              aria-label="Search file name"
              placeholder="Search file name..."
              className="h-9 w-full flex-none text-sm sm:w-48"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="flex items-center gap-1.5">
              <TaskFiltersPanel
                section={section}
                filters={filters}
                onChange={setFilters}
                hideAssignee={mine}
              />
              <Button
                variant="outline"
                size="icon"
                title="Refresh tasks"
                aria-label="Refresh tasks"
                onClick={() => void query.refetch()}
              >
                <RefreshCw
                  className={`h-4 w-4 ${query.isFetching ? "animate-spin" : ""}`}
                />
              </Button>
              <Button
                variant="outline"
                size="icon"
                title="Export tasks"
                aria-label="Export tasks"
                onClick={() => {
                  if (!tasks.length) toast.warning("No tasks to export");
                  else {
                    try {
                      exportTasksToExcel(tasks, workDate);
                    } catch {
                      toast.error("Export failed");
                    }
                  }
                }}
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex shrink-0 items-center gap-1.5 text-xs font-semibold">
              <span className="rounded-full bg-blue-100 px-2.5 py-1.5 text-blue-800 dark:bg-blue-950 dark:text-blue-200">
                {tasks.length} tasks
              </span>
              <span className="rounded-full bg-emerald-100 px-2.5 py-1.5 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                {tasks.filter((t) => t.status === "done").length} done
              </span>
              <span className="rounded-full bg-amber-100 px-2.5 py-1.5 text-amber-800 dark:bg-amber-950 dark:text-amber-200">
                {tasks.filter((t) => t.status === "in_progress").length} in
                progress
              </span>
            </div>
          </div>
        </div>
      </div>
      <div className="daily-task-scroll flex-none overflow-visible">
        {query.isError || profile.isError ? (
          <ErrorPage
            title="Unable to load your tasks"
            description="We couldn?t retrieve this task list. Try again in a moment. If the problem continues, contact your administrator."
            retrying={query.isFetching || profile.isFetching}
            onRetry={() => {
              void query.refetch();
              void profile.refetch();
            }}
          />
        ) : query.isPending || profile.isPending ? (
          <p role="status" className="p-6">
            Loading tasks...
          </p>
        ) : (
          profile.data && (
            <TaskSheet
              section={section}
              key={
                section + workDate + String(mine) + String(activeDepartmentId)
              }
              tasks={tasks}
              profile={profile.data}
              workDate={workDate}
              mine={mine}
              departmentId={activeDepartmentId}
            />
          )
        )}
      </div>
    </div>
  );
}
