import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BillingPage } from './pages/BillingPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          <Route path="/" element={<Navigate to="/settings/billing" replace />} />
          <Route path="/settings/billing" element={<BillingPage />} />
          <Route path="/settings" element={<BillingPage />} />
          <Route path="/dashboard" element={<BillingPage />} />
          <Route path="/catalog" element={<BillingPage />} />
          <Route path="/subscriptions" element={<BillingPage />} />
          <Route path="/invoices" element={<BillingPage />} />
          <Route path="/payments" element={<BillingPage />} />
          <Route path="/reports" element={<BillingPage />} />
          <Route path="/settings/team" element={<BillingPage />} />
          <Route path="*" element={<Navigate to="/settings/billing" replace />} />
        </Routes>
      </Router>
    </QueryClientProvider>
  )
}
