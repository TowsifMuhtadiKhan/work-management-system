import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { initials } from '@/utils/format'
import { cn } from '@/utils/cn'

interface UserAvatarProps {
  name: string
  avatarUrl?: string | null
  size?: 'xs' | 'sm' | 'md' | 'lg'
  showTooltip?: boolean
  className?: string
}

const SIZE_CLASSES = {
  xs: 'h-5 w-5 text-[10px]',
  sm: 'h-7 w-7 text-xs',
  md: 'h-9 w-9 text-sm',
  lg: 'h-11 w-11 text-base',
}

export function UserAvatar({
  name,
  avatarUrl,
  size = 'md',
  showTooltip = false,
  className,
}: UserAvatarProps) {
  const avatar = (
    <Avatar className={cn(SIZE_CLASSES[size], className)}>
      {avatarUrl && <AvatarImage src={avatarUrl} alt={name} />}
      <AvatarFallback className="bg-primary/10 text-primary font-medium">
        {initials(name)}
      </AvatarFallback>
    </Avatar>
  )

  if (showTooltip) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{avatar}</TooltipTrigger>
        <TooltipContent>{name}</TooltipContent>
      </Tooltip>
    )
  }

  return avatar
}
