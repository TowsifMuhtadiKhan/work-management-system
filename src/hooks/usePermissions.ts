import type { Profile } from '@/types/entities'
import type { AppRole } from '@/types/enums'
import { ROLE_LEVEL } from '@/types/enums'

/**
 * Determines if the current user can edit a task assigned to `assignedProfileId`.
 *
 * The DATABASE enforces this via RLS (can_edit_task function). This hook is a
 * FRONTEND CONVENIENCE ONLY — it hides/shows edit buttons without making an
 * additional round-trip. The DB will reject unauthorized UPDATE attempts
 * regardless of what the frontend shows.
 *
 * Permission rules:
 * 1. Administrator → can edit everything
 * 2. Current user is the assigned employee → can edit
 * 3. The assigned employee is a direct or indirect subordinate of current user
 *    (traversed via the manager_id chain stored in profile.manager)
 *
 * Note: Full recursive hierarchy traversal requires fetching the entire chain.
 * For the frontend, we approximate with a single-level manager check plus
 * the role-level heuristic. The DB remains the authoritative enforcer.
 */
export function usePermissions(currentProfile: Profile | null | undefined) {
  const isAdmin = currentProfile?.is_active === true && currentProfile.application_role === 'administrator'
  const myRole: AppRole = currentProfile?.application_role ?? 'employee'
  const myRoleLevel = ROLE_LEVEL[myRole]

  /**
   * Returns true if the current user is allowed to edit a task
   * assigned to `assignedProfileId` given the assigned profile's manager chain.
   *
   * @param assignedTo - UUID of the employee the task is assigned to
   * @param assignedProfile - The profile of the assigned employee (with manager resolved)
   */
  function canEditTask(
    assignedTo: string | undefined,
    assignedProfile?: Pick<Profile, 'id' | 'manager_id' | 'application_role'> | null
  ): boolean {
    if (!currentProfile?.is_active) return false
    if (isAdmin) return true
    if (!assignedTo) return false

    // Assigned to self
    if (currentProfile.id === assignedTo) return true

    // Direct manager check — the assigned employee's manager_id === current user
    if (assignedProfile?.manager_id === currentProfile.id) return true

    // Role-level heuristic: a manager/head can edit employees with lower role level
    // This is a rough approximation; the DB function is authoritative.
    if (
      assignedProfile &&
      myRoleLevel > ROLE_LEVEL[assignedProfile.application_role] &&
      myRoleLevel >= ROLE_LEVEL['manager']
    ) {
      return true
    }

    return false
  }

  /**
   * Returns true if the current user can create new tasks (team_lead and above).
   */
  function canCreateTask(): boolean {
    if (!currentProfile?.is_active) return false
    return myRoleLevel >= ROLE_LEVEL['team_lead']
  }

  /**
   * Returns true if current user can access admin pages.
   */
  function canAccessAdmin(): boolean {
    return isAdmin
  }

  /**
   * Returns true if current user can view all reports.
   */
  function canViewReports(): boolean {
    if (!currentProfile?.is_active) return false
    return myRoleLevel >= ROLE_LEVEL['team_lead']
  }

  return {
    isAdmin,
    myRole,
    myRoleLevel,
    canEditTask,
    canCreateTask,
    canAccessAdmin,
    canViewReports,
  }
}
