import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { errorMessage } from './adminConfig'

export function AccountSecurity() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (saving) return
    setError(''); setSuccess(false)
    if (password !== confirm) { setError('Passwords do not match.'); return }
    setSaving(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      setPassword(''); setConfirm(''); setSuccess(true)
    } catch (err) { setError(errorMessage(err)) } finally { setSaving(false) }
  }
  return <section className="rounded-lg border bg-card p-5 space-y-4">
    <div><h2 className="font-semibold">Change your password</h2><p className="text-sm text-muted-foreground">This updates only the account you are signed in with.</p></div>
    <form className="space-y-4 max-w-md" onSubmit={submit}>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {success && <p role="status" className="text-sm text-green-700">Your password has been updated.</p>}
      <div className="space-y-1.5"><Label htmlFor="account-password">New password</Label><Input id="account-password" type="password" required minLength={8} autoComplete="new-password" value={password} disabled={saving} onChange={e => setPassword(e.target.value)} /></div>
      <div className="space-y-1.5"><Label htmlFor="account-confirm">Confirm new password</Label><Input id="account-confirm" type="password" required minLength={8} autoComplete="new-password" value={confirm} disabled={saving} onChange={e => setConfirm(e.target.value)} /></div>
      <Button disabled={saving}>{saving ? 'Updating...' : 'Update password'}</Button>
    </form>
  </section>
}
