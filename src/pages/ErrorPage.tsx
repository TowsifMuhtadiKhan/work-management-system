import { ArrowLeft, ArrowRight, FileQuestion, RefreshCw, ShieldAlert, WifiOff, TriangleAlert } from 'lucide-react'
import { Link, isRouteErrorResponse, useNavigate, useRouteError } from 'react-router-dom'
import { Button } from '@/components/ui/button'

type ErrorKind = 'not-found' | 'forbidden' | 'offline' | 'server'
const messages = {
  'not-found': { code: '404', title: 'This page could not be found', description: 'The address may be incorrect, or the page may have moved. Head back to your dashboard to continue.', icon: FileQuestion },
  forbidden: { code: '403', title: 'You do not have access', description: 'Your account does not have permission to open this page. Contact your administrator if you need access.', icon: ShieldAlert },
  offline: { code: 'Connection interrupted', title: 'Let’s get you connected', description: 'Check your internet connection, then try again. Your work will be available once the connection is restored.', icon: WifiOff },
  server: { code: 'Something went wrong', title: 'We couldn’t open this page', description: 'Something interrupted this request. Try again, or return to your dashboard. If this keeps happening, contact your administrator.', icon: TriangleAlert },
}

export function ErrorPage({ kind = 'server', title, description, onRetry, retrying = false, standalone = false }: {
  kind?: ErrorKind; title?: string; description?: string; onRetry?: () => void; retrying?: boolean; standalone?: boolean
}) {
  const navigate = useNavigate()
  const message = messages[kind]
  const Icon = message.icon
  return <section aria-labelledby="error-heading" className={`flex items-center justify-center bg-gradient-to-br from-rose-50/70 via-background to-slate-100/70 px-4 py-12 sm:px-8 ${standalone ? 'min-h-dvh' : 'min-h-[65dvh]'}`}>
    <div className="w-full max-w-2xl overflow-hidden rounded-2xl border bg-card shadow-sm">
      <div className="h-1.5 bg-primary" />
      <div className="p-6 sm:p-12 text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border border-rose-100 bg-rose-50 text-primary"><Icon className="h-9 w-9" aria-hidden="true" /></div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-primary">{message.code}</p>
        <div role="alert"><h1 id="error-heading" className="text-2xl font-bold tracking-tight sm:text-3xl">{title ?? message.title}</h1>
        <p className="mx-auto mt-4 max-w-lg text-sm leading-7 text-muted-foreground sm:text-base">{description ?? message.description}</p></div>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          {onRetry && <Button onClick={onRetry} disabled={retrying} className="gap-2"><RefreshCw className={`h-4 w-4 ${retrying ? 'animate-spin' : ''}`} />{retrying ? 'Trying again...' : 'Try again'}</Button>}
          <Button asChild variant={onRetry ? 'outline' : 'default'} className="gap-2"><Link to="/dashboard">Go to dashboard<ArrowRight className="h-4 w-4" /></Link></Button>
        </div>
        <Button variant="ghost" className="mt-4 gap-2 text-muted-foreground" onClick={() => { if (window.history.state?.idx > 0) navigate(-1); else navigate('/dashboard', { replace: true }) }}><ArrowLeft className="h-4 w-4" />Go back</Button>
      </div>
      <div className="border-t bg-muted/30 px-6 py-4 text-center text-xs text-muted-foreground">Desh TV · Work Management</div>
    </div>
  </section>
}

export function RouteErrorPage({ standalone = false }: { standalone?: boolean }) {
  const error = useRouteError()
  const status = isRouteErrorResponse(error) ? error.status : undefined
  const kind = status === 404 ? 'not-found' : status === 403 ? 'forbidden' : !navigator.onLine ? 'offline' : 'server'
  return <ErrorPage kind={kind} standalone={standalone} onRetry={kind === 'server' || kind === 'offline' ? () => window.location.reload() : undefined} />
}
