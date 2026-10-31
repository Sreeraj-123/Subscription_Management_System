import React, { useState } from 'react'
import {
  AppShell,
  PageHeader,
} from '@/components/shared'
import {
  Building2,
  Mail,
  Globe,
  MapPin,
  FileText,
  Bell,
  Save,
  CheckCircle2,
  DollarSign,
  Clock,
  Shield,
} from 'lucide-react'
import { useAuth } from '@/context'

interface WorkspaceConfig {
  companyName: string
  supportEmail: string
  website: string
  address: string
  taxId: string
  currency: string
  timezone: string
  invoicePrefix: string
  subscriptionPrefix: string
  paymentTerms: string
  autoSendInvoices: boolean
  sendPaymentReceipts: boolean
  sendOverdueReminders: boolean
}

const DEFAULT_CONFIG: WorkspaceConfig = {
  companyName: 'Brightloop Technologies, Inc.',
  supportEmail: 'billing@brightloop.io',
  website: 'https://brightloop.io',
  address: '100 Innovation Way, Suite 400, San Francisco, CA 94107',
  taxId: 'US-94812049',
  currency: 'USD',
  timezone: 'America/New_York (EST/EDT)',
  invoicePrefix: 'INV-',
  subscriptionPrefix: 'SUB-',
  paymentTerms: 'NET_15',
  autoSendInvoices: true,
  sendPaymentReceipts: true,
  sendOverdueReminders: true,
}

