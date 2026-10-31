import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  AppShell,
  PageHeader,
  PillTabs,
  DataTable,
  StatusBadge,
  FilterBar,
  PlanCard,
  type Column,
  type PlanData,
} from '@/components/shared'
import { Plus, X, Package, Layers, Percent, FileText, AlertCircle } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuth } from '@/context'
import type { Product, Plan, Tax, Discount, QuotationTemplate } from '@/types/catalog'

export const CatalogPage: React.FC = () => {
  const { user: currentUser } = useAuth()
  const queryClient = useQueryClient()

  const [activeTab, setActiveTab] = useState('products')
  const [searchQuery, setSearchQuery] = useState('')
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')

  // Modals state
  const [isProductModalOpen, setIsProductModalOpen] = useState(false)
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false)
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // New Product form state
  const [productForm, setProductForm] = useState({
    name: '',
    type: 'SOFTWARE' as 'SOFTWARE' | 'SERVICE' | 'PHYSICAL',
    sales_price: '',
    cost_price: '',
    notes: '',
    hasVariant: false,
    variant_name: 'Brand',
    variant_value: 'Odoo',
    variant_extra_price: '560.00',
  })

  // New Plan form state
  const [planForm, setPlanForm] = useState({
    name: '',
    price: '',
    billing_period: 'MONTHLY' as 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY',
    min_quantity: 1,
    auto_close: false,
    closable_early: true,
    pausable: true,
    renewable: true,
  })

  // New Discount form state
  const [discountForm, setDiscountForm] = useState({
    code: '',
    type: 'PERCENTAGE' as 'FIXED' | 'PERCENTAGE',
    value: '',
    min_purchase: '0.00',
    min_quantity: 0,
    scope: 'SUBSCRIPTION' as 'SUBSCRIPTION' | 'PRODUCT',
  })

  // Queries
  const { data: productsData, isLoading: loadingProducts } = useQuery<{ results: Product[] }>({
    queryKey: ['catalog-products'],
    queryFn: () => api.get<{ results: Product[] }>('/catalog/products/'),
  })

  const { data: plansData, isLoading: loadingPlans } = useQuery<{ results: Plan[] }>({
    queryKey: ['catalog-plans'],
    queryFn: () => api.get<{ results: Plan[] }>('/catalog/plans/'),
  })

  const { data: taxesData } = useQuery<{ results: Tax[] }>({
    queryKey: ['catalog-taxes'],
    queryFn: () => api.get<{ results: Tax[] }>('/catalog/taxes/'),
  })

  const { data: discountsData } = useQuery<{ results: Discount[] }>({
    queryKey: ['catalog-discounts'],
    queryFn: () => api.get<{ results: Discount[] }>('/catalog/discounts/'),
  })

  const { data: templatesData } = useQuery<{ results: QuotationTemplate[] }>({
    queryKey: ['catalog-templates'],
    queryFn: () => api.get<{ results: QuotationTemplate[] }>('/catalog/templates/'),
  })

  const products = productsData?.results || []
  const plans = plansData?.results || []
  const taxes = taxesData?.results || []
  const discounts = discountsData?.results || []
  const templates = templatesData?.results || []

  // Create Product Mutation
  const createProductMutation = useMutation({
    mutationFn: async (data: typeof productForm) => {
      const prod = await api.post<Product>('/catalog/products/', {
        name: data.name,
        type: data.type,
        sales_price: data.sales_price,
        cost_price: data.cost_price || '0.00',
        notes: data.notes,
      })
      if (data.hasVariant && data.variant_value) {
        await api.post('/catalog/variants/', {
          product: prod.id,
          attribute_name: data.variant_name,
          attribute_value: data.variant_value,
          extra_price: data.variant_extra_price || '0.00',
        })
      }
      return prod
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalog-products'] })
      setIsProductModalOpen(false)
      setFormError(null)
      setProductForm({
        name: '',
        type: 'SOFTWARE',
        sales_price: '',
        cost_price: '',
        notes: '',
        hasVariant: false,
        variant_name: 'Brand',
        variant_value: 'Odoo',
        variant_extra_price: '560.00',
      })
    },
    onError: (err: any) => setFormError(err.message || 'Failed to create product.'),
  })

  // Create Plan Mutation
  const createPlanMutation = useMutation({
    mutationFn: (data: typeof planForm) => api.post<Plan>('/catalog/plans/', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalog-plans'] })
      setIsPlanModalOpen(false)
      setFormError(null)
      setPlanForm({
        name: '',
        price: '',
        billing_period: 'MONTHLY',
        min_quantity: 1,
        auto_close: false,
        closable_early: true,
        pausable: true,
        renewable: true,
      })
    },
    onError: (err: any) => setFormError(err.message || 'Failed to create plan.'),
  })

  // Create Discount Mutation
  const createDiscountMutation = useMutation({
    mutationFn: (data: typeof discountForm) => api.post<Discount>('/catalog/discounts/', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalog-discounts'] })
      setIsDiscountModalOpen(false)
      setFormError(null)
      setDiscountForm({
        code: '',
        type: 'PERCENTAGE',
        value: '',
        min_purchase: '0.00',
        min_quantity: 0,
        scope: 'SUBSCRIPTION',
      })
    },
    onError: (err: any) => setFormError(err.message || 'Failed to create discount.'),
  })

  // Columns for Products Table
  const productColumns: Column<Product>[] = [
    {
      header: 'Product Name',
      cell: (p) => (
        <div>
          <span className="font-semibold text-neutral-900">{p.name}</span>
          {p.notes && <p className="text-[11px] text-neutral-400 truncate max-w-xs">{p.notes}</p>}
        </div>
      ),
    },
    {
      header: 'Type',
      cell: (p) => <StatusBadge status={p.type} variant="pro" />,
    },
    {
      header: 'Sales Price',
      cell: (p) => <span className="font-semibold text-neutral-900">${p.sales_price}</span>,
    },
    {
      header: 'Cost Price',
      cell: (p) => <span className="text-neutral-500">${p.cost_price}</span>,
    },
    {
      header: 'Variants',
      cell: (p) => (
        <div className="flex flex-wrap gap-1">
          {p.variants && p.variants.length > 0 ? (
            p.variants.map((v) => (
              <span
                key={v.id}
                className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-neutral-100 text-neutral-800 border border-neutral-200"
              >
                {v.attribute_name}: {v.attribute_value} (+${v.extra_price})
              </span>
            ))
          ) : (
            <span className="text-neutral-400 text-xs">—</span>
          )}
        </div>
      ),
    },
    {
      header: 'Status',
      cell: (p) => (
        <StatusBadge
          status={p.is_active ? 'Active' : 'Archived'}
          variant={p.is_active ? 'success' : 'draft'}
        />
      ),
    },
  ]

  // Columns for Discounts Table
  const discountColumns: Column<Discount>[] = [
    {
      header: 'Code',
      cell: (d) => <span className="font-mono font-bold text-neutral-900">{d.code}</span>,
    },
    {
      header: 'Benefit',
      cell: (d) => (
        <span className="font-semibold text-emerald-700">
          {d.type === 'PERCENTAGE' ? `${d.value}% OFF` : `$${d.value} OFF`}
        </span>
      ),
    },
    {
      header: 'Scope',
      cell: (d) => <StatusBadge status={d.scope} variant="free" />,
    },
    {
      header: 'Min Purchase',
      cell: (d) => <span className="text-neutral-600">${d.min_purchase}</span>,
    },
    {
      header: 'Redemptions',
      cell: (d) => (
        <span className="text-neutral-600">
          {d.usage_count} {d.usage_limit ? `/ ${d.usage_limit}` : ''}
        </span>
      ),
    },
    {
      header: 'Status',
      cell: (d) => (
        <StatusBadge
          status={d.is_active ? 'Active' : 'Inactive'}
          variant={d.is_active ? 'success' : 'draft'}
        />
      ),
    },
  ]

  // Map backend plans to PlanCard visual model
  const planCardsData: PlanData[] = plans.map((p, idx) => {
    const isPro = p.name.toLowerCase().includes('pro') || idx === 1
    return {
      id: String(p.id),
      name: p.name,
      badgeText: p.billing_period,
      badgeVariant: isPro ? 'pro' : 'advance',
      price: `$${p.price}`,
      period: p.billing_period.toLowerCase(),
      isFeatured: isPro,
      ctaLabel: 'Select Plan',
      features: [
        { text: `Min quantity: ${p.min_quantity} license(s)`, included: true },
        { text: p.pausable ? 'Subscription pause allowed' : 'Pause not allowed', included: p.pausable },
        { text: p.renewable ? 'Auto-renewal supported' : 'Manual renewal only', included: p.renewable },
        { text: p.closable_early ? 'Early closure permitted' : 'Contract term enforced', included: p.closable_early },
        { text: p.auto_close ? 'Auto-closes on end date' : 'Rolls over at cycle end', included: p.auto_close },
      ],
    }
  })

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.type.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const isAdmin = currentUser?.role === 'ADMIN'

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
        breadcrumb="Catalog & Pricing > Overview"
        title="Catalog & Pricing"
        subtitle="Configure software subscription plans, variant pricing (e.g. Odoo +$560), tax rates, and discount rules."
        extraActions={
          <div className="flex items-center gap-2">
            {activeTab === 'products' && (
              <button
                type="button"
                onClick={() => setIsProductModalOpen(true)}
                className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-[#111827] rounded-lg hover:bg-neutral-800 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Product</span>
              </button>
            )}
            {activeTab === 'plans' && (
              <button
                type="button"
                onClick={() => setIsPlanModalOpen(true)}
                className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-[#111827] rounded-lg hover:bg-neutral-800 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Plan</span>
              </button>
            )}
            {activeTab === 'discounts' && isAdmin && (
              <button
                type="button"
                onClick={() => setIsDiscountModalOpen(true)}
                className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-[#111827] rounded-lg hover:bg-neutral-800 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Discount Rule</span>
              </button>
            )}
          </div>
        }
      />

      {/* Navigation Tabs */}
      <div className="mb-6">
        <PillTabs
          activeTab={activeTab}
          onChange={setActiveTab}
          tabs={[
            { id: 'products', label: 'Products & Variants', count: products.length, icon: <Package className="w-3.5 h-3.5" /> },
            { id: 'plans', label: 'Subscription Plans', count: plans.length, icon: <Layers className="w-3.5 h-3.5" /> },
            { id: 'discounts', label: 'Discounts & Taxes', count: discounts.length, icon: <Percent className="w-3.5 h-3.5" /> },
            { id: 'templates', label: 'Quotation Templates', count: templates.length, icon: <FileText className="w-3.5 h-3.5" /> },
          ]}
        />
      </div>

      {/* Tab 1: Products & Variants */}
      {activeTab === 'products' && (
        <div className="space-y-4">
          <FilterBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="Search products by name or type..."
          />
          <DataTable
            columns={productColumns}
            data={filteredProducts}
            keyField="id"
            isLoading={loadingProducts}
            emptyMessage="No products configured. Click 'New Product' to add one."
          />
        </div>
      )}

      {/* Tab 2: Subscription Plans */}
      {activeTab === 'plans' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 bg-white rounded-xl border border-neutral-200/80 shadow-xs">
            <div>
              <h2 className="text-sm font-semibold text-neutral-900">
                Active Subscription Offerings
              </h2>
              <p className="text-xs text-neutral-500">
                Plans define recurring period, pause/renewal policies, and auto-close flags.
              </p>
            </div>

            <div className="inline-flex items-center p-1 bg-neutral-100 rounded-xl border border-neutral-200/80 shrink-0">
              <button
                type="button"
                onClick={() => setBillingCycle('monthly')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                  billingCycle === 'monthly'
                    ? 'bg-white text-neutral-900 shadow-xs font-semibold'
                    : 'text-neutral-500 hover:text-neutral-900'
                }`}
              >
                Monthly plans
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle('yearly')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                  billingCycle === 'yearly'
                    ? 'bg-white text-neutral-900 shadow-xs font-semibold'
                    : 'text-neutral-500 hover:text-neutral-900'
                }`}
              >
                Annual plans
              </button>
            </div>
          </div>

          {loadingPlans ? (
            <div className="p-12 text-center text-xs text-neutral-500">Loading plans...</div>
          ) : planCardsData.length === 0 ? (
            <div className="bg-white p-12 text-center text-xs text-neutral-400 rounded-xl border">
              No subscription plans created. Click 'New Plan' to create one.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
              {planCardsData.map((plan) => (
                <PlanCard key={plan.id} plan={plan} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Discounts & Taxes */}
      {activeTab === 'discounts' && (
        <div className="space-y-8">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-semibold text-neutral-900">Discount Rules</h3>
                <p className="text-xs text-neutral-500">
                  Admin-managed promotional discounts with usage limits and purchase minimums.
                </p>
              </div>
            </div>
            <DataTable
              columns={discountColumns}
              data={discounts}
              keyField="id"
              emptyMessage="No discount rules configured."
            />
          </div>

          <div>
            <div className="mb-3">
              <h3 className="text-sm font-semibold text-neutral-900">Tax Rates</h3>
              <p className="text-xs text-neutral-500">
                Tax rates automatically applied to line items during invoicing.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {taxes.map((tax) => (
                <div key={tax.id} className="p-4 bg-white rounded-xl border border-neutral-200/80">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-neutral-800">{tax.name}</span>
                    <StatusBadge status={tax.is_active ? 'Active' : 'Disabled'} variant="success" />
                  </div>
                  <span className="text-2xl font-bold text-neutral-900">{tax.rate}%</span>
                  <p className="text-[11px] text-neutral-400 mt-1">Applied to taxable subtotals</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Quotation Templates */}
      {activeTab === 'templates' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.length === 0 ? (
              <div className="col-span-full bg-white p-12 text-center text-xs text-neutral-400 rounded-xl border">
                No quotation templates available yet.
              </div>
            ) : (
              templates.map((tpl) => (
                <div key={tpl.id} className="p-5 bg-white rounded-xl border border-neutral-200/80 shadow-xs">
                  <h4 className="font-semibold text-sm text-neutral-900 mb-1">{tpl.name}</h4>
                  <p className="text-xs text-neutral-500 mb-3">
                    Preset for plan: <span className="font-medium text-neutral-800">{tpl.plan_name}</span>
                  </p>
                  <div className="flex items-center justify-between text-xs text-neutral-600 pt-3 border-t border-neutral-100">
                    <span>Validity: {tpl.validity_days} days</span>
                    <span className="text-neutral-400">{tpl.lines?.length || 0} product lines</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Modal: New Product with Variant */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-neutral-200 overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-neutral-100">
              <h3 className="text-sm font-semibold text-neutral-900">Add New Catalog Product</h3>
              <button
                type="button"
                onClick={() => setIsProductModalOpen(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                createProductMutation.mutate(productForm)
              }}
              className="p-5 space-y-3.5"
            >
              {formError && (
                <div className="flex items-start gap-2 p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Product Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Enterprise License"
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-neutral-300 rounded-lg text-neutral-900 focus:outline-none focus:ring-2 focus:ring-[#111827]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">Type</label>
                  <select
                    value={productForm.type}
                    onChange={(e) => setProductForm({ ...productForm, type: e.target.value as any })}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-neutral-300 rounded-lg text-neutral-900 focus:outline-none focus:ring-2 focus:ring-[#111827]"
                  >
                    <option value="SOFTWARE">SOFTWARE</option>
                    <option value="SERVICE">SERVICE</option>
                    <option value="PHYSICAL">PHYSICAL</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Sales Price ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="1000.00"
                    value={productForm.sales_price}
                    onChange={(e) => setProductForm({ ...productForm, sales_price: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-neutral-300 rounded-lg text-neutral-900 focus:outline-none focus:ring-2 focus:ring-[#111827]"
                  />
                </div>
              </div>

              {/* Variant Checkbox and Fields (e.g. Brand: Odoo +560) */}
              <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200/80 space-y-2.5">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={productForm.hasVariant}
                    onChange={(e) => setProductForm({ ...productForm, hasVariant: e.target.checked })}
                    className="rounded border-neutral-300 text-neutral-900 focus:ring-[#111827]"
                  />
                  <span className="text-xs font-semibold text-neutral-800">
                    Add Product Variant (e.g. Brand: Odoo +$560)
                  </span>
                </label>

                {productForm.hasVariant && (
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    <div>
                      <span className="block text-[10px] text-neutral-500 mb-0.5">Attribute</span>
                      <input
                        type="text"
                        value={productForm.variant_name}
                        onChange={(e) => setProductForm({ ...productForm, variant_name: e.target.value })}
                        className="w-full px-2.5 py-1 text-xs bg-white border rounded"
                      />
                    </div>
                    <div>
                      <span className="block text-[10px] text-neutral-500 mb-0.5">Value</span>
                      <input
                        type="text"
                        value={productForm.variant_value}
                        onChange={(e) => setProductForm({ ...productForm, variant_value: e.target.value })}
                        className="w-full px-2.5 py-1 text-xs bg-white border rounded"
                      />
                    </div>
                    <div>
                      <span className="block text-[10px] text-neutral-500 mb-0.5">Extra Price ($)</span>
                      <input
                        type="number"
                        step="0.01"
                        value={productForm.variant_extra_price}
                        onChange={(e) => setProductForm({ ...productForm, variant_extra_price: e.target.value })}
                        className="w-full px-2.5 py-1 text-xs bg-white border rounded font-semibold text-neutral-900"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-medium text-neutral-700 bg-white border border-neutral-300 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createProductMutation.isPending}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-[#111827] hover:bg-neutral-800 rounded-lg transition disabled:opacity-50"
                >
                  {createProductMutation.isPending ? 'Saving...' : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: New Plan */}
      {isPlanModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-neutral-200 overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-neutral-100">
              <h3 className="text-sm font-semibold text-neutral-900">Create Subscription Plan</h3>
              <button
                type="button"
                onClick={() => setIsPlanModalOpen(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                createPlanMutation.mutate(planForm)
              }}
              className="p-5 space-y-3.5"
            >
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">Plan Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Growth Monthly"
                  value={planForm.name}
                  onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-neutral-300 rounded-lg text-neutral-900 focus:outline-none focus:ring-2 focus:ring-[#111827]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="99.00"
                    value={planForm.price}
                    onChange={(e) => setPlanForm({ ...planForm, price: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-neutral-300 rounded-lg text-neutral-900 focus:outline-none focus:ring-2 focus:ring-[#111827]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">Billing Period</label>
                  <select
                    value={planForm.billing_period}
                    onChange={(e) => setPlanForm({ ...planForm, billing_period: e.target.value as any })}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-neutral-300 rounded-lg text-neutral-900 focus:outline-none focus:ring-2 focus:ring-[#111827]"
                  >
                    <option value="DAILY">DAILY</option>
                    <option value="WEEKLY">WEEKLY</option>
                    <option value="MONTHLY">MONTHLY</option>
                    <option value="YEARLY">YEARLY</option>
                  </select>
                </div>
              </div>

              {/* Policy Flags */}
              <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200/80 space-y-2">
                <span className="block text-[10px] font-semibold tracking-wider text-neutral-500 uppercase mb-1">
                  Policy Flags
                </span>
                <label className="flex items-center gap-2 text-xs text-neutral-700">
                  <input
                    type="checkbox"
                    checked={planForm.pausable}
                    onChange={(e) => setPlanForm({ ...planForm, pausable: e.target.checked })}
                    className="rounded"
                  />
                  <span>Allow subscription pausing</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-neutral-700">
                  <input
                    type="checkbox"
                    checked={planForm.renewable}
                    onChange={(e) => setPlanForm({ ...planForm, renewable: e.target.checked })}
                    className="rounded"
                  />
                  <span>Allow subscription renewal</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-neutral-700">
                  <input
                    type="checkbox"
                    checked={planForm.closable_early}
                    onChange={(e) => setPlanForm({ ...planForm, closable_early: e.target.checked })}
                    className="rounded"
                  />
                  <span>Allow customer/staff to close early</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setIsPlanModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-medium text-neutral-700 bg-white border border-neutral-300 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createPlanMutation.isPending}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-[#111827] hover:bg-neutral-800 rounded-lg transition disabled:opacity-50"
                >
                  {createPlanMutation.isPending ? 'Creating...' : 'Create Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: New Discount (Admin only) */}
      {isDiscountModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-neutral-200 overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-neutral-100">
              <h3 className="text-sm font-semibold text-neutral-900">Create Discount Rule (Admin)</h3>
              <button
                type="button"
                onClick={() => setIsDiscountModalOpen(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                createDiscountMutation.mutate(discountForm)
              }}
              className="p-5 space-y-3.5"
            >
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">Coupon Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. FLASH20"
                  value={discountForm.code}
                  onChange={(e) => setDiscountForm({ ...discountForm, code: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-1.5 text-xs font-mono uppercase bg-white border border-neutral-300 rounded-lg text-neutral-900 focus:outline-none focus:ring-2 focus:ring-[#111827]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">Discount Type</label>
                  <select
                    value={discountForm.type}
                    onChange={(e) => setDiscountForm({ ...discountForm, type: e.target.value as any })}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-neutral-300 rounded-lg text-neutral-900"
                  >
                    <option value="PERCENTAGE">PERCENTAGE (%)</option>
                    <option value="FIXED">FIXED AMOUNT ($)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">Value</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="20.00"
                    value={discountForm.value}
                    onChange={(e) => setDiscountForm({ ...discountForm, value: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-neutral-300 rounded-lg text-neutral-900"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setIsDiscountModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-medium text-neutral-700 bg-white border border-neutral-300 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createDiscountMutation.isPending}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-[#111827] hover:bg-neutral-800 rounded-lg transition disabled:opacity-50"
                >
                  {createDiscountMutation.isPending ? 'Creating...' : 'Create Rule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  )
}
