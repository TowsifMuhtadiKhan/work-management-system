import { createClient } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";
import type { DbProfileUpdate } from "@/types/database";

export async function saveEmployee(id: string, changes: DbProfileUpdate) {
  const { error } = await supabase.rpc("admin_update_profile", {
    p_id: id,
    p_changes: changes,
  });
  if (error?.code === "PGRST202") {
    throw new Error(
      "Employee management needs the administration database update. See the setup instructions in docs/administration.md.",
    );
  }
  if (error) throw error;
}

export async function deleteEmployee(id: string) {
  const { error } = await supabase.rpc("admin_delete_user", { p_id: id });
  if (error?.code === "PGRST202") {
    throw new Error(
      "Employee deletion needs the administration database update. See the setup instructions in docs/administration.md.",
    );
  }
  if (error) throw error;
}

export async function registerEmployee(
  fullName: string,
  email: string,
  password: string,
  designation?: string,
  departmentId?: string,
) {
  const { data: admin, error: permissionError } =
    await supabase.rpc("is_admin");
  if (permissionError) throw permissionError;
  if (!admin)
    throw new Error("Only an active administrator can add employees here.");
  // A separate, nonpersistent auth client preserves the administrator's session.
  // Registration uses public signup and always creates an employee, never an admin.
  const registration = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
        storageKey: "employee-registration",
      },
    },
  );
  const trimmedDesignation = designation?.trim();
  const trimmedDepartment = departmentId?.trim() || null;
  const { data, error } = await registration.auth.signUp({
    email: email.trim(),
    password,
    options: {
      data: {
        full_name: fullName.trim(),
        ...(trimmedDesignation ? { designation: trimmedDesignation } : {}),
        ...(trimmedDepartment ? { department_id: trimmedDepartment } : {}),
      },
      emailRedirectTo: `${window.location.origin}/dashboard`,
    },
  });
  if (error) throw error;
  if (data?.user?.id && (trimmedDesignation || trimmedDepartment)) {
    try {
      await saveEmployee(data.user.id, {
        ...(trimmedDesignation ? { designation: trimmedDesignation } : {}),
        ...(trimmedDepartment ? { department_id: trimmedDepartment } : {}),
      });
    } catch {
      // Best-effort in case database administration RPC is pending
    }
  }
  return { needsConfirmation: !data.session };
}
