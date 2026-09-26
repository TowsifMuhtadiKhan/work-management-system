import { Moon, Sun, Bell, LogOut, User, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { UserAvatar } from '@/components/common/UserAvatar'
import { signOut } from '@/hooks/useAuth'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'
import type { Profile } from '@/types/entities'
import { APP_ROLE_LABELS } from '@/types/enums'

interface TopHeaderProps {
  profile: Profile | null
  isDark: boolean
  onToggleDark: () => void
  pageTitle?: string
}

export function TopHeader({ profile, isDark, onToggleDark, pageTitle }: TopHeaderProps) {
  const navigate = useNavigate()

  const handleSignOut = async () => {
    try {
      await signOut()
      navigate('/login')
    } catch {
      toast.error('Failed to sign out')
    }
  }

  return (
    <header className="h-14 flex items-center justify-between px-6 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
      {/* Page title */}
      <div>
        {pageTitle && (
          <h1 className="text-base font-semibold text-foreground">{pageTitle}</h1>
        )}
      </div>

      {/* Right side actions */}
      <div className="flex items-center gap-2">
        {/* Dark mode toggle */}
        <Button variant="ghost" size="icon" onClick={onToggleDark} title="Toggle theme">
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        {/* Notifications placeholder */}
        <Button variant="ghost" size="icon" title="Notifications">
          <Bell className="h-4 w-4" />
        </Button>

        {/* Profile dropdown */}
        {profile && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 h-9 px-2">
                <UserAvatar
                  name={profile.full_name}
                  avatarUrl={profile.avatar_url}
                  size="sm"
                />
                <div className="text-left hidden sm:block">
                  <p className="text-xs font-medium leading-none">{profile.full_name}</p>
                  <p className="text-[10px] text-muted-foreground leading-none mt-0.5">
                    {APP_ROLE_LABELS[profile.application_role]}
                  </p>
                </div>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-0.5">
                  <p className="text-sm font-medium">{profile.full_name}</p>
                  <p className="text-xs text-muted-foreground">{profile.email}</p>
                  {profile.employee_code && (
                    <p className="text-xs text-muted-foreground">{profile.employee_code}</p>
                  )}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/profile')}>
                <User className="mr-2 h-4 w-4" />
                My Profile
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleSignOut}
                className="text-destructive focus:text-destructive"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  )
}
