export interface Variant {
  id: number
  product: number
  attribute_name: string
  attribute_value: string
  extra_price: string
  created_at: string
}

export interface Product {
  id: number
  name: string
  type: 'SERVICE' | 'PHYSICAL' | 'SOFTWARE'
  sales_price: string
  cost_price: string
  notes?: string
  is_active: boolean
  variants: Variant[]
  created_at: string
  updated_at: string
}

export interface Plan {
  id: number
  name: string
  price: string
  billing_period: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'
  min_quantity: number
  available_from?: string | null
  available_to?: string | null
  auto_close: boolean
  closable_early: boolean
  pausable: boolean
  renewable: boolean
  is_active: boolean
  created_at: string
}

export interface Tax {
  id: number
  name: string
  rate: string
  is_active: boolean
  created_at: string
}

export interface Discount {
  id: number
  code: string
  type: 'FIXED' | 'PERCENTAGE'
  value: string
  min_purchase: string
  min_quantity: number
  start_date?: string | null
  end_date?: string | null
  usage_limit?: number | null
  usage_count: number
  scope: 'PRODUCT' | 'SUBSCRIPTION'
  product?: number | null
  product_name?: string
  is_active: boolean
  created_at: string
}

export interface QuotationTemplateLine {
  id: number
  product: number
  product_name: string
  variant?: number | null
  variant_name?: string
  quantity: number
}

export interface QuotationTemplate {
  id: number
  name: string
  plan: number
  plan_name: string
  validity_days: number
  notes?: string
  lines: QuotationTemplateLine[]
  created_at: string
}
