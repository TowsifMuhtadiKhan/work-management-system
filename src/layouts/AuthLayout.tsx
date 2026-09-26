import { Outlet } from 'react-router-dom'
import { BrandLogo } from '@/components/common/BrandLogo'

export function AuthLayout() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-zinc-900 to-red-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Brand header */}
        <div className="text-center mb-8">
          <BrandLogo className="w-64 mb-4 shadow-lg" />
          <h1 className="text-zinc-300 text-sm mt-1">Digital Content Management System</h1>
        </div>
        <Outlet />
      </div>
    </div>
  )
}
