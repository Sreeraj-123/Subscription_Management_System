export type PaymentMethod = 'CARD' | 'BANK_TRANSFER' | 'CASH' | 'UPI'

export interface Payment {
  id: number
  invoice: number
  invoice_number: string
  subscription_number: string
  customer_id: number
  customer_email: string
  customer_name: string
  invoice_total: string
  amount: string
  payment_method: PaymentMethod
  payment_date: string
  transaction_id: string
  note: string
  created_at: string
  updated_at: string
}

export interface RecordPaymentPayload {
  invoice: number
  amount: string
  payment_method: PaymentMethod
  transaction_id?: string
  note?: string
  payment_date?: string
}
