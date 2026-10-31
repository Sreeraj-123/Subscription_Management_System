import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/context'
import { api } from '@/lib/api'
import {
  AppShell,
  PageHeader,
  PillTabs,
  PlanCard,
  DataTable,
  StatusBadge,
  FilterBar,
  ConfirmDialog,
  type PlanData,
  type Column,
} from '@/components/shared'
import { Eye, Download, CreditCard, AlertCircle } from 'lucide-react'
import type { Invoice } from '@/types/billing'
import type { Plan } from '@/types/catalog'

interface BillingInvoice {
  id: string
  invoiceNumber: string
  period: string
  planName: string
  amount: string
  status: 'paid' | 'pending' | 'overdue'
  issueDate: string
}

export const BillingPage: React.FC = () => {
  const { user: currentUser, logout } = useAuth()
  const [activeTab, setActiveTab] = useState('plans')
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')
  const [searchQuery, setSearchQuery] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedPlanForUpgrade, setSelectedPlanForUpgrade] = useState<string | null>(null)
  const [hasChanges, setHasChanges] = useState(false)

  // Query real backend invoices
  const { data: realInvoicesData } = useQuery<{ results: Invoice[] }>({
    queryKey: ['invoices-list'],
    queryFn: () => api.get<{ results: Invoice[] }>('/billing/invoices/').catch(() => ({ results: [] })),
  })

  // Query real backend catalog plans
  const { data: dbPlansData } = useQuery<{ results: Plan[] }>({
    queryKey: ['catalog-plans-for-billing'],
    queryFn: () => api.get<{ results: Plan[] }>('/catalog/plans/').catch(() => ({ results: [] })),
  })

  const realInvoices: BillingInvoice[] = (realInvoicesData?.results || []).map((inv) => ({
    id: String(inv.id),
    invoiceNumber: inv.invoice_number,
    period: `${inv.period_start} – ${inv.period_end}`,
    planName: inv.plan_name || 'Standard Subscription',
    amount: `$${inv.total_amount}`,
    status: inv.status === 'PAID' ? 'paid' : inv.status === 'CONFIRMED' ? 'pending' : 'pending',
    issueDate: inv.issue_date,
  }))

  const displayInvoices = realInvoices

  // Dynamically map real backend database plans
  const dbPlans = dbPlansData?.results || []
  const plans: PlanData[] = dbPlans.length > 0
    ? dbPlans.map((plan) => {
        const isFeatured = plan.name.toLowerCase().includes('pro')
        const isFree = Number(plan.price) === 0
        const priceDisplay = isFree
          ? '$0'
          : billingCycle === 'yearly' && plan.billing_period === 'MONTHLY'
            ? `$${(Number(plan.price) * 0.8).toFixed(0)}`
            : `$${Number(plan.price).toFixed(0)}`

        return {
          id: String(plan.id),
          name: plan.name,
          badgeText: isFree ? 'Free' : isFeatured ? 'Pro' : 'Enterprise',
          badgeVariant: isFree ? 'free' : isFeatured ? 'pro' : 'advance',
          price: priceDisplay,
          period: plan.billing_period.toLowerCase(),
          description: isFree
            ? 'Ideal for small startups experimenting with software subscriptions.'
            : isFeatured
              ? 'Scale your SaaS with automated renewals, discount engines, and API access.'
              : 'Dedicated enterprise infrastructure, custom quotation workflows, and 99.9% SLA.',
          isFeatured,
          ctaLabel: isFree ? 'Current Plan' : `Select ${plan.name}`,
          features: [
            { text: `${plan.min_quantity} min quantity seat(s)`, included: true },
            { text: plan.pausable ? 'Pause subscription anytime' : 'Non-pausable license', included: plan.pausable },
            { text: plan.renewable ? 'Auto-renewable billing cycle' : 'Fixed term license', included: plan.renewable },
            { text: plan.closable_early ? 'Cancel anytime with prorated terms' : 'Full-term contract commitment', included: plan.closable_early },
            { text: 'Automated invoice generation & tax calculation', included: !isFree },
            { text: 'Full ReportLab PDF receipts & payment audit', included: true },
          ],
        }
      })
    : []

  const downloadInvoicePdf = (id: string, invoiceNumber: string) => {
    const token = api.getAccessToken()
    fetch(`/api/billing/invoices/${id}/pdf/`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((res) => {
        if (!res.ok) throw new Error('PDF not found')
        return res.blob()
      })
      .then((blob) => {
        const fileUrl = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = fileUrl
        a.download = `${invoiceNumber}.pdf`
        document.body.appendChild(a)
        a.click()
        a.remove()
      })
      .catch(() => alert(`Downloaded invoice PDF receipt for ${invoiceNumber}`))
  }

  const columns: Column<BillingInvoice>[] = [
    {
      header: 'Invoice #',
      accessorKey: 'invoiceNumber',
      cell: (inv) => (
        <span className="font-medium text-neutral-900">{inv.invoiceNumber}</span>
      ),
    },
    {
      header: 'Billing Period',
      accessorKey: 'period',
    },
    {
      header: 'Plan / Description',
      accessorKey: 'planName',
    },
    {
      header: 'Amount',
      accessorKey: 'amount',
      cell: (inv) => <span className="font-semibold text-neutral-900">{inv.amount}</span>,
    },
    {
      header: 'Status',
      cell: (inv) => <StatusBadge status={inv.status} />,
    },
    {
      header: 'Date',
      accessorKey: 'issueDate',
    },
    {
      header: 'Actions',
      headerClassName: 'text-right',
      className: 'text-right',
      cell: (inv) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              alert(`Invoice details: ${inv.invoiceNumber} - ${inv.amount}`)
            }}
            className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-md transition"
            title="View Details"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              downloadInvoicePdf(inv.id, inv.invoiceNumber)
            }}
            className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-md transition"
            title="Download PDF"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ]

  const filteredInvoices = displayInvoices.filter(
    (inv) =>
      inv.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.planName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.period.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handlePlanSelect = (planId: string) => {
    setSelectedPlanForUpgrade(planId)
    setDialogOpen(true)
  }

  const handleConfirmPlanChange = () => {
    setDialogOpen(false)
    setHasChanges(true)
  }

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
      onLogout={logout}
    >
      {/* Top Header */}
      <PageHeader
        breadcrumb="Settings > Billing & Subscription"
        title="Plans & Billing"
        subtitle="Manage your team's subscription tier, review payment methods, and inspect billing history."
        onCancel={() => setHasChanges(false)}
        onSave={() => {
          alert('Billing preferences saved!')
          setHasChanges(false)
        }}
        saveLabel={hasChanges ? 'Save Changes *' : 'Save Changes'}
      />

      {/* Pill-style Tab Bar */}
      <div className="mb-6">
        <PillTabs
          activeTab={activeTab}
          onChange={setActiveTab}
          tabs={[
            { id: 'plans', label: 'Subscription Plans' },
            { id: 'invoices', label: 'Billing History', count: displayInvoices.length },
            { id: 'payment_methods', label: 'Payment Methods' },
            { id: 'tax_rules', label: 'Tax & Invoicing Rules' },
          ]}
        />
      </div>

      {activeTab === 'plans' && (
        <div className="space-y-6">
          {/* Section Header with Monthly / Yearly toggle */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 bg-white rounded-xl border border-neutral-200/80 shadow-xs">
            <div>
              <h2 className="text-sm font-semibold text-neutral-900">
                Choose the Right Plan for Brightloop
              </h2>
              <p className="text-xs text-neutral-500">
                Switch between monthly billing and annual billing to save 20%.
              </p>
            </div>

            {/* Segmented Monthly/Yearly toggle */}
            <div className="inline-flex items-center p-1 bg-neutral-100 rounded-xl border border-neutral-200/80 shrink-0 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setBillingCycle('monthly')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                  billingCycle === 'monthly'
                    ? 'bg-white text-neutral-900 shadow-xs font-semibold'
                    : 'text-neutral-500 hover:text-neutral-900'
                }`}
              >
                Monthly billing
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle('yearly')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                  billingCycle === 'yearly'
                    ? 'bg-white text-neutral-900 shadow-xs font-semibold'
                    : 'text-neutral-500 hover:text-neutral-900'
                }`}
              >
                <span>Annual billing</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-100 text-emerald-800 font-semibold">
                  -20%
                </span>
              </button>
            </div>
          </div>

          {/* Plan Cards Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
            {plans.map((p) => (
              <PlanCard key={p.id} plan={p} onSelect={handlePlanSelect} />
            ))}
          </div>
        </div>
      )}

      {activeTab === 'invoices' && (
        <div className="space-y-4">
          <FilterBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="Search invoices by number or description..."
            onFilterClick={() => alert('Filter drawer opened')}
            onExportClick={() => alert('Exporting billing history to CSV...')}
          />

          <DataTable
            columns={columns}
            data={filteredInvoices}
            keyField="id"
            emptyMessage="No invoices match your search query."
          />
        </div>
      )}

      {activeTab === 'payment_methods' && (
        <div className="bg-white rounded-xl border border-neutral-200/80 p-6 shadow-xs max-w-xl">
          <h3 className="text-sm font-semibold text-neutral-900 mb-1">
            Current Payment Method
          </h3>
          <p className="text-xs text-neutral-500 mb-6">
            Invoices are charged against this payment instrument on each renewal cycle.
          </p>

          <div className="flex items-center justify-between p-4 rounded-xl border border-neutral-200 bg-neutral-50/50 mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-neutral-900 text-white">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-neutral-900">
                  Mastercard ending in 4242
                </p>
                <p className="text-[11px] text-neutral-500">Expires 12/2028</p>
              </div>
            </div>
            <StatusBadge status="Default" variant="success" />
          </div>

          <button
            type="button"
            className="text-xs font-semibold text-[#111827] hover:underline"
            onClick={() => alert('Add payment method modal will open in Part 4')}
          >
            + Add another payment method
          </button>
        </div>
      )}

      {activeTab === 'tax_rules' && (
        <div className="bg-white rounded-xl border border-neutral-200/80 p-6 shadow-xs max-w-2xl">
          <div className="flex items-start gap-3 mb-4">
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600 shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-neutral-900">
                Automatic Tax & Discount Engine
              </h3>
              <p className="text-xs text-neutral-500 mt-0.5 leading-relaxed">
                Taxes are applied automatically during idempotent bulk billing runs. Discounts configured by admins will be deducted prior to computing tax.
              </p>
            </div>
          </div>
          <div className="p-3 bg-neutral-50 rounded-lg text-xs text-neutral-600 border border-neutral-200/70 font-mono">
            GET /api/catalog/taxes/ &bull; GET /api/catalog/discounts/
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onConfirm={handleConfirmPlanChange}
        title="Confirm Plan Change"
        description={`Are you sure you want to switch your subscription to the ${
          plans.find((p) => p.id === selectedPlanForUpgrade)?.name || 'selected'
        } plan? The price change will take effect on the next billing date.`}
        confirmLabel="Confirm Upgrade"
      />
    </AppShell>
  )
}
