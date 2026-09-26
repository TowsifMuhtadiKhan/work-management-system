import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { UserPlus, Pencil, ToggleLeft, ToggleRight } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { UserAvatar } from '@/components/common/UserAvatar'
import { fetchAllProfilesAdmin, setProfileActive } from '@/services/profiles.service'
import { APP_ROLE_LABELS } from '@/types/enums'
import type { Profile } from '@/types/entities'

export function EmployeesPage() {
  const queryClient = useQueryClient()
  const [toggling, setToggling] = useState<string | null>(null)

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ['admin-profiles'],
    queryFn: fetchAllProfilesAdmin,
  })

  const handleToggleActive = async (profile: Profile) => {
    setToggling(profile.id)
    try {
      await setProfileActive(profile.id, !profile.is_active)
      queryClient.invalidateQueries({ queryKey: ['admin-profiles'] })
      toast.success(
        `${profile.full_name} ${!profile.is_active ? 'activated' : 'deactivated'}`
      )
    } catch {
      toast.error('Failed to update status')
    } finally {
      setToggling(null)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Employees</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage employee profiles and hierarchy
          </p>
        </div>
        <Button size="sm">
          <UserPlus className="mr-1.5 h-4 w-4" />
          Add Employee
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">{profiles.length} employees</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead>Employee</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Designation</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Manager</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                profiles.map((profile) => (
                  <TableRow key={profile.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <UserAvatar
                          name={profile.full_name}
                          avatarUrl={profile.avatar_url}
                          size="sm"
                        />
                        <div>
                          <p className="text-xs font-medium">{profile.full_name}</p>
                          <p className="text-[10px] text-muted-foreground">{profile.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {profile.employee_code ?? '—'}
                    </TableCell>
                    <TableCell className="text-xs">
                      {profile.designation ?? '—'}
                    </TableCell>
                    <TableCell className="text-xs">
                      {(profile as any).department?.name ?? '—'}
                    </TableCell>
                    <TableCell className="text-xs">
                      {(profile as any).manager?.full_name ?? '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-[10px]">
                        {APP_ROLE_LABELS[profile.application_role]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                          profile.is_active
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        }`}
                      >
                        {profile.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" title="Edit">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          title={profile.is_active ? 'Deactivate' : 'Activate'}
                          onClick={() => handleToggleActive(profile)}
                          disabled={toggling === profile.id}
                        >
                          {profile.is_active ? (
                            <ToggleRight className="h-3.5 w-3.5 text-green-500" />
                          ) : (
                            <ToggleLeft className="h-3.5 w-3.5 text-muted-foreground" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
