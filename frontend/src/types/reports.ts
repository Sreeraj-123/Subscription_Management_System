export interface MonthlyRevenueItem {
  key: string
  label: string
  revenue: number
  count: number
}

export interface RecentPaymentItem {
  id: number
  invoice_number: string
  customer_name: string
  customer_email: string
  amount: number
  payment_method: string
  payment_date: string
  transaction_id: string
}

export interface OverdueInvoiceItem {
  id: number
  invoice_number: string
  customer_name: string
  customer_email: string
  due_date: string
  total_amount: number
  days_overdue: number
}

export interface PlanDistributionItem {
  plan_name: string
  count: number
}

export interface CustomerDashboardMetrics {
  role: 'CUSTOMER'
  active_subscriptions_count: number
  total_spent: number
  unpaid_invoices_count: number
  outstanding_balance: number
  recent_payments: {
    id: number
    invoice_number: string
    amount: number
    payment_method: string
    payment_date: string
    transaction_id: string
  }[]
  open_invoices: {
    id: number
    invoice_number: string
    due_date: string
    total_amount: number
    status: string
    is_overdue: boolean
  }[]
}

export interface AdminDashboardMetrics {
  role: 'ADMIN' | 'INTERNAL'
  mrr: number
  arr: number
  active_subscriptions_count: number
  total_subscriptions_count: number
  total_revenue_collected: number
  total_outstanding: number
  overdue_invoices_count: number
  overdue_amount: number
  revenue_by_month: MonthlyRevenueItem[]
  plan_distribution: PlanDistributionItem[]
  recent_payments: RecentPaymentItem[]
  overdue_invoices: OverdueInvoiceItem[]
}

export type DashboardMetrics = AdminDashboardMetrics | CustomerDashboardMetrics
