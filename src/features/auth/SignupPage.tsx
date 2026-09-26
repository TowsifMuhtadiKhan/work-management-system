import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { signUp } from '@/hooks/useAuth'

export function SignupPage() {
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (loading) return
    setError(null)
    if (!fullName.trim() || !email.trim()) {
      setError('Please enter your name and email address.')
      return
    }
    if (password.length < 8) {
      setError('Use a password with at least 8 characters.')
      return
    }
    if (password !== confirmation) {
      setError('Passwords do not match.')
      return
    }
    setLoading(true)
    try {
      const data = await signUp(fullName, email, password)
      if (data.session) {
        navigate('/dashboard', { replace: true })
      } else {
        setPassword('')
        setConfirmation('')
        setSubmitted(true)
      }
    } catch (err: unknown) {
      const connectionError = err instanceof Error && (
        err.name === 'AuthRetryableFetchError' ||
        /failed to fetch|networkerror|network request failed|load failed/i.test(err.message)
      )
      setError(connectionError
        ? 'Cannot connect to the account service. Check your connection and try again.'
        : err instanceof Error ? err.message : 'Unable to create an account. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const inputClass = 'bg-white/10 border-white/20 text-white placeholder:text-white/30 focus-visible:ring-amber-400'

  return (
    <Card className="border-white/10 bg-white/5 backdrop-blur text-white shadow-2xl">
      <CardHeader className="text-center pb-2">
        <CardTitle className="text-xl text-white">Create Account</CardTitle>
        <CardDescription className="text-zinc-300 text-sm">
          Register with your work email to get started
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        {submitted ? (
          <div role="status" className="space-y-3 rounded-md border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-100">
            <p className="font-semibold">Check your email</p>
            <p>If registration is available for {email.trim()}, you will receive a confirmation link. Confirm your email before signing in.</p>
            <p>Already registered? Sign in with your existing password.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <p role="alert" className="rounded-md border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</p>}
            <div className="space-y-1.5">
              <Label htmlFor="full-name" className="text-zinc-200 text-xs">Full Name</Label>
              <Input id="full-name" autoComplete="name" required maxLength={150} value={fullName} onChange={(e) => setFullName(e.target.value)} disabled={loading} className={inputClass} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="signup-email" className="text-zinc-200 text-xs">Email Address</Label>
              <Input id="signup-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading} className={inputClass} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="signup-password" className="text-zinc-200 text-xs">Password</Label>
              <Input id="signup-password" type="password" autoComplete="new-password" required minLength={8} aria-describedby="password-help" value={password} onChange={(e) => setPassword(e.target.value)} disabled={loading} className={inputClass} />
              <p id="password-help" className="text-xs text-zinc-300">Use at least 8 characters.</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm-password" className="text-zinc-200 text-xs">Confirm Password</Label>
              <Input id="confirm-password" type="password" autoComplete="new-password" required minLength={8} value={confirmation} onChange={(e) => setConfirmation(e.target.value)} disabled={loading} className={inputClass} />
            </div>
            <Button type="submit" disabled={loading} className="w-full bg-primary hover:bg-primary/90 text-white">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? 'Creating account...' : 'Create Account'}
            </Button>
          </form>
        )}
        <p className="text-center text-xs text-zinc-300 mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-amber-300 underline underline-offset-4 hover:text-amber-200">Sign In</Link>
        </p>
      </CardContent>
    </Card>
  )
}
