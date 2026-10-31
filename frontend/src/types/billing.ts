export type InvoiceStatus = 'DRAFT' | 'CONFIRMED' | 'PAID' | 'CANCELLED'

export interface InvoiceLine {
  id: number
  product: number
  description: string
  quantity: number
  unit_price: string
  tax_amount: string
  total_amount: string
}

export interface Invoice {
  id: number
  invoice_number: string
  subscription: number
  subscription_number: string
  plan_name: string
  customer: number
  customer_email: string
  customer_name: string
  period_start: string
  period_end: string
  issue_date: string
  due_date: string
  subtotal: string
  tax_amount: string
  discount_amount: string
  total_amount: string
  status: InvoiceStatus
  notes?: string
  lines: InvoiceLine[]
  created_at: string
}

