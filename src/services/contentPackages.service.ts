import type { WorkSection } from "@/types/workSection";
import { supabase } from "@/lib/supabase/client";

export type ContentStatus = "video_panel" | "export_done";
export const CONTENT_STATUS_LABELS: Record<ContentStatus, string> = {
  video_panel: "Video panel",
  export_done: "Export done",
};
export interface ContentPackage {
  id: string;
  work_section?: WorkSection;
  package_name: string;
  creator_id: string;
  script: string;
  caption: string;
  thumbnail_url: string;
  approval_state: "ongoing" | "done";
  status: ContentStatus;
  work_date: string | null;
  time_slot: string | null;
  task_type_id: string | null;
  assigned_to: string | null;
  task_id: string | null;
  created_at: string;
  updated_at: string;
  creator?: { full_name: string } | null;
}
export type PackageValues = Pick<
  ContentPackage,
  | "package_name"
  | "creator_id"
  | "script"
  | "caption"
  | "thumbnail_url"
  | "approval_state"
  | "status"
>;
export type ApprovalValues = Pick<
  ContentPackage,
  "work_date" | "time_slot" | "task_type_id" | "assigned_to" | "work_section"
>;
const SELECT =
  "*, creator:profiles!content_packages_creator_id_fkey(full_name)";

export async function fetchContentCreators(): Promise<
  { id: string; full_name: string }[]
> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, department:departments!inner(name, is_active)")
    .eq("is_active", true)
    .eq("department.is_active", true)
    .order("full_name");
  if (error) throw error;
  return (data ?? [])
    .filter((person) => {
      const department = person.department as unknown as { name: string };
      return ["content creator", "content creator team"].includes(
        department.name.trim().toLowerCase(),
      );
    })
    .map(({ id, full_name }) => ({ id, full_name }));
}

export async function fetchContentPackages(): Promise<ContentPackage[]> {
  const { data, error } = await supabase
    .from("content_packages")
    .select(SELECT)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function saveContentPackage(
  values: PackageValues,
  entry?: ContentPackage,
  mapping?: ApprovalValues,
): Promise<ContentPackage> {
  const payload = {
    ...values,
    package_name: values.package_name.trim(),
    thumbnail_url: values.thumbnail_url.trim(),
    ...(values.status === "export_done" ? mapping : {}),
  };
  const query = entry
    ? supabase
        .from("content_packages")
        .update(payload)
        .eq("id", entry.id)
        .eq("updated_at", entry.updated_at)
    : supabase.from("content_packages").insert(payload);
  const { data, error } = await query.select(SELECT).single();
  if (error) throw error;
  return data as ContentPackage;
}
