import React from 'react'
import { Sidebar } from './Sidebar'
import { cn } from '@/lib/utils'

interface AppShellProps {
  children: React.ReactNode
  user?: {
    email: string
    name: string
    role: 'ADMIN' | 'INTERNAL' | 'CUSTOMER'
  }
  onLogout?: () => void
  className?: string
}

export const AppShell: React.FC<AppShellProps> = ({
  children,
  user,
  onLogout,
  className,
}) => {
  return (
    <div className="flex min-h-screen bg-[#F8F9FA] text-neutral-900 font-sans">
      <Sidebar user={user} onLogout={onLogout} />
      <main className={cn('flex-1 min-w-0 flex flex-col', className)}>
        <div className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">
          {children}
        </div>
      </main>
    </div>
  )
}

