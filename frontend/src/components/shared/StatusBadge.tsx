import React from 'react'
import { cn } from '@/lib/utils'

export type StatusVariant =
  | 'success'
  | 'paid'
  | 'active'
  | 'pending'
  | 'processing'
  | 'quotation'
  | 'draft'
  | 'overdue'
  | 'cancelled'
  | 'closed'
  | 'free'
  | 'pro'
  | 'advance'

interface StatusBadgeProps {
  status: string
  variant?: StatusVariant
  className?: string
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  variant,
  className,
}) => {
  const normalized = (variant || status.toLowerCase()) as StatusVariant

  const getStyles = () => {
    switch (normalized) {
      case 'success':
      case 'paid':
      case 'active':
        return {
          dot: 'bg-emerald-500',
          badge: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
        }
      case 'pending':
      case 'processing':
      case 'quotation':
        return {
          dot: 'bg-amber-500',
          badge: 'bg-amber-50 text-amber-700 border-amber-200/60',
        }
      case 'overdue':
      case 'cancelled':
      case 'closed':
        return {
          dot: 'bg-rose-500',
          badge: 'bg-rose-50 text-rose-700 border-rose-200/60',
        }
      case 'pro':
        return {
          dot: 'bg-indigo-500',
          badge: 'bg-indigo-50 text-indigo-700 border-indigo-200/60 font-semibold uppercase text-[10px]',
        }
      case 'advance':
        return {
          dot: 'bg-purple-500',
          badge: 'bg-purple-50 text-purple-700 border-purple-200/60 font-semibold uppercase text-[10px]',
        }
      case 'free':
        return {
          dot: 'bg-neutral-400',
          badge: 'bg-neutral-100 text-neutral-600 border-neutral-200 font-semibold uppercase text-[10px]',
        }
      case 'draft':
      default:
        return {
          dot: 'bg-neutral-400',
          badge: 'bg-neutral-100 text-neutral-700 border-neutral-200/80',
        }
    }
  }

  const { dot, badge } = getStyles()

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors',
        badge,
        className
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', dot)} />
      <span className="capitalize">{status}</span>
    </span>
  )
}

