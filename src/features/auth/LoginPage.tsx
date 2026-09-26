import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { signIn } from '@/hooks/useAuth'

export function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
        <CardDescription className="text-blue-200/60 text-sm">
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
            <Label htmlFor="email" className="text-blue-100/80 text-xs">
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
              className="bg-white/10 border-white/20 text-white placeholder:text-white/30 focus-visible:ring-blue-400"
              disabled={loading}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-blue-100/80 text-xs">
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
                className="bg-white/10 border-white/20 text-white placeholder:text-white/30 focus-visible:ring-blue-400 pr-10"
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

          <Button
            type="submit"
            className="w-full bg-blue-500 hover:bg-blue-600 text-white"
            disabled={loading}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {loading ? 'Signing in…' : 'Sign In'}
          </Button>
        </form>

        <p className="text-center text-xs text-blue-200/40 mt-6">
          Access is managed by your administrator.
          <br />
          Contact admin if you need an account.
        </p>
      </CardContent>
    </Card>
  )
}
