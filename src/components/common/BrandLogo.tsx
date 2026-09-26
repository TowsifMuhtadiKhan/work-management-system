import { cn } from '@/utils/cn'

export function BrandLogo({ className }: { className?: string }) {
  return (
    <div className={cn('inline-flex rounded-lg border-b-2 border-[#efc400] bg-white px-4 py-3', className)}>
      <img src="/desh-tv-logo.svg" alt="Desh TV" width={495} height={122} className="h-auto w-full object-contain" />
    </div>
  )
}
