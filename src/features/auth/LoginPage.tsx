import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { signIn } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase/client'

export function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [forgotOpen, setForgotOpen] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetLoading, setResetLoading] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const [resetError, setResetError] = useState<string | null>(null)

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resetEmail.trim()) return
    setResetLoading(true)
    setResetError(null)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail.trim(), {
        redirectTo: `${window.location.origin}/profile`,
      })
      if (error) throw error
      setResetSent(true)
      toast.success('Password reset link sent!')
    } catch (err: unknown) {
      setResetError(err instanceof Error ? err.message : 'Failed to send reset link')
    } finally {
      setResetLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!email || !password) {
      setError('Please enter your email and password')
      toast.error('Please enter your email and password')
      return
    }

    setLoading(true)
    try {
      await signIn(email.trim(), password)
      navigate('/dashboard', { replace: true })
    } catch (err: unknown) {
      const isConnectionError = err instanceof Error && (
        err.name === 'AuthRetryableFetchError' ||
        /failed to fetch|networkerror|network request failed|load failed/i.test(err.message)
      )
      const message = isConnectionError
        ? 'Cannot connect to the sign-in service. Check your internet connection. If this continues, contact your administrator to check the authentication server configuration.'
        : err instanceof Error ? err.message : 'Unable to sign in. Please try again.'
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="border-white/10 bg-white/5 backdrop-blur text-white shadow-2xl">
      <CardHeader className="text-center pb-2">
        <CardTitle className="text-xl text-white">Sign In</CardTitle>
        <CardDescription className="text-zinc-300 text-sm">
          Enter your work email and password
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <p role="alert" className="rounded-md border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">
              {error}
            </p>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-zinc-200 text-xs">
              Email Address
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@deshtv.com"
              autoComplete="email"
              autoFocus
              className="bg-white/10 border-white/20 text-white placeholder:text-white/30 focus-visible:ring-amber-400"
              disabled={loading}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-zinc-200 text-xs">
              Password
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                className="bg-white/10 border-white/20 text-white placeholder:text-white/30 focus-visible:ring-amber-400 pr-10"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70"
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs pt-1">
            <span className="text-zinc-400">First time login with initial password?</span>
            <button
              type="button"
              onClick={() => setForgotOpen(true)}
              className="text-amber-300 hover:text-amber-200 underline underline-offset-2"
            >
              Reset password
            </button>
          </div>

          <Button
            type="submit"
            className="w-full bg-primary hover:bg-primary/90 text-white"
            disabled={loading}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {loading ? 'Signing in…' : 'Sign In'}
          </Button>
        </form>

        <p className="text-center text-xs text-zinc-400 mt-6">
          Don't have an account?{' '}
          <Link to="/signup" className="text-amber-300 underline underline-offset-4 hover:text-amber-200">
            Create Account
          </Link>
        </p>
      </CardContent>

      <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
        <DialogContent className="sm:max-w-md bg-zinc-900 border-zinc-700 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Reset your password</DialogTitle>
            <DialogDescription className="text-zinc-300">
              Enter your work email address to receive password reset instructions.
            </DialogDescription>
          </DialogHeader>
          {resetSent ? (
            <div className="space-y-4 py-2">
              <p className="text-sm text-green-400">
                A password reset email has been sent to <strong>{resetEmail}</strong>. Please check your inbox.
              </p>
              <Button
                className="w-full"
                onClick={() => {
                  setForgotOpen(false)
                  setResetSent(false)
                  setResetEmail('')
                }}
              >
                Back to Sign In
              </Button>
            </div>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4 py-2">
              {resetError && <p className="text-sm text-red-400">{resetError}</p>}
              <div className="space-y-1.5">
                <Label htmlFor="reset-email" className="text-zinc-200 text-xs">Work email address</Label>
                <Input
                  id="reset-email"
                  type="email"
                  required
                  placeholder="you@deshtv.com"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  disabled={resetLoading}
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/30"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" className="border-zinc-600 text-zinc-200" onClick={() => setForgotOpen(false)} disabled={resetLoading}>
                  Cancel
                </Button>
                <Button disabled={resetLoading} className="bg-primary hover:bg-primary/90 text-white">
                  {resetLoading ? 'Sending…' : 'Send reset link'}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  )
}
