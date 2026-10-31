import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  AppShell,
  PageHeader,
  DataTable,
  StatusBadge,
  FilterBar,
  PillTabs,
  type Column,
} from '@/components/shared'
import {
  CreditCard,
  PlusCircle,
  X,
  AlertCircle,
  DollarSign,
  Receipt,
  CheckCircle2,
  Calendar,
} from 'lucide-react'
import { api } from '@/lib/api'
import { useAuth } from '@/context'
import type { Payment, PaymentMethod, RecordPaymentPayload } from '@/types/payments'
import type { Invoice } from '@/types/billing'

export const PaymentsPage: React.FC = () => {
  const { user, logout } = useAuth()
  const queryClient = useQueryClient()

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedMethod, setSelectedMethod] = useState<string>('ALL')
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)

  // Form state
  const [formData, setFormData] = useState<{
    invoice_id: number | ''
    amount: string
    payment_method: PaymentMethod
    transaction_id: string
    note: string
  }>({
    invoice_id: '',
    amount: '',
    payment_method: 'CARD',
    transaction_id: '',
    note: '',
  })

  // 1. Fetch payments
  const { data: paymentsData, isLoading } = useQuery<{ results: Payment[] }>({
    queryKey: ['payments'],
    queryFn: () => api.get<{ results: Payment[] }>('/payments/'),
  })

  const payments = Array.isArray(paymentsData?.results) ? paymentsData.results : []

  // 2. Fetch invoices for the modal dropdown (unpaid only)
  const { data: invoicesData } = useQuery<{ results: Invoice[] }>({
    queryKey: ['invoices-for-payment'],
    queryFn: () => api.get<{ results: Invoice[] }>('/billing/invoices/'),
    enabled: isRecordModalOpen,
  })

  const openInvoices = (Array.isArray(invoicesData?.results) ? invoicesData.results : []).filter(
    (inv) => inv.status !== 'PAID' && inv.status !== 'CANCELLED'
  )

  // 3. Record payment mutation
  const recordMutation = useMutation({
    mutationFn: (payload: RecordPaymentPayload) => api.post<Payment>('/payments/', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] })
      queryClient.invalidateQueries({ queryKey: ['billing-invoices'] })
      queryClient.invalidateQueries({ queryKey: ['invoices-for-payment'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] })
      setIsRecordModalOpen(false)
      setFormData({
        invoice_id: '',
        amount: '',
        payment_method: 'CARD',
        transaction_id: '',
        note: '',
      })
      setModalError(null)
    },
    onError: (err: any) => {
      setModalError(err.message || 'Failed to record payment.')
    },
  })

  // Handle invoice change in modal (auto-fill remaining balance)
  const handleInvoiceChange = (invIdStr: string) => {
    const invId = Number(invIdStr)
    const selectedInv = openInvoices.find((i) => i.id === invId)
    if (selectedInv) {
      const rem =
        selectedInv.remaining_balance !== undefined
          ? Number(selectedInv.remaining_balance).toFixed(2)
          : Number(selectedInv.total_amount).toFixed(2)
      setFormData((prev) => ({
        ...prev,
        invoice_id: invId,
        amount: rem,
        transaction_id: `TXN-${Math.floor(100000 + Math.random() * 900000)}`,
      }))
    } else {
      setFormData((prev) => ({ ...prev, invoice_id: '', amount: '' }))
    }
  }

  const handleSubmitPayment = (e: React.FormEvent) => {
    e.preventDefault()
    setModalError(null)

    if (!formData.invoice_id) {
      setModalError('Please select an invoice to settle.')
      return
    }

    const amt = parseFloat(formData.amount)
    if (isNaN(amt) || amt <= 0) {
      setModalError('Amount must be a positive number.')
      return
    }

    recordMutation.mutate({
      invoice: Number(formData.invoice_id),
      amount: formData.amount,
      payment_method: formData.payment_method,
      transaction_id: formData.transaction_id,
      note: formData.note,
    })
  }

  // Filter payments
  const filteredPayments = payments.filter((p) => {
    const matchesMethod = selectedMethod === 'ALL' || p.payment_method === selectedMethod
    const q = searchQuery.toLowerCase()
    const matchesSearch =
      !searchQuery ||
      p.transaction_id?.toLowerCase().includes(q) ||
      p.invoice_number?.toLowerCase().includes(q) ||
      p.customer_email?.toLowerCase().includes(q) ||
      p.customer_name?.toLowerCase().includes(q) ||
      p.note?.toLowerCase().includes(q)

    return matchesMethod && matchesSearch
  })

  // Metrics summary
  const totalCollected = payments.reduce((acc, p) => acc + (parseFloat(p.amount) || 0), 0)
  const cardPaymentsCount = payments.filter((p) => p.payment_method === 'CARD').length
  const upiPaymentsCount = payments.filter((p) => p.payment_method === 'UPI').length

  const methodTabs = [
    { id: 'ALL', label: 'All Methods', count: payments.length },
    { id: 'CARD', label: 'Credit/Debit Card', count: cardPaymentsCount },
    { id: 'UPI', label: 'UPI / Instant', count: upiPaymentsCount },
    { id: 'BANK_TRANSFER', label: 'Bank Transfer' },
    { id: 'CASH', label: 'Cash' },
  ]

  const columns: Column<Payment>[] = [
    {
      header: 'Transaction ID',
      cell: (p) => (
        <div className="flex items-center gap-2">
          <Receipt className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
          <span className="font-mono text-xs font-semibold text-neutral-900">
            {p.transaction_id || `TXN-${p.id}`}
          </span>
        </div>
      ),
    },
    {
      header: 'Invoice #',
      cell: (p) => (
        <span className="font-mono text-xs text-neutral-600 bg-neutral-100 px-2 py-0.5 rounded">
          {p.invoice_number}
        </span>
      ),
    },
    ...(user?.role !== 'CUSTOMER'
      ? [
          {
            header: 'Customer',
            cell: (p: Payment) => (
              <div className="min-w-0">
                <p className="font-medium text-neutral-900 text-xs truncate">{p.customer_name}</p>
                <p className="text-[11px] text-neutral-400 truncate">{p.customer_email}</p>
              </div>
            ),
          },
        ]
      : []),
    {
      header: 'Amount Paid',
      cell: (p) => (
        <span className="font-semibold text-neutral-900 text-xs">
          ${parseFloat(p.amount).toFixed(2)}
        </span>
      ),
    },
    {
      header: 'Method',
      cell: (p) => {
        const variantMap: Record<PaymentMethod, 'advance' | 'success' | 'pro' | 'overdue'> = {
          CARD: 'pro',
          UPI: 'success',
          BANK_TRANSFER: 'advance',
          CASH: 'overdue',
        }
        return (
          <StatusBadge
            status={p.payment_method}
            variant={variantMap[p.payment_method] || 'pro'}
          />
        )
      },
    },
    {
      header: 'Payment Date',
      cell: (p) => (
        <div className="flex items-center gap-1.5 text-neutral-500 text-xs">
          <Calendar className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
          <span>
            {new Date(p.payment_date).toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </span>
        </div>
      ),
    },
    {
      header: 'Notes / Memo',
      cell: (p) => (
        <span className="text-neutral-500 text-xs truncate max-w-xs block">
          {p.note || '—'}
        </span>
      ),
    },
  ]

  return (
    <AppShell
      user={
        user
          ? {
              email: user.email,
              name: user.first_name ? `${user.first_name} ${user.last_name || ''}` : user.email,
              role: user.role,
            }
          : undefined
      }
      onLogout={logout}
    >
      <PageHeader
        breadcrumb="Finance > Payments"
        title="Payment Transactions"
        subtitle={
          user?.role === 'CUSTOMER'
            ? 'Review your payment history and receipts across all billing cycles.'
            : 'Track incoming customer payments, reconcile collections, and record offline settlements.'
        }
        extraActions={
          <button
            type="button"
            onClick={() => setIsRecordModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-[#111827] rounded-lg hover:bg-neutral-800 transition shadow-2xs"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>{user?.role === 'CUSTOMER' ? 'Pay an Invoice' : 'Record Payment'}</span>
          </button>
        }
      />

      <div className="space-y-5">
        {/* Metric Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 bg-white border border-neutral-200/80 rounded-xl shadow-2xs">
            <div className="flex items-center justify-between text-neutral-500 text-xs font-medium mb-1">
              <span>{user?.role === 'CUSTOMER' ? 'Total Spent' : 'Total Revenue Collected'}</span>
              <DollarSign className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-bold text-neutral-900">
              ${totalCollected.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] text-neutral-400 mt-1">Across all cleared payment receipts</p>
          </div>

          <div className="p-4 bg-white border border-neutral-200/80 rounded-xl shadow-2xs">
            <div className="flex items-center justify-between text-neutral-500 text-xs font-medium mb-1">
              <span>Successful Transactions</span>
              <CheckCircle2 className="w-4 h-4 text-sky-600" />
            </div>
            <p className="text-2xl font-bold text-neutral-900">{payments.length}</p>
            <p className="text-[11px] text-neutral-400 mt-1">Settled payments on record</p>
          </div>

          <div className="p-4 bg-white border border-neutral-200/80 rounded-xl shadow-2xs">
            <div className="flex items-center justify-between text-neutral-500 text-xs font-medium mb-1">
              <span>Primary Method</span>
              <CreditCard className="w-4 h-4 text-indigo-600" />
            </div>
            <p className="text-2xl font-bold text-neutral-900">
              {cardPaymentsCount >= upiPaymentsCount ? 'Credit Card' : 'UPI / Instant'}
            </p>
            <p className="text-[11px] text-neutral-400 mt-1">
              {cardPaymentsCount} card vs {upiPaymentsCount} UPI payments
            </p>
          </div>
        </div>

        {/* Filter & Search */}
        <div className="space-y-3">
          <PillTabs
            tabs={methodTabs}
            activeTab={selectedMethod}
            onChange={setSelectedMethod}
          />

          <FilterBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="Search by transaction ID, invoice #, or customer..."
          />
        </div>

        {/* Payments Table */}
        <DataTable
          columns={columns}
          data={filteredPayments}
          keyField="id"
          isLoading={isLoading}
          emptyMessage="No payment transactions found matching your criteria."
        />
      </div>

      {/* Record Payment Modal */}
      {isRecordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-neutral-200 overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-neutral-900" />
                <h3 className="text-sm font-semibold text-neutral-900">
                  {user?.role === 'CUSTOMER' ? 'Pay Open Invoice' : 'Record Invoice Settlement'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsRecordModalOpen(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitPayment} className="p-5 space-y-4">
              {modalError && (
                <div className="flex items-start gap-2 p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{modalError}</span>
                </div>
              )}

              {/* Invoice Selector */}
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Target Invoice <span className="text-rose-500">*</span>
                </label>
                {openInvoices.length === 0 ? (
                  <div className="p-3 text-xs text-neutral-500 bg-neutral-50 border border-neutral-200 rounded-lg">
                    No open unpaid invoices found. All invoices are settled!
                  </div>
                ) : (
                  <select
                    value={formData.invoice_id}
                    onChange={(e) => handleInvoiceChange(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs bg-white border border-neutral-300 rounded-lg text-neutral-900 focus:outline-none focus:ring-2 focus:ring-[#111827]"
                  >
                    <option value="">-- Choose an open invoice --</option>
                    {openInvoices.map((inv) => (
                      <option key={inv.id} value={inv.id}>
                        {inv.invoice_number} — {inv.customer_email} (Due: $
                        {inv.remaining_balance !== undefined
                          ? Number(inv.remaining_balance).toFixed(2)
                          : Number(inv.total_amount).toFixed(2)}
                        )
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Settlement Amount ($) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs text-neutral-400 font-semibold">
                    $
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="0.00"
                    className="w-full pl-7 pr-3 py-2 text-xs bg-white border border-neutral-300 rounded-lg text-neutral-900 focus:outline-none focus:ring-2 focus:ring-[#111827]"
                  />
                </div>
                <p className="text-[10px] text-neutral-400 mt-1">
                  Supports partial payments; status automatically updates to PAID upon full balance.
                </p>
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Payment Method
                </label>
                <select
                  value={formData.payment_method}
                  onChange={(e) =>
                    setFormData({ ...formData, payment_method: e.target.value as PaymentMethod })
                  }
                  className="w-full px-3 py-2 text-xs bg-white border border-neutral-300 rounded-lg text-neutral-900 focus:outline-none focus:ring-2 focus:ring-[#111827]"
                >
                  <option value="CARD">Credit / Debit Card</option>
                  <option value="UPI">UPI / Instant Pay</option>
                  <option value="BANK_TRANSFER">Bank Transfer (ACH / Wire)</option>
                  <option value="CASH">Cash Settlement</option>
                </select>
              </div>

              {/* Transaction ID */}
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Reference / Transaction ID
                </label>
                <input
                  type="text"
                  value={formData.transaction_id}
                  onChange={(e) => setFormData({ ...formData, transaction_id: e.target.value })}
                  placeholder="e.g. TXN-894125"
                  className="w-full px-3 py-2 text-xs bg-white border border-neutral-300 rounded-lg text-neutral-900 focus:outline-none focus:ring-2 focus:ring-[#111827]"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Notes / Audit Memo
                </label>
                <textarea
                  rows={2}
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  placeholder="Optional billing note..."
                  className="w-full px-3 py-2 text-xs bg-white border border-neutral-300 rounded-lg text-neutral-900 focus:outline-none focus:ring-2 focus:ring-[#111827]"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setIsRecordModalOpen(false)}
                  className="px-3 py-2 text-xs font-medium text-neutral-700 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={recordMutation.isPending || openInvoices.length === 0}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#111827] hover:bg-neutral-800 rounded-lg transition disabled:opacity-50"
                >
                  {recordMutation.isPending ? 'Processing...' : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  )
}
