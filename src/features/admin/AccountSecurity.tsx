import { useState } from 'react'
import { Eye, EyeOff, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { errorMessage } from './adminConfig'

export function AccountSecurity() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (saving) return
    setError('')
    setSuccess(false)
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    setSaving(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      setPassword('')
      setConfirm('')
      setSuccess(true)
      toast.success('Your password has been successfully updated.')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="rounded-lg border bg-card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
        <div>
          <h2 className="font-semibold">Reset / Change Your Password</h2>
          <p className="text-sm text-muted-foreground">
            Set your own secure password. This updates the account you are currently logged in with.
          </p>
        </div>
      </div>
      <form className="space-y-4 max-w-md" onSubmit={submit}>
        {error && <p role="alert" className="text-sm text-destructive font-medium">{error}</p>}
        {success && <p role="status" className="text-sm text-green-700 dark:text-green-400 font-medium">Your password has been updated successfully.</p>}
        <div className="space-y-1.5">
          <Label htmlFor="account-password">New password</Label>
          <div className="relative">
            <Input
              id="account-password"
              type={showPassword ? 'text' : 'password'}
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              disabled={saving}
              onChange={e => setPassword(e.target.value)}
              className="pr-10"
              placeholder="At least 8 characters"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="account-confirm">Confirm new password</Label>
          <Input
            id="account-confirm"
            type={showPassword ? 'text' : 'password'}
            required
            minLength={8}
            autoComplete="new-password"
            value={confirm}
            disabled={saving}
            onChange={e => setConfirm(e.target.value)}
            placeholder="Re-enter new password"
          />
        </div>
        <Button disabled={saving || !password}>
          {saving ? 'Updating...' : 'Update password'}
        </Button>
      </form>
    </section>
  )
}
