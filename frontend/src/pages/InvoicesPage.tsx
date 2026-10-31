import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  AppShell,
  PageHeader,
  PillTabs,
  DataTable,
  StatusBadge,
  FilterBar,
  type Column,
} from '@/components/shared'
import {
  Download,
  Eye,
  Mail,
  Zap,
  CheckCircle2,
  X,
  CreditCard,
} from 'lucide-react'
import { api } from '@/lib/api'
import { useAuth } from '@/context'
import type { Invoice, InvoiceStatus } from '@/types/billing'

export const InvoicesPage: React.FC = () => {
  const { user: currentUser } = useAuth()
  const queryClient = useQueryClient()

  const [activeTab, setActiveTab] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [runResult, setRunResult] = useState<string | null>(null)

  // Query invoices
  const { data: invoicesData, isLoading } = useQuery<{ results: Invoice[] }>({
    queryKey: ['invoices-list'],
    queryFn: () => api.get<{ results: Invoice[] }>('/billing/invoices/'),
  })

  const invoices = invoicesData?.results || []

  // Run billing mutation (Admin only)
  const runBillingMutation = useMutation({
    mutationFn: () => api.post<{ message: string; generated_count: number; skipped_count: number }>('/billing/run-billing/'),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['invoices-list'] })
      setRunResult(data.message)
      setTimeout(() => setRunResult(null), 5000)
    },
    onError: (err: any) => {
      alert(err.message || 'Billing run failed.')
    },
  })

  // Transition invoice status mutation
  const transitionMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: InvoiceStatus }) =>
      api.post(`/billing/invoices/${id}/transition/`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices-list'] })
      setSelectedInvoice(null)
    },
  })

  // Send email mutation
  const sendEmailMutation = useMutation({
    mutationFn: (id: number) => api.post(`/billing/invoices/${id}/send-email/`),
    onSuccess: () => {
      alert('Invoice notification dispatched to customer email.')
    },
  })

  const downloadPdf = (inv: Invoice) => {
    const token = api.getAccessToken()
    const url = `/api/billing/invoices/${inv.id}/pdf/`
    fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((res) => res.blob())
      .then((blob) => {
        const fileUrl = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = fileUrl
        a.download = `${inv.invoice_number}.pdf`
        document.body.appendChild(a)
        a.click()
        a.remove()
      })
      .catch(() => alert('Failed to download invoice PDF.'))
  }

  const filteredInvoices = invoices.filter((inv) => {
    const matchesTab = activeTab === 'ALL' || inv.status === activeTab
    const q = searchQuery.toLowerCase()
    const matchesQuery =
      inv.invoice_number.toLowerCase().includes(q) ||
      inv.customer_email.toLowerCase().includes(q) ||
      inv.subscription_number.toLowerCase().includes(q)
    return matchesTab && matchesQuery
  })

  const columns: Column<Invoice>[] = [
    {
      header: 'Invoice #',
      cell: (inv) => (
        <div>
          <span className="font-mono font-semibold text-neutral-900">{inv.invoice_number}</span>
          <p className="text-[11px] text-neutral-400">
            Sub: {inv.subscription_number} ({inv.plan_name})
          </p>
        </div>
      ),
    },
    {
      header: 'Customer',
      cell: (inv) => (
        <div>
          <p className="font-medium text-neutral-900">{inv.customer_name}</p>
          <p className="text-[11px] text-neutral-400">{inv.customer_email}</p>
        </div>
      ),
    },
    {
      header: 'Billing Period',
      cell: (inv) => (
        <span className="text-neutral-600 text-xs">
          {inv.period_start} &rarr; {inv.period_end}
        </span>
      ),
    },
    {
      header: 'Due Date',
      cell: (inv) => <span className="text-neutral-600 text-xs">{inv.due_date}</span>,
    },
    {
      header: 'Total Due',
      cell: (inv) => <span className="font-semibold text-neutral-900">${inv.total_amount}</span>,
    },
    {
      header: 'Status',
      cell: (inv) => <StatusBadge status={inv.status} />,
    },
    {
      header: 'Actions',
      headerClassName: 'text-right',
      className: 'text-right',
      cell: (inv) => (
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={() => setSelectedInvoice(inv)}
            className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded transition"
            title="View Details"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => downloadPdf(inv)}
            className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded transition"
            title="Download PDF"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
          {inv.status !== 'PAID' && inv.status !== 'CANCELLED' && (
            <Link
              to="/payments"
              className="p-1.5 text-neutral-400 hover:text-emerald-700 hover:bg-emerald-50 rounded transition"
              title="Record / Make Payment"
            >
              <CreditCard className="w-3.5 h-3.5" />
            </Link>
          )}
          {currentUser?.role !== 'CUSTOMER' && (
            <button
              type="button"
              onClick={() => sendEmailMutation.mutate(inv.id)}
              className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded transition"
              title="Email Customer"
            >
              <Mail className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ),
    },
  ]

  const isAdmin = currentUser?.role === 'ADMIN'

  return (
    <AppShell
      user={
        currentUser
          ? {
              email: currentUser.email,
              name: currentUser.first_name
                ? `${currentUser.first_name} ${currentUser.last_name || ''}`
                : currentUser.email,
              role: currentUser.role,
            }
          : undefined
      }
    >
      <PageHeader
        breadcrumb="Subscription Ops > Billing"
        title="Invoices & Billing"
        subtitle="Review generated subscription invoices, trigger bulk billing runs, and export PDF statements."
        extraActions={
          isAdmin && (
            <button
              type="button"
              onClick={() => runBillingMutation.mutate()}
              disabled={runBillingMutation.isPending}
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-[#111827] rounded-lg hover:bg-neutral-800 transition disabled:opacity-50"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              <span>{runBillingMutation.isPending ? 'Executing Billing...' : 'Run Billing Now'}</span>
            </button>
          )
        }
      />

      {/* Billing Run Notification Banner */}
      {runResult && (
        <div className="flex items-center gap-2.5 p-3.5 mb-6 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{runResult}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6">
        <PillTabs
          activeTab={activeTab}
          onChange={setActiveTab}
          tabs={[
            { id: 'ALL', label: 'All Invoices', count: invoices.length },
            { id: 'DRAFT', label: 'Draft', count: invoices.filter((i) => i.status === 'DRAFT').length },
            { id: 'CONFIRMED', label: 'Confirmed', count: invoices.filter((i) => i.status === 'CONFIRMED').length },
            { id: 'PAID', label: 'Paid', count: invoices.filter((i) => i.status === 'PAID').length },
            { id: 'CANCELLED', label: 'Cancelled', count: invoices.filter((i) => i.status === 'CANCELLED').length },
          ]}
        />
      </div>

      <div className="space-y-4">
        <FilterBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search invoices by INV- number, subscription, customer..."
        />

        <DataTable
          columns={columns}
          data={filteredInvoices}
          keyField="id"
          isLoading={isLoading}
          emptyMessage="No invoices found. Active subscriptions can be billed with 'Run Billing Now'."
        />
      </div>

      {/* Invoice Detail Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-neutral-200 overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-neutral-100">
              <div>
                <h3 className="text-sm font-semibold text-neutral-900">
                  {selectedInvoice.invoice_number}
                </h3>
                <p className="text-[11px] text-neutral-400">
                  Subscription: {selectedInvoice.subscription_number} ({selectedInvoice.plan_name})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedInvoice(null)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Meta pills */}
              <div className="flex items-center justify-between text-xs p-3 bg-neutral-50 rounded-xl border border-neutral-100">
                <div>
                  <span className="block text-[10px] uppercase text-neutral-400 font-semibold">Billed Period</span>
                  <span className="font-medium text-neutral-700">
                    {selectedInvoice.period_start} &rarr; {selectedInvoice.period_end}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] uppercase text-neutral-400 font-semibold">Status</span>
                  <StatusBadge status={selectedInvoice.status} />
                </div>
              </div>

              {/* Line items */}
              <div>
                <h4 className="text-xs font-semibold uppercase text-neutral-500 tracking-wider mb-2">
                  Line Items
                </h4>
                <div className="divide-y divide-neutral-100 border border-neutral-100 rounded-xl overflow-hidden">
                  {selectedInvoice.lines.map((l) => (
                    <div key={l.id} className="flex items-center justify-between p-3 text-xs">
                      <div>
                        <p className="font-medium text-neutral-900">{l.description}</p>
                        <p className="text-[11px] text-neutral-400">Qty: {l.quantity} &times; ${l.unit_price}</p>
                      </div>
                      <span className="font-semibold text-neutral-900">${l.total_amount}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Financial Breakdown */}
              <div className="space-y-1.5 pt-2 border-t text-xs">
                <div className="flex justify-between text-neutral-500">
                  <span>Subtotal:</span>
                  <span>${selectedInvoice.subtotal}</span>
                </div>
                {Number(selectedInvoice.discount_amount) > 0 && (
                  <div className="flex justify-between text-emerald-600 font-medium">
                    <span>Discount Applied:</span>
                    <span>-${selectedInvoice.discount_amount}</span>
                  </div>
                )}
                {Number(selectedInvoice.tax_amount) > 0 && (
                  <div className="flex justify-between text-neutral-500">
                    <span>Tax:</span>
                    <span>+${selectedInvoice.tax_amount}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold text-neutral-900 pt-2 border-t">
                  <span>Total Due:</span>
                  <span>${selectedInvoice.total_amount}</span>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between p-4 border-t border-neutral-100 bg-neutral-50/50">
              <button
                type="button"
                onClick={() => downloadPdf(selectedInvoice)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-700 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-50"
              >
                <Download className="w-3.5 h-3.5" />
                <span>PDF Invoice</span>
              </button>

              {currentUser?.role !== 'CUSTOMER' && (
                <div className="flex items-center gap-2">
                  {selectedInvoice.status === 'DRAFT' && (
                    <button
                      type="button"
                      onClick={() => transitionMutation.mutate({ id: selectedInvoice.id, status: 'CONFIRMED' })}
                      className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#111827] rounded-lg hover:bg-neutral-800"
                    >
                      Confirm Invoice
                    </button>
                  )}
                  {selectedInvoice.status === 'CONFIRMED' && (
                    <button
                      type="button"
                      onClick={() => transitionMutation.mutate({ id: selectedInvoice.id, status: 'CANCELLED' })}
                      className="px-3 py-1.5 text-xs font-medium text-rose-600 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100"
                    >
                      Cancel Invoice
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </AppShell>
  )
}
