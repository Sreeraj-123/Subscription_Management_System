import React, { useState } from 'react'
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
  Plus,
  Play,
  Pause,
  XCircle,
  AlertCircle,
  ChevronRight,
  X,
} from 'lucide-react'
import { api } from '@/lib/api'
import { useAuth } from '@/context'
import type { Subscription, SubscriptionStatus } from '@/types/subscriptions'
import type { QuotationTemplate } from '@/types/catalog'

export const SubscriptionsPage: React.FC = () => {
  const { user: currentUser } = useAuth()
  const queryClient = useQueryClient()

  const [activeTab, setActiveTab] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)

  // Form for creating subscription from template
  const [templateForm, setTemplateForm] = useState(() => ({
    customer_id: '',
    template_id: '',
    start_date: new Date().toISOString().split('T')[0],
    notes: '',
  }))

  // Queries
  const { data: subsData, isLoading } = useQuery<{ results: Subscription[] }>({
    queryKey: ['subscriptions-list'],
    queryFn: () => api.get<{ results: Subscription[] }>('/subscriptions/'),
  })

  const { data: templatesData } = useQuery<{ results: QuotationTemplate[] }>({
    queryKey: ['catalog-templates'],
    queryFn: () => api.get<{ results: QuotationTemplate[] }>('/catalog/templates/'),
  })

  const subscriptions = subsData?.results || []
  const templates = templatesData?.results || []

  // Transition status mutation
  const transitionMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: SubscriptionStatus }) =>
      api.post(`/subscriptions/${id}/transition/`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions-list'] })
    },
    onError: (err: any) => {
      alert(err.message || 'Transition failed.')
    },
  })

  // Create from template mutation
  const createFromTemplateMutation = useMutation({
    mutationFn: (data: typeof templateForm) =>
      api.post('/subscriptions/create-from-template/', {
        customer_id: Number(data.customer_id),
        template_id: Number(data.template_id),
        start_date: data.start_date || undefined,
        notes: data.notes,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions-list'] })
      setIsTemplateModalOpen(false)
      setModalError(null)
      setTemplateForm({
        customer_id: '',
        template_id: '',
        start_date: new Date().toISOString().split('T')[0],
        notes: '',
      })
    },
    onError: (err: any) => {
      setModalError(err.message || 'Failed to create subscription from template.')
    },
  })

  const filteredSubs = subscriptions.filter((sub) => {
    const matchesTab = activeTab === 'ALL' || sub.status === activeTab
    const query = searchQuery.toLowerCase()
    const matchesSearch =
      sub.subscription_number.toLowerCase().includes(query) ||
      sub.customer_email.toLowerCase().includes(query) ||
      sub.plan_name.toLowerCase().includes(query)
    return matchesTab && matchesSearch
  })

  const columns: Column<Subscription>[] = [
    {
      header: 'Subscription #',
      cell: (sub) => (
        <div>
          <span className="font-mono font-semibold text-neutral-900">{sub.subscription_number}</span>
          <p className="text-[11px] text-neutral-400">
            Terms: {sub.payment_terms}
          </p>
        </div>
      ),
    },
    {
      header: 'Customer',
      cell: (sub) => (
        <div>
          <p className="font-medium text-neutral-900">{sub.customer_name}</p>
          <p className="text-[11px] text-neutral-400">{sub.customer_email}</p>
        </div>
      ),
    },
    {
      header: 'Plan',
      cell: (sub) => (
        <div>
          <span className="font-semibold text-neutral-800">{sub.plan_name}</span>
          <p className="text-[11px] text-neutral-400 lowercase">{sub.plan_period} cycle</p>
        </div>
      ),
    },
    {
      header: 'Dates',
      cell: (sub) => (
        <span className="text-neutral-600 text-[11px]">
          {sub.start_date} &rarr; {sub.expiry_date || 'Ongoing'}
        </span>
      ),
    },
    {
      header: 'Status',
      cell: (sub) => <StatusBadge status={sub.status} />,
    },
    {
      header: 'Amount',
      cell: (sub) => (
        <span className="font-semibold text-neutral-900">${sub.total_amount}</span>
      ),
    },
    {
      header: 'Actions',
      headerClassName: 'text-right',
      className: 'text-right',
      cell: (sub) => {
        const isStaffOrAdmin = currentUser?.role !== 'CUSTOMER'
        if (!isStaffOrAdmin) return null

        return (
          <div className="flex items-center justify-end gap-1.5">
            {sub.status === 'DRAFT' && (
              <button
                type="button"
                onClick={() => transitionMutation.mutate({ id: sub.id, status: 'QUOTATION' })}
                className="px-2 py-1 text-[11px] font-medium bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded transition"
              >
                Send Quote
              </button>
            )}
            {sub.status === 'QUOTATION' && (
              <button
                type="button"
                onClick={() => transitionMutation.mutate({ id: sub.id, status: 'CONFIRMED' })}
                className="px-2 py-1 text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded hover:bg-emerald-100 transition"
              >
                Confirm
              </button>
            )}
            {sub.status === 'CONFIRMED' && (
              <button
                type="button"
                onClick={() => transitionMutation.mutate({ id: sub.id, status: 'ACTIVE' })}
                className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold bg-[#111827] text-white rounded hover:bg-neutral-800 transition"
              >
                <Play className="w-3 h-3 text-emerald-400" />
                <span>Activate</span>
              </button>
            )}
            {sub.status === 'ACTIVE' && (
              <>
                <button
                  type="button"
                  onClick={() => transitionMutation.mutate({ id: sub.id, status: 'PAUSED' })}
                  className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200 rounded hover:bg-amber-100 transition"
                  title="Pause Subscription"
                >
                  <Pause className="w-3 h-3" />
                  <span>Pause</span>
                </button>
                <button
                  type="button"
                  onClick={() => transitionMutation.mutate({ id: sub.id, status: 'CLOSED' })}
                  className="p-1 text-neutral-400 hover:text-rose-600 rounded transition"
                  title="Close Early"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </>
            )}
            {sub.status === 'PAUSED' && (
              <button
                type="button"
                onClick={() => transitionMutation.mutate({ id: sub.id, status: 'ACTIVE' })}
                className="px-2.5 py-1 text-[11px] font-semibold bg-emerald-600 text-white rounded hover:bg-emerald-700 transition"
              >
                Resume
              </button>
            )}
            {sub.status === 'CLOSED' && (
              <button
                type="button"
                onClick={() => transitionMutation.mutate({ id: sub.id, status: 'ACTIVE' })}
                className="px-2 py-1 text-[11px] font-medium bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded transition"
              >
                Renew
              </button>
            )}
          </div>
        )
      },
    },
  ]

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
        breadcrumb="Subscription Ops > Lifecycle"
        title="Subscriptions"
        subtitle="Track subscription contracts, transition lifecycle stages, and monitor recurring renewal terms."
        extraActions={
          currentUser?.role !== 'CUSTOMER' && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsTemplateModalOpen(true)}
                className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-[#111827] rounded-lg hover:bg-neutral-800 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New from Template</span>
              </button>
            </div>
          )
        }
      />

      {/* Lifecycle Flow Banner */}
      <div className="p-4 bg-white rounded-xl border border-neutral-200/80 mb-6 shadow-xs overflow-x-auto">
        <div className="flex items-center justify-between min-w-[500px]">
          {[
            { label: 'Draft', desc: 'Draft quote' },
            { label: 'Quotation', desc: 'Sent to customer' },
            { label: 'Confirmed', desc: 'Contract agreed' },
            { label: 'Active', desc: 'Invoicing & renewals' },
            { label: 'Closed', desc: 'Completed / closed' },
          ].map((step, idx) => (
            <React.Fragment key={idx}>
              <div className="flex flex-col items-center text-center">
                <span className="text-xs font-semibold text-neutral-800">{step.label}</span>
                <span className="text-[10px] text-neutral-400">{step.desc}</span>
              </div>
              {idx < 4 && <ChevronRight className="w-4 h-4 text-neutral-300 shrink-0" />}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <PillTabs
          activeTab={activeTab}
          onChange={setActiveTab}
          tabs={[
            { id: 'ALL', label: 'All Subscriptions', count: subscriptions.length },
            { id: 'ACTIVE', label: 'Active', count: subscriptions.filter((s) => s.status === 'ACTIVE').length },
            { id: 'QUOTATION', label: 'Quotations', count: subscriptions.filter((s) => s.status === 'QUOTATION').length },
            { id: 'CONFIRMED', label: 'Confirmed', count: subscriptions.filter((s) => s.status === 'CONFIRMED').length },
            { id: 'PAUSED', label: 'Paused', count: subscriptions.filter((s) => s.status === 'PAUSED').length },
            { id: 'CLOSED', label: 'Closed', count: subscriptions.filter((s) => s.status === 'CLOSED').length },
          ]}
        />
      </div>

      {/* Table */}
      <div className="space-y-4">
        <FilterBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search by SUB- number, customer, or plan..."
        />

        <DataTable
          columns={columns}
          data={filteredSubs}
          keyField="id"
          isLoading={isLoading}
          emptyMessage="No subscriptions match this view. Click 'New from Template' to start one."
        />
      </div>

      {/* Modal: Create from Template */}
      {isTemplateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-neutral-200 overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-neutral-100">
              <h3 className="text-sm font-semibold text-neutral-900">
                Create Subscription from Template
              </h3>
              <button
                type="button"
                onClick={() => setIsTemplateModalOpen(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                createFromTemplateMutation.mutate(templateForm)
              }}
              className="p-5 space-y-3.5"
            >
              {modalError && (
                <div className="flex items-start gap-2 p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{modalError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Customer Account ID
                </label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 1 (Admin/Customer ID)"
                  value={templateForm.customer_id}
                  onChange={(e) => setTemplateForm({ ...templateForm, customer_id: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-neutral-300 rounded-lg text-neutral-900 focus:outline-none focus:ring-2 focus:ring-[#111827]"
                />
                <p className="text-[10px] text-neutral-400 mt-0.5">
                  ID of user (Admin=1, or customer user ID).
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Quotation Template
                </label>
                <select
                  required
                  value={templateForm.template_id}
                  onChange={(e) => setTemplateForm({ ...templateForm, template_id: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-neutral-300 rounded-lg text-neutral-900 focus:outline-none focus:ring-2 focus:ring-[#111827]"
                >
                  <option value="">Select a template...</option>
                  {templates.map((tpl) => (
                    <option key={tpl.id} value={tpl.id}>
                      {tpl.name} ({tpl.plan_name})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  required
                  value={templateForm.start_date}
                  onChange={(e) => setTemplateForm({ ...templateForm, start_date: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-neutral-300 rounded-lg text-neutral-900 focus:outline-none focus:ring-2 focus:ring-[#111827]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Notes / PO Number
                </label>
                <textarea
                  rows={2}
                  placeholder="Optional customer reference or order notes..."
                  value={templateForm.notes}
                  onChange={(e) => setTemplateForm({ ...templateForm, notes: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-neutral-300 rounded-lg text-neutral-900 focus:outline-none focus:ring-2 focus:ring-[#111827]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setIsTemplateModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-medium text-neutral-700 bg-white border border-neutral-300 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createFromTemplateMutation.isPending}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-[#111827] hover:bg-neutral-800 rounded-lg transition disabled:opacity-50"
                >
                  {createFromTemplateMutation.isPending ? 'Creating...' : 'Initialize Subscription'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  )
}
