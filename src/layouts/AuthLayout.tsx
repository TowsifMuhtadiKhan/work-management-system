import { Outlet } from 'react-router-dom'

export function AuthLayout() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Brand header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-red-500 mb-4 shadow-lg">
            <span className="text-white font-extrabold text-2xl">D</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">DESH TV</h1>
          <p className="text-blue-200/70 text-sm mt-1">Digital Content Management System</p>
        </div>
        <Outlet />
      </div>
    </div>
  )
}
