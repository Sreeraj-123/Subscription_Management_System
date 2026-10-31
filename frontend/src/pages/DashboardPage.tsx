import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  AppShell,
  PageHeader,
  StatusBadge,
} from '@/components/shared'
import {
  TrendingUp,
  CreditCard,
  Users,
  AlertTriangle,
  Download,
  Calendar,
  ChevronRight,
  Receipt,
  Clock,
  PieChart,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import { api } from '@/lib/api'
import { useAuth } from '@/context'
import type { DashboardMetrics, AdminDashboardMetrics, CustomerDashboardMetrics } from '@/types/reports'

export const DashboardPage: React.FC = () => {
  const { user, logout } = useAuth()
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false)

  // Fetch financial dashboard metrics
  const { data: metrics, isLoading } = useQuery<DashboardMetrics>({
    queryKey: ['dashboard-metrics'],
    queryFn: () => api.get<DashboardMetrics>('/reports/dashboard/'),
    refetchInterval: 1000 * 60 * 2, // Auto-refresh every 2 minutes
  })

  const handleExportCSV = async (reportType: string) => {
    setIsExportMenuOpen(false)
    try {
      // Trigger native browser download using an authenticated blob fetch
      const token = localStorage.getItem('access_token')
      const response = await fetch(`http://127.0.0.1:8000/api/reports/export-csv/?report_type=${reportType}`, {
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
        },
      })
      if (!response.ok) throw new Error('Export failed')
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `brightloop_${reportType}_${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch {
      alert('Failed to download CSV export. Please try again.')
    }
  }

  // 1. CUSTOMER PORTAL VIEW
  if (user?.role === 'CUSTOMER' || metrics?.role === 'CUSTOMER') {
    const custMetrics = metrics as CustomerDashboardMetrics | undefined

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
          breadcrumb="Portal > Overview"
          title="My Account & Billing Overview"
          subtitle="Manage active SaaS subscriptions, monitor outstanding statements, and review settled payments."
          extraActions={
            <Link
              to="/payments"
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-[#111827] rounded-lg hover:bg-neutral-800 transition"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Make a Payment</span>
            </Link>
          }
        />

        <div className="space-y-6">
          {/* Customer KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="p-4 bg-white border border-neutral-200/80 rounded-xl shadow-2xs">
              <span className="text-neutral-500 text-xs font-medium">Active Subscriptions</span>
              <p className="text-2xl font-bold text-neutral-900 mt-1">
                {custMetrics?.active_subscriptions_count ?? 0}
              </p>
              <Link
                to="/subscriptions"
                className="inline-flex items-center gap-1 text-[11px] text-neutral-500 hover:text-neutral-900 mt-2 font-medium"
              >
                <span>View subscriptions</span>
                <ChevronRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="p-4 bg-white border border-neutral-200/80 rounded-xl shadow-2xs">
              <span className="text-neutral-500 text-xs font-medium">Total Paid to Date</span>
              <p className="text-2xl font-bold text-neutral-900 mt-1">
                ${(custMetrics?.total_spent ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
              <p className="text-[11px] text-neutral-400 mt-2">All-time cleared receipts</p>
            </div>

            <div className="p-4 bg-white border border-neutral-200/80 rounded-xl shadow-2xs">
              <span className="text-neutral-500 text-xs font-medium">Open Invoices</span>
              <p className="text-2xl font-bold text-neutral-900 mt-1">
                {custMetrics?.unpaid_invoices_count ?? 0}
              </p>
              <Link
                to="/invoices"
                className="inline-flex items-center gap-1 text-[11px] text-neutral-500 hover:text-neutral-900 mt-2 font-medium"
              >
                <span>Review statements</span>
                <ChevronRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="p-4 bg-white border border-neutral-200/80 rounded-xl shadow-2xs">
              <span className="text-neutral-500 text-xs font-medium">Outstanding Balance</span>
              <p
                className={`text-2xl font-bold mt-1 ${
                  (custMetrics?.outstanding_balance ?? 0) > 0 ? 'text-amber-600' : 'text-emerald-600'
                }`}
              >
                ${(custMetrics?.outstanding_balance ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
              <p className="text-[11px] text-neutral-400 mt-2">
                {(custMetrics?.outstanding_balance ?? 0) > 0 ? 'Due for settlement' : 'All clear!'}
              </p>
            </div>
          </div>

          {/* Customer Open Statements & Payments */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Open Invoices */}
            <div className="bg-white border border-neutral-200/80 rounded-xl p-5 shadow-2xs">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-neutral-700" />
                  <h3 className="text-sm font-semibold text-neutral-900">Open Invoices</h3>
                </div>
                <Link to="/invoices" className="text-xs text-neutral-500 hover:text-neutral-900">
                  View all
                </Link>
              </div>

              {custMetrics?.open_invoices && custMetrics.open_invoices.length > 0 ? (
                <div className="divide-y divide-neutral-100">
                  {custMetrics.open_invoices.map((inv) => (
                    <div key={inv.id} className="py-3 flex items-center justify-between">
                      <div>
                        <p className="font-mono text-xs font-semibold text-neutral-900">
                          {inv.invoice_number}
                        </p>
                        <p className="text-[11px] text-neutral-400 mt-0.5">
                          Due: {new Date(inv.due_date).toLocaleDateString()}
                          {inv.is_overdue && (
                            <span className="ml-2 font-semibold text-rose-600">Past Due</span>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-xs text-neutral-900">
                          ${inv.total_amount.toFixed(2)}
                        </span>
                        <Link
                          to="/payments"
                          className="px-2.5 py-1 text-[11px] font-semibold text-white bg-[#111827] rounded hover:bg-neutral-800 transition"
                        >
                          Pay Now
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-neutral-400 py-6 text-center">
                  You have no pending unpaid invoices. Everything is paid up!
                </p>
              )}
            </div>

            {/* Recent Payments */}
            <div className="bg-white border border-neutral-200/80 rounded-xl p-5 shadow-2xs">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-neutral-700" />
                  <h3 className="text-sm font-semibold text-neutral-900">Recent Payment Receipts</h3>
                </div>
                <Link to="/payments" className="text-xs text-neutral-500 hover:text-neutral-900">
                  View all
                </Link>
              </div>

              {custMetrics?.recent_payments && custMetrics.recent_payments.length > 0 ? (
                <div className="divide-y divide-neutral-100">
                  {custMetrics.recent_payments.map((p) => (
                    <div key={p.id} className="py-3 flex items-center justify-between">
                      <div>
                        <p className="font-mono text-xs font-medium text-neutral-900">
                          {p.transaction_id || `TXN-${p.id}`}
                        </p>
                        <p className="text-[11px] text-neutral-400 mt-0.5">
                          Invoice {p.invoice_number} • {new Date(p.payment_date).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="font-semibold text-xs text-emerald-600">
                          +${p.amount.toFixed(2)}
                        </span>
                        <p className="text-[10px] text-neutral-400 uppercase mt-0.5">
                          {p.payment_method}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-neutral-400 py-6 text-center">
                  No payment history recorded yet.
                </p>
              )}
            </div>
          </div>
        </div>
      </AppShell>
    )
  }

  // 2. ADMIN & INTERNAL EXECUTIVE FINANCE DASHBOARD
  const adminMetrics = metrics as AdminDashboardMetrics | undefined

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
        breadcrumb="Executive > Finance"
        title="Revenue & Performance Dashboard"
        subtitle="Real-time recurring revenue metrics, monthly collection velocity, and receivables health."
        extraActions={
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-neutral-700 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-50 transition shadow-2xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>

            {isExportMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-neutral-200 rounded-xl shadow-lg z-30 py-1.5">
                <button
                  type="button"
                  onClick={() => handleExportCSV('payments')}
                  className="w-full text-left px-3 py-1.5 text-xs text-neutral-700 hover:bg-neutral-100 transition"
                >
                  Export Payments CSV
                </button>
                <button
                  type="button"
                  onClick={() => handleExportCSV('invoices')}
                  className="w-full text-left px-3 py-1.5 text-xs text-neutral-700 hover:bg-neutral-100 transition"
                >
                  Export Invoices CSV
                </button>
                <button
                  type="button"
                  onClick={() => handleExportCSV('subscriptions')}
                  className="w-full text-left px-3 py-1.5 text-xs text-neutral-700 hover:bg-neutral-100 transition"
                >
                  Export Subscriptions CSV
                </button>
                <button
                  type="button"
                  onClick={() => handleExportCSV('revenue')}
                  className="w-full text-left px-3 py-1.5 text-xs text-neutral-700 hover:bg-neutral-100 transition"
                >
                  Export Monthly Revenue CSV
                </button>
              </div>
            )}
          </div>
        }
      />

      <div className="space-y-6">
        {/* KPI Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* MRR Card */}
          <div className="p-4 bg-white border border-neutral-200/80 rounded-xl shadow-2xs">
            <div className="flex items-center justify-between text-neutral-500 text-xs font-medium mb-1">
              <span>MRR (Monthly Recurring)</span>
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-bold text-neutral-900 tracking-tight">
              ${(adminMetrics?.mrr ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="inline-block px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 bg-emerald-50 rounded">
                ARR: ${(adminMetrics?.arr ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
              <span className="text-[10px] text-neutral-400">normalized</span>
            </div>
          </div>

          {/* Active Subscriptions Card */}
          <div className="p-4 bg-white border border-neutral-200/80 rounded-xl shadow-2xs">
            <div className="flex items-center justify-between text-neutral-500 text-xs font-medium mb-1">
              <span>Active Subscriptions</span>
              <Users className="w-4 h-4 text-sky-600" />
            </div>
            <p className="text-2xl font-bold text-neutral-900 tracking-tight">
              {adminMetrics?.active_subscriptions_count ?? 0}
            </p>
            <p className="text-[11px] text-neutral-400 mt-2">
              Out of {adminMetrics?.total_subscriptions_count ?? 0} total subscriptions
            </p>
          </div>

          {/* Total Revenue Collected */}
          <div className="p-4 bg-white border border-neutral-200/80 rounded-xl shadow-2xs">
            <div className="flex items-center justify-between text-neutral-500 text-xs font-medium mb-1">
              <span>Revenue Collected</span>
              <CreditCard className="w-4 h-4 text-indigo-600" />
            </div>
            <p className="text-2xl font-bold text-neutral-900 tracking-tight">
              ${(adminMetrics?.total_revenue_collected ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] text-neutral-400 mt-2">All-time settled payments</p>
          </div>

          {/* Total Outstanding */}
          <div className="p-4 bg-white border border-neutral-200/80 rounded-xl shadow-2xs">
            <div className="flex items-center justify-between text-neutral-500 text-xs font-medium mb-1">
              <span>Total Outstanding</span>
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <p className="text-2xl font-bold text-neutral-900 tracking-tight">
              ${(adminMetrics?.total_outstanding ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] text-neutral-400 mt-2">Unpaid open statements</p>
          </div>

          {/* Overdue Receivables */}
          <div className="p-4 bg-white border border-neutral-200/80 rounded-xl shadow-2xs">
            <div className="flex items-center justify-between text-neutral-500 text-xs font-medium mb-1">
              <span>Overdue Receivables</span>
              <AlertTriangle className="w-4 h-4 text-rose-600" />
            </div>
            <p className="text-2xl font-bold text-rose-600 tracking-tight">
              ${(adminMetrics?.overdue_amount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="inline-block px-1.5 py-0.5 text-[10px] font-semibold text-rose-700 bg-rose-50 rounded">
                {adminMetrics?.overdue_invoices_count ?? 0} overdue
              </span>
              <span className="text-[10px] text-neutral-400">past due date</span>
            </div>
          </div>
        </div>

        {/* Chart & Plan Breakdown Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Revenue Velocity Chart (Recharts) */}
          <div className="lg:col-span-2 bg-white border border-neutral-200/80 rounded-xl p-5 shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-neutral-900">Monthly Collection Velocity</h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Cleared transaction volume across the past 6 billing cycles
                </p>
              </div>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium text-neutral-600 bg-neutral-100 rounded">
                <Calendar className="w-3 h-3" />
                <span>6 Months</span>
              </span>
            </div>

            <div className="h-64 w-full">
              {isLoading || !adminMetrics?.revenue_by_month ? (
                <div className="h-full flex items-center justify-center text-xs text-neutral-400">
                  Loading revenue chart...
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={adminMetrics.revenue_by_month}
                    margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis
                      dataKey="label"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: '#64748B', fontSize: 11 }}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: '#64748B', fontSize: 11 }}
                      tickFormatter={(value) => `$${value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value}`}
                    />
                    <Tooltip
                      formatter={(value: any) => [`$${Number(value).toLocaleString()}`, 'Collections']}
                      contentStyle={{
                        backgroundColor: '#1E293B',
                        borderRadius: '8px',
                        border: 'none',
                        color: '#fff',
                        fontSize: '12px',
                      }}
                      itemStyle={{ color: '#F8FAFC' }}
                    />
                    <Bar
                      dataKey="revenue"
                      fill="#0F172A"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={48}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Plan Distribution Breakdown */}
          <div className="bg-white border border-neutral-200/80 rounded-xl p-5 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <PieChart className="w-4 h-4 text-neutral-700" />
                <h3 className="text-sm font-semibold text-neutral-900">Active Plan Distribution</h3>
              </div>

              <div className="space-y-4">
                {adminMetrics?.plan_distribution && adminMetrics.plan_distribution.length > 0 ? (
                  adminMetrics.plan_distribution.map((item, idx) => {
                    const totalActive = adminMetrics.active_subscriptions_count || 1
                    const pct = Math.round((item.count / totalActive) * 100)
                    return (
                      <div key={idx} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-neutral-800">{item.plan_name}</span>
                          <span className="text-neutral-500 font-semibold">
                            {item.count} subs ({pct}%)
                          </span>
                        </div>
                        <div className="w-full bg-neutral-100 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              idx === 0 ? 'bg-[#0F172A]' : idx === 1 ? 'bg-indigo-600' : 'bg-sky-500'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <p className="text-xs text-neutral-400 py-4 text-center">No active plans yet.</p>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-neutral-100 mt-6">
              <Link
                to="/catalog"
                className="flex items-center justify-between text-xs font-semibold text-neutral-700 hover:text-neutral-900"
              >
                <span>Manage catalog & pricing plans</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* Lower Two-Column Section: Overdue Invoices & Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Overdue Invoices Warning Table */}
          <div className="bg-white border border-neutral-200/80 rounded-xl p-5 shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <h3 className="text-sm font-semibold text-neutral-900">Overdue Receivables Action</h3>
              </div>
              <Link to="/invoices" className="text-xs text-neutral-500 hover:text-neutral-900 font-medium">
                View all invoices
              </Link>
            </div>

            {adminMetrics?.overdue_invoices && adminMetrics.overdue_invoices.length > 0 ? (
              <div className="divide-y divide-neutral-100">
                {adminMetrics.overdue_invoices.map((inv) => (
                  <div key={inv.id} className="py-3 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-neutral-900">
                          {inv.invoice_number}
                        </span>
                        <span className="px-1.5 py-0.5 text-[10px] font-semibold text-rose-700 bg-rose-50 rounded">
                          {inv.days_overdue}d overdue
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-500 mt-0.5 truncate max-w-xs">
                        {inv.customer_name} ({inv.customer_email})
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-xs text-neutral-900">
                        ${inv.total_amount.toFixed(2)}
                      </span>
                      <Link
                        to="/payments"
                        className="px-2.5 py-1 text-[11px] font-medium text-neutral-700 bg-white border border-neutral-300 rounded hover:bg-neutral-50 transition"
                      >
                        Settle
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-neutral-400 py-8 text-center">
                Outstanding receivables are all up to date. No overdue invoices!
              </p>
            )}
          </div>

          {/* Recent Settlement Transactions */}
          <div className="bg-white border border-neutral-200/80 rounded-xl p-5 shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-semibold text-neutral-900">Recent Payment Collections</h3>
              </div>
              <Link to="/payments" className="text-xs text-neutral-500 hover:text-neutral-900 font-medium">
                View all payments
              </Link>
            </div>

            {adminMetrics?.recent_payments && adminMetrics.recent_payments.length > 0 ? (
              <div className="divide-y divide-neutral-100">
                {adminMetrics.recent_payments.map((p) => (
                  <div key={p.id} className="py-3 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-neutral-900">
                          {p.transaction_id || `TXN-${p.id}`}
                        </span>
                        <StatusBadge
                          status={p.payment_method}
                          variant={p.payment_method === 'UPI' ? 'success' : 'pro'}
                        />
                      </div>
                      <p className="text-[11px] text-neutral-500 mt-0.5">
                        {p.customer_name} • {new Date(p.payment_date).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="font-semibold text-xs text-emerald-600">
                        +${p.amount.toFixed(2)}
                      </span>
                      <p className="text-[10px] text-neutral-400 font-mono mt-0.5">
                        {p.invoice_number}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-neutral-400 py-8 text-center">
                No recent transactions recorded.
              </p>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  )
}