export const WorkspaceSettingsPage: React.FC = () => {
  const { user, logout } = useAuth()

  // Load from localStorage or defaults
  const [config, setConfig] = useState<WorkspaceConfig>(() => {
    try {
      const saved = localStorage.getItem('workspace_settings')
      return saved ? JSON.parse(saved) : DEFAULT_CONFIG
    } catch {
      return DEFAULT_CONFIG
    }
  })

  const [savedSuccess, setSavedSuccess] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setSavedSuccess(false)

    setTimeout(() => {
      localStorage.setItem('workspace_settings', JSON.stringify(config))
      setIsSaving(false)
      setSavedSuccess(true)
      setTimeout(() => setSavedSuccess(false), 4000)
    }, 400)
  }

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
        breadcrumb="Settings > Workspace"
        title="Workspace & Organization Settings"
        subtitle="Manage company profile, default billing currency, invoice numbering series, and automated email rules."
        extraActions={
          <button
            type="submit"
            form="workspace-form"
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#111827] rounded-lg hover:bg-neutral-800 transition shadow-2xs disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
          </button>
        }
      />

      <div className="max-w-4xl space-y-6">
        {savedSuccess && (
          <div className="flex items-center gap-2.5 p-3.5 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl shadow-2xs animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-medium">
              Workspace settings and invoicing configuration updated successfully!
            </span>
          </div>
        )}

        <form id="workspace-form" onSubmit={handleSave} className="space-y-6">
          {/* 1. Company Profile Card */}
          <div className="bg-white border border-neutral-200/80 rounded-xl p-5 shadow-2xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-neutral-100">
              <Building2 className="w-4 h-4 text-neutral-800" />
              <div>
                <h3 className="text-sm font-semibold text-neutral-900">Organization Profile</h3>
                <p className="text-xs text-neutral-400">
                  Business details displayed on customer invoices and quotations
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Company / Legal Name
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={config.companyName}
                    onChange={(e) => setConfig({ ...config, companyName: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-white border border-neutral-300 rounded-lg text-neutral-900 focus:outline-none focus:ring-2 focus:ring-[#111827]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Billing Contact Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 w-3.5 h-3.5 text-neutral-400" />
                  <input
                    type="email"
                    required
                    value={config.supportEmail}
                    onChange={(e) => setConfig({ ...config, supportEmail: e.target.value })}
                    className="w-full pl-8 pr-3 py-2 text-xs bg-white border border-neutral-300 rounded-lg text-neutral-900 focus:outline-none focus:ring-2 focus:ring-[#111827]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Website URL
                </label>
                <div className="relative">
                  <Globe className="absolute left-3 top-2.5 w-3.5 h-3.5 text-neutral-400" />
                  <input
                    type="url"
                    value={config.website}
                    onChange={(e) => setConfig({ ...config, website: e.target.value })}
                    className="w-full pl-8 pr-3 py-2 text-xs bg-white border border-neutral-300 rounded-lg text-neutral-900 focus:outline-none focus:ring-2 focus:ring-[#111827]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Tax Registration / GSTIN / VAT ID
                </label>
                <div className="relative">
                  <Shield className="absolute left-3 top-2.5 w-3.5 h-3.5 text-neutral-400" />
                  <input
                    type="text"
                    value={config.taxId}
                    onChange={(e) => setConfig({ ...config, taxId: e.target.value })}
                    className="w-full pl-8 pr-3 py-2 text-xs bg-white border border-neutral-300 rounded-lg text-neutral-900 focus:outline-none focus:ring-2 focus:ring-[#111827]"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Registered Business Address
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-2.5 w-3.5 h-3.5 text-neutral-400" />
                  <input
                    type="text"
                    value={config.address}
                    onChange={(e) => setConfig({ ...config, address: e.target.value })}
                    className="w-full pl-8 pr-3 py-2 text-xs bg-white border border-neutral-300 rounded-lg text-neutral-900 focus:outline-none focus:ring-2 focus:ring-[#111827]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 2. Regional & Currency Settings */}
          <div className="bg-white border border-neutral-200/80 rounded-xl p-5 shadow-2xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-neutral-100">
              <DollarSign className="w-4 h-4 text-neutral-800" />
              <div>
                <h3 className="text-sm font-semibold text-neutral-900">Regional & Currency Defaults</h3>
                <p className="text-xs text-neutral-400">
                  Global currency symbol and operational timezone for automated billing runs
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Base Billing Currency
                </label>
                <select
                  value={config.currency}
                  onChange={(e) => setConfig({ ...config, currency: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-white border border-neutral-300 rounded-lg text-neutral-900 focus:outline-none focus:ring-2 focus:ring-[#111827]"
                >
                  <option value="USD">USD ($) — United States Dollar</option>
                  <option value="EUR">EUR (€) — Euro</option>
                  <option value="GBP">GBP (£) — British Pound</option>
                  <option value="INR">INR (₹) — Indian Rupee</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Operational Timezone
                </label>
                <div className="relative">
                  <Clock className="absolute left-3 top-2.5 w-3.5 h-3.5 text-neutral-400" />
                  <select
                    value={config.timezone}
                    onChange={(e) => setConfig({ ...config, timezone: e.target.value })}
                    className="w-full pl-8 pr-3 py-2 text-xs bg-white border border-neutral-300 rounded-lg text-neutral-900 focus:outline-none focus:ring-2 focus:ring-[#111827]"
                  >
                    <option value="UTC">UTC (Universal Coordinated Time)</option>
                    <option value="America/New_York (EST/EDT)">America/New_York (EST/EDT)</option>
                    <option value="America/Los_Angeles (PST/PDT)">America/Los_Angeles (PST/PDT)</option>
                    <option value="Europe/London (GMT/BST)">Europe/London (GMT/BST)</option>
                    <option value="Asia/Kolkata (IST)">Asia/Kolkata (IST)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Invoicing Series & Payment Terms */}
          <div className="bg-white border border-neutral-200/80 rounded-xl p-5 shadow-2xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-neutral-100">
              <FileText className="w-4 h-4 text-neutral-800" />
              <div>
                <h3 className="text-sm font-semibold text-neutral-900">Invoicing & Document Prefixes</h3>
                <p className="text-xs text-neutral-400">
                  Custom numbering sequence formats and standard payment due intervals
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Invoice Number Prefix
                </label>
                <input
                  type="text"
                  required
                  value={config.invoicePrefix}
                  onChange={(e) => setConfig({ ...config, invoicePrefix: e.target.value })}
                  placeholder="e.g. INV-"
                  className="w-full px-3 py-2 text-xs font-mono bg-white border border-neutral-300 rounded-lg text-neutral-900 focus:outline-none focus:ring-2 focus:ring-[#111827]"
                />
                <p className="text-[10px] text-neutral-400 mt-1">Generates: {config.invoicePrefix}0001042</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Subscription Prefix
                </label>
                <input
                  type="text"
                  required
                  value={config.subscriptionPrefix}
                  onChange={(e) => setConfig({ ...config, subscriptionPrefix: e.target.value })}
                  placeholder="e.g. SUB-"
                  className="w-full px-3 py-2 text-xs font-mono bg-white border border-neutral-300 rounded-lg text-neutral-900 focus:outline-none focus:ring-2 focus:ring-[#111827]"
                />
                <p className="text-[10px] text-neutral-400 mt-1">Generates: {config.subscriptionPrefix}000089</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Default Payment Terms
                </label>
                <select
                  value={config.paymentTerms}
                  onChange={(e) => setConfig({ ...config, paymentTerms: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-white border border-neutral-300 rounded-lg text-neutral-900 focus:outline-none focus:ring-2 focus:ring-[#111827]"
                >
                  <option value="IMMEDIATE">Due Upon Receipt (Immediate)</option>
                  <option value="NET_15">Net 15 Days</option>
                  <option value="NET_30">Net 30 Days</option>
                  <option value="NET_60">Net 60 Days</option>
                </select>
                <p className="text-[10px] text-neutral-400 mt-1">Sets invoice due date</p>
              </div>
            </div>
          </div>

          {/* 4. Automated Communication Rules */}
          <div className="bg-white border border-neutral-200/80 rounded-xl p-5 shadow-2xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-neutral-100">
              <Bell className="w-4 h-4 text-neutral-800" />
              <div>
                <h3 className="text-sm font-semibold text-neutral-900">Email Notifications & Automation</h3>
                <p className="text-xs text-neutral-400">
                  Control dispatch of transactional customer emails and collection reminders
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <label className="flex items-start gap-3 p-3 rounded-lg border border-neutral-100 hover:bg-neutral-50/60 cursor-pointer transition">
                <input
                  type="checkbox"
                  checked={config.autoSendInvoices}
                  onChange={(e) => setConfig({ ...config, autoSendInvoices: e.target.checked })}
                  className="mt-0.5 rounded text-neutral-900 focus:ring-[#111827]"
                />
                <div>
                  <p className="text-xs font-semibold text-neutral-900">Auto-email Invoices</p>
                  <p className="text-[11px] text-neutral-500">
                    Automatically deliver PDF invoice receipts to customer emails when billing runs generate them.
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 rounded-lg border border-neutral-100 hover:bg-neutral-50/60 cursor-pointer transition">
                <input
                  type="checkbox"
                  checked={config.sendPaymentReceipts}
                  onChange={(e) => setConfig({ ...config, sendPaymentReceipts: e.target.checked })}
                  className="mt-0.5 rounded text-neutral-900 focus:ring-[#111827]"
                />
                <div>
                  <p className="text-xs font-semibold text-neutral-900">Payment Confirmations</p>
                  <p className="text-[11px] text-neutral-500">
                    Send an instant receipt acknowledgment whenever a payment transaction is recorded or settled.
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 rounded-lg border border-neutral-100 hover:bg-neutral-50/60 cursor-pointer transition">
                <input
                  type="checkbox"
                  checked={config.sendOverdueReminders}
                  onChange={(e) => setConfig({ ...config, sendOverdueReminders: e.target.checked })}
                  className="mt-0.5 rounded text-neutral-900 focus:ring-[#111827]"
                />
                <div>
                  <p className="text-xs font-semibold text-neutral-900">Overdue Statement Reminders</p>
                  <p className="text-[11px] text-neutral-500">
                    Dispatch friendly automated reminder notices to customers for invoices past their due date.
                  </p>
                </div>
              </label>
            </div>
          </div>
        </form>
      </div>
    </AppShell>
  )
}
