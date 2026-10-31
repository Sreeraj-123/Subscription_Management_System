import React from 'react'
import { cn } from '@/lib/utils'

interface PageHeaderProps {
  title: string
  subtitle?: string
  breadcrumb?: string
  onCancel?: () => void
  onSave?: () => void
  cancelLabel?: string
  saveLabel?: string
  isSaving?: boolean
  extraActions?: React.ReactNode
  className?: string
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  breadcrumb,
  onCancel,
  onSave,
  cancelLabel = 'Cancel',
  saveLabel = 'Save Changes',
  isSaving = false,
  extraActions,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 pt-1 border-b border-neutral-200/80 mb-6',
        className
      )}
    >
      <div>
        {breadcrumb && (
          <div className="text-xs font-medium text-neutral-500 mb-1">
            {breadcrumb}
          </div>
        )}
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm text-neutral-500 mt-0.5">{subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-3">
        {extraActions}

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-neutral-700 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-neutral-400 transition"
          >
            {cancelLabel}
          </button>
        )}

        {onSave && (
          <button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            className="px-4 py-2 text-sm font-medium text-white bg-[#111827] rounded-lg hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-neutral-900 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Saving...' : saveLabel}
          </button>
        )}
      </div>
    </div>
  )
}

