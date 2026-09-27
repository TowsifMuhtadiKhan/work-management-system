import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { AccountSecurity } from './AccountSecurity'
import { useAdministrationReady } from './useAdministrationReady'

export function SettingsPage() {
  const ready = useAdministrationReady()
  const signupUrl = `${window.location.origin}/signup`
  return <div className="p-3 sm:p-6 space-y-6 max-w-5xl">
    <div><h1 className="text-xl font-bold">Administration Settings</h1><p className="text-sm text-muted-foreground mt-1">Account security, access setup, and guidance for your team.</p></div>
    <section className="rounded-lg border bg-card p-5 space-y-3">
      <h2 className="font-semibold">Employee management setup</h2>
      {ready.isPending ? <p role="status">Checking setup...</p> : ready.data ? <p role="status" className="text-sm text-green-700">Ready. Administrator-only employee management is installed.</p> : <div className="text-sm space-y-2" role="alert">
        <p>Setup is missing or could not be verified. A project owner must run the administration update in the Supabase SQL Editor.</p>
        <p className="break-all font-mono text-xs">supabase/migrations/20260926071225_administration_access.sql</p>
        <p>This secures role changes and enables employee editing. See docs/administration.md in the project for instructions.</p>
      </div>}
      <Button variant="outline" disabled={ready.isFetching} onClick={() => void ready.refetch()}>Check setup again</Button>
    </section>
    <section className="rounded-lg border bg-card p-5 space-y-3">
      <h2 className="font-semibold">Create another administrator</h2>
      <ol className="list-decimal pl-5 space-y-2 text-sm">
        <li>Open <Link className="text-primary underline" to="/admin/employees">Employees</Link> and add the person's account, or ask them to sign up.</li>
        <li>Find the person and click Edit.</li><li>Set Role to Administrator, confirm the access change, and save.</li>
        <li>Ask them to refresh the app to see the Administration menu.</li>
      </ol>
      <p className="text-sm text-muted-foreground">New accounts start as employees. You cannot demote or deactivate your own administrator account. To bootstrap the first administrator, the project owner must update that account's application_role in Supabase's profiles table.</p>
    </section>
    <section className="rounded-lg border bg-card p-5 space-y-3">
      <h2 className="font-semibold">Employee registration</h2><p className="text-sm">Share this link so employees can choose their own password and confirm their email.</p>
      <div className="flex flex-wrap gap-3 items-center"><code className="text-sm break-all">{signupUrl}</code><Button variant="outline" onClick={async () => { try { await navigator.clipboard.writeText(signupUrl); toast.success('Registration link copied') } catch { toast.error('Could not copy. Select and copy the link above.') } }}>Copy registration link</Button></div>
      <p className="text-xs text-muted-foreground">A localhost link only works on this computer. For your team, open the deployed app and copy its link instead.</p>
    </section>
    <section className="rounded-lg border bg-card p-5 space-y-3">
      <h2 className="font-semibold">Who can do what?</h2>
      <div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead><tr className="border-b"><th className="py-2">Role</th><th>Responsibilities</th></tr></thead><tbody>
        {[
          ['Administrator', 'Manage employees and roles, configure departments and catalogs, and manage all tasks.'],
          ['Manager', 'Create assignments, view reports, and edit tasks within the reporting hierarchy.'],
          ['Team Lead', 'Create assignments, view reports, and update permitted team tasks.'],
          ['Employee', 'View assignments and update their own tasks under My Tasks.'],
        ].map(([role, description]) => <tr key={role} className="border-b last:border-0"><th className="py-3 pr-4 font-medium whitespace-nowrap">{role}</th><td>{description}</td></tr>)}
      </tbody></table></div>
      <p className="text-sm">To distribute work: open <Link className="text-primary underline" to="/tasks">Daily Tasks</Link> → Add Assignment → Assigned To → Save. Employees see their assignments in My Tasks for the selected work date.</p>
    </section>
    <AccountSecurity />
  </div>
}
