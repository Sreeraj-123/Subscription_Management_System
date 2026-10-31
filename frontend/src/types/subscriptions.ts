export type SubscriptionStatus =
  | 'DRAFT'
  | 'QUOTATION'
  | 'CONFIRMED'
  | 'ACTIVE'
  | 'PAUSED'
  | 'CLOSED'

export interface SubscriptionLine {
  id: number
  product: number
  product_name: string
  variant?: number | null
  variant_name?: string
  quantity: number
  unit_price: string
  tax?: number | null
  amount: string
}

export interface Subscription {
  id: number
  subscription_number: string
  customer: number
  customer_email: string
  customer_name: string
  plan: number
  plan_name: string
  plan_period: string
  start_date: string
  expiry_date?: string | null
  payment_terms: string
  status: SubscriptionStatus
  pause_date?: string | null
  notes?: string
  lines: SubscriptionLine[]
  total_amount: string
  created_at: string
  updated_at: string
}

