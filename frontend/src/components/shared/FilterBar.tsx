import React from 'react'
import { Search, SlidersHorizontal, Download } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FilterBarProps {
  searchQuery: string
  onSearchChange: (value: string) => void
  searchPlaceholder?: string
  onFilterClick?: () => void
  onExportClick?: () => void
  hasActiveFilters?: boolean
  extraControls?: React.ReactNode
  className?: string
}

export const FilterBar: React.FC<FilterBarProps> = ({
  searchQuery,
  onSearchChange,
  searchPlaceholder = 'Search records...',
  onFilterClick,
  onExportClick,
  hasActiveFilters = false,
  extraControls,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4',
        className
      )}
    >
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          className="w-full pl-9 pr-4 py-1.5 text-xs bg-white border border-neutral-200/90 rounded-lg placeholder-neutral-400 text-neutral-800 focus:outline-none focus:ring-1 focus:ring-neutral-400 focus:border-neutral-400 transition"
        />
      </div>

      <div className="flex items-center gap-2">
        {extraControls}

        {onFilterClick && (
          <button
            type="button"
            onClick={onFilterClick}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border rounded-lg transition-colors bg-white',
              hasActiveFilters
                ? 'border-neutral-800 text-neutral-900 bg-neutral-50'
                : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'
            )}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>Filter</span>
          </button>
        )}

        {onExportClick && (
          <button
            type="button"
            onClick={onExportClick}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-600 bg-white border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export</span>
          </button>
        )}
      </div>
    </div>
  )
}

