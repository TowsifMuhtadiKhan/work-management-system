import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import { APP_ROLE_LABELS } from '@/types/enums'
import { AccountSecurity } from '@/features/admin/AccountSecurity'

export function ProfilePage() {
  const { user } = useAuth()
  const { data: profile } = useProfile(user?.id)
  return <div className="p-3 sm:p-6 space-y-6 max-w-3xl">
    <h1 className="text-xl font-bold">My Profile</h1>
    <section className="rounded-lg border bg-card p-5 space-y-2">
      <h2 className="font-semibold">{profile?.full_name}</h2><p className="text-sm">{profile?.email}</p>
      <p className="text-sm text-muted-foreground">{profile && APP_ROLE_LABELS[profile.application_role]}{profile?.department && ` · ${profile.department.name}`}</p>
      <p className="text-sm text-muted-foreground">For changes to your name, department, manager, or role, contact an administrator.</p>
    </section>
    <AccountSecurity />
  </div>
}
