import React from 'react'
import { cn } from '@/lib/utils'

export interface Column<T> {
  header: string
  accessorKey?: keyof T
  cell?: (item: T) => React.ReactNode
  className?: string
  headerClassName?: string
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  keyField?: keyof T
  isLoading?: boolean
  emptyMessage?: string
  className?: string
  onRowClick?: (item: T) => void
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  keyField = 'id' as keyof T,
  isLoading = false,
  emptyMessage = 'No records found.',
  className,
  onRowClick,
}: DataTableProps<T>) {
  if (isLoading) {
    return (
      <div className="w-full bg-white rounded-xl border border-neutral-200/80 overflow-hidden shadow-sm p-8 text-center">
        <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-neutral-300 border-t-[#111827] mb-2" />
        <p className="text-xs text-neutral-500">Loading data...</p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'w-full bg-white rounded-xl border border-neutral-200/80 overflow-hidden shadow-sm',
        className
      )}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-neutral-50/80 border-b border-neutral-200/70 text-neutral-600 font-semibold uppercase tracking-wider text-[11px]">
              {columns.map((col, idx) => (
                <th
                  key={idx}
                  className={cn(
                    'py-3 px-4 select-none',
                    col.headerClassName
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 text-neutral-700">
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="py-12 text-center text-neutral-400"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, rowIdx) => (
                <tr
                  key={String(row[keyField] ?? rowIdx)}
                  onClick={() => onRowClick && onRowClick(row)}
                  className={cn(
                    'hover:bg-neutral-50/60 transition-colors',
                    onRowClick && 'cursor-pointer'
                  )}
                >
                  {columns.map((col, colIdx) => (
                    <td
                      key={colIdx}
                      className={cn('py-3.5 px-4 align-middle', col.className)}
                    >
                      {col.cell
                        ? col.cell(row)
                        : col.accessorKey
                        ? String(row[col.accessorKey] ?? '')
                        : null}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

