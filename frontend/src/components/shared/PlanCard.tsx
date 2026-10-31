import React from 'react'
import { CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { StatusBadge } from './StatusBadge'

export interface PlanFeature {
  text: string
  included: boolean
}

export interface PlanData {
  id: string
  name: string
  badgeText: string
  badgeVariant: 'free' | 'pro' | 'advance'
  price: string
  period: string
  description?: string
  features: PlanFeature[]
  isFeatured?: boolean
  ctaLabel?: string
  isCurrent?: boolean
}

interface PlanCardProps {
  plan: PlanData
  onSelect?: (planId: string) => void
  className?: string
}

export const PlanCard: React.FC<PlanCardProps> = ({
  plan,
  onSelect,
  className,
}) => {
  const isDark = plan.isFeatured

  return (
    <div
      className={cn(
        'relative flex flex-col p-6 rounded-2xl transition-all duration-200 border',
        isDark
          ? 'bg-[#111827] text-white border-neutral-800 shadow-xl'
          : 'bg-white text-neutral-900 border-neutral-200/90 shadow-sm hover:border-neutral-300',
        className
      )}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold">{plan.name}</h3>
        <StatusBadge
          status={plan.badgeText}
          variant={plan.badgeVariant}
          className={isDark ? 'bg-neutral-800/80 text-white border-neutral-700' : ''}
        />
      </div>

      <div className="flex items-baseline gap-1 mb-2">
        <span className="text-3xl font-bold tracking-tight">{plan.price}</span>
        <span className={cn('text-xs', isDark ? 'text-neutral-400' : 'text-neutral-500')}>
          /{plan.period}
        </span>
      </div>

      {plan.description && (
        <p className={cn('text-xs mb-6', isDark ? 'text-neutral-400' : 'text-neutral-500')}>
          {plan.description}
        </p>
      )}

      <button
        type="button"
        onClick={() => onSelect && onSelect(plan.id)}
        disabled={plan.isCurrent}
        className={cn(
          'w-full py-2 px-4 rounded-xl text-xs font-semibold transition-all mb-6 focus:outline-none focus:ring-2 focus:ring-offset-2',
          plan.isCurrent
            ? isDark
              ? 'bg-neutral-800 text-neutral-400 cursor-default'
              : 'bg-neutral-100 text-neutral-400 cursor-default'
            : isDark
            ? 'bg-white text-neutral-900 hover:bg-neutral-100 focus:ring-white'
            : 'bg-[#111827] text-white hover:bg-neutral-800 focus:ring-neutral-900'
        )}
      >
        {plan.isCurrent ? 'Current Plan' : plan.ctaLabel || 'Upgrade Plan'}
      </button>

      <div className={cn('pt-4 border-t', isDark ? 'border-neutral-800' : 'border-neutral-100')}>
        <div className={cn('text-[11px] font-semibold uppercase tracking-wider mb-3', isDark ? 'text-neutral-400' : 'text-neutral-500')}>
          What's included:
        </div>
        <ul className="space-y-2.5">
          {plan.features.map((feature, idx) => (
            <li key={idx} className="flex items-start gap-2.5 text-xs">
              <CheckCircle2
                className={cn(
                  'h-4 w-4 shrink-0 mt-0.5',
                  feature.included
                    ? isDark
                      ? 'text-white'
                      : 'text-neutral-900'
                    : 'text-neutral-400 opacity-40'
                )}
              />
              <span
                className={cn(
                  feature.included
                    ? isDark
                      ? 'text-neutral-200'
                      : 'text-neutral-700'
                    : 'text-neutral-400 line-through'
                )}
              >
                {feature.text}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

