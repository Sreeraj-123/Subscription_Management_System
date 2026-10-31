import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  Layers,
  LayoutDashboard,
  Package,
  Repeat,
  FileText,
  CreditCard,
  BarChart3,
  Users,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string | number
  roles?: ('ADMIN' | 'INTERNAL' | 'CUSTOMER')[]
}

export interface NavGroup {
  title?: string
  items: NavItem[]
}

const defaultNavGroups: NavGroup[] = [
  {
    title: 'Overview',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    ],
  },
  {
    title: 'Subscription Ops',
    items: [
      { label: 'Catalog & Plans', href: '/catalog', icon: Package, roles: ['ADMIN', 'INTERNAL'] },
      { label: 'Subscriptions', href: '/subscriptions', icon: Repeat },
      { label: 'Invoices & Billing', href: '/invoices', icon: FileText },
    ],
  },
  {
    title: 'Finance',
    items: [
      { label: 'Payments', href: '/payments', icon: CreditCard },
      { label: 'Reports & MRR', href: '/reports', icon: BarChart3, roles: ['ADMIN', 'INTERNAL'] },
    ],
  },
  {
    title: 'Settings',
    items: [
      { label: 'Team Members', href: '/settings/team', icon: Users, roles: ['ADMIN'] },
      { label: 'Billing & Plans', href: '/settings/billing', icon: Layers },
      { label: 'Workspace Settings', href: '/settings/workspace', icon: Settings, roles: ['ADMIN', 'INTERNAL'] },
    ],
  },
]

interface SidebarProps {
  user?: {
    email: string
    name: string
    role: 'ADMIN' | 'INTERNAL' | 'CUSTOMER'
  }
  onLogout?: () => void
  onSearchClick?: () => void
  navGroups?: NavGroup[]
  className?: string
}

export const Sidebar: React.FC<SidebarProps> = ({
  user = {
    name: 'Admin User',
    email: 'admin@brightloop.io',
    role: 'ADMIN',
  },
  onLogout,
  onSearchClick,
  navGroups = defaultNavGroups,
  className,
}) => {
  const [collapsed, setCollapsed] = useState(false)
  const location = useLocation()

  return (
    <aside
      className={cn(
        'relative flex flex-col border-r border-neutral-200/90 bg-white transition-all duration-300 select-none z-20 shrink-0 h-screen sticky top-0',
        collapsed ? 'w-18' : 'w-64',
        className
      )}
    >
      {/* Workspace Logo Header */}
      <div className="flex items-center justify-between p-4 border-b border-neutral-100">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#111827] text-white shrink-0 shadow-sm">
            <Sparkles className="w-4 h-4 text-orange-400" />
          </div>
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-semibold tracking-tight text-neutral-900 truncate">
                Brightloop
              </span>
              <span className="text-[11px] text-neutral-400 truncate">
                Software Platform
              </span>
            </div>
          )}
        </div>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 rounded-md text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Quick Search (⌘K) */}
      {!collapsed && (
        <div className="px-3 pt-3">
          <button
            onClick={onSearchClick}
            type="button"
            className="w-full flex items-center justify-between px-3 py-1.5 text-xs text-neutral-400 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200/70 rounded-lg transition"
          >
            <span className="truncate">Search commands...</span>
            <kbd className="px-1.5 py-0.5 text-[10px] font-medium text-neutral-500 bg-white border border-neutral-200 rounded shadow-2xs">
              ⌘K
            </kbd>
          </button>
        </div>
      )}

      {/* Navigation Groups */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {navGroups.map((group, groupIdx) => {
          // Filter items by role if roles specified
          const visibleItems = group.items.filter(
            (item) => !item.roles || item.roles.includes(user.role)
          )
          if (visibleItems.length === 0) return null

          return (
            <div key={groupIdx}>
              {!collapsed && group.title && (
                <div className="px-3 mb-2 text-[10px] font-semibold tracking-wider text-neutral-400 uppercase">
                  {group.title}
                </div>
              )}
              <div className="space-y-1">
                {visibleItems.map((item) => {
                  const isActive =
                    location.pathname === item.href ||
                    (item.href !== '/' && location.pathname.startsWith(`${item.href}/`))
                  const Icon = item.icon

                  return (
                    <Link
                      key={item.href}
                      to={item.href}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all group relative',
                        isActive
                          ? 'bg-neutral-100 text-neutral-900 font-semibold'
                          : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50/80',
                        collapsed && 'justify-center px-2'
                      )}
                      title={collapsed ? item.label : undefined}
                    >
                      <Icon
                        className={cn(
                          'w-4 h-4 shrink-0 transition-colors',
                          isActive
                            ? 'text-neutral-900'
                            : 'text-neutral-400 group-hover:text-neutral-700'
                        )}
                      />
                      {!collapsed && (
                        <span className="truncate flex-1">{item.label}</span>
                      )}
                      {!collapsed && item.badge && (
                        <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-neutral-200/80 text-neutral-700 font-medium">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* User Profile Pinned at Bottom */}
      <div className="p-3 border-t border-neutral-100">
        <div
          className={cn(
            'flex items-center gap-3 p-2 rounded-xl transition',
            collapsed ? 'justify-center' : 'justify-between'
          )}
        >
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-neutral-200 text-neutral-700 text-xs font-semibold shrink-0">
              {user.name.charAt(0).toUpperCase()}
            </div>
            {!collapsed && (
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold text-neutral-900 truncate">
                  {user.name}
                </span>
                <span className="text-[10px] text-neutral-500 truncate">
                  {user.email}
                </span>
              </div>
            )}
          </div>

          {!collapsed && onLogout && (
            <button
              onClick={onLogout}
              className="p-1 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-md transition"
              title="Sign out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </aside>
  )
}

