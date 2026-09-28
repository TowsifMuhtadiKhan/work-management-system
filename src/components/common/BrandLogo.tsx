import { cn } from '@/utils/cn'

interface BrandLogoProps {
  className?: string
  compact?: boolean
}

export function BrandLogo({ className, compact = false }: BrandLogoProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center justify-center overflow-hidden rounded-lg border-b-2 border-[#efc400] bg-white transition-all',
        compact ? 'h-10 w-10 p-1' : 'px-4 py-2.5',
        className
      )}
    >
      <img
        src="/deshtvlogo.svg"
        alt="Desh TV"
        width={compact ? 40 : 600}
        height={compact ? 40 : 230}
        className={cn(
          'object-contain',
          compact ? 'h-8 w-8' : 'h-10 w-auto max-w-full'
        )}
      />
    </div>
  )
}
