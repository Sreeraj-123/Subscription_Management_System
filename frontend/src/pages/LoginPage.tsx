import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Sparkles, ArrowRight, AlertCircle, Eye, EyeOff } from 'lucide-react'
import { loginSchema, type LoginFormData } from '@/lib/validation'
import { useAuth } from '@/context'

export const LoginPage: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const from = location.state?.from?.pathname || '/settings/billing'

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  const onSubmit = async (data: LoginFormData) => {
    try {
      setErrorMessage(null)
      await login(data.email, data.password)
      navigate(from, { replace: true })
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid email or password.')
    }
  }

  const fillQuickAccount = (email: string, pass: string) => {
    setValue('email', email)
    setValue('password', pass)
  }

  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-4 bg-[#F8F9FA] select-none">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#111827] text-white shadow-md mb-3">
            <Sparkles className="w-5 h-5 text-orange-400" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900">
            Sign in to Brightloop
          </h1>
          <p className="text-xs text-neutral-500 mt-1">
            Subscription lifecycle & billing management
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-neutral-200/90 shadow-sm p-6 sm:p-8">
          {errorMessage && (
            <div className="flex items-start gap-2.5 p-3 mb-5 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                {...register('email')}
                placeholder="name@company.com"
                className="w-full px-3.5 py-2 text-xs bg-white border border-neutral-300 rounded-lg placeholder-neutral-400 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-[#111827] focus:border-transparent transition"
              />
              {errors.email && (
                <p className="text-[11px] text-rose-600 mt-1">{errors.email.message}</p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-neutral-700">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-[11px] text-neutral-500 hover:text-neutral-900 transition"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  {...register('password')}
                  placeholder="••••••••••••"
                  className="w-full px-3.5 py-2 pr-10 text-xs bg-white border border-neutral-300 rounded-lg placeholder-neutral-400 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-[#111827] focus:border-transparent transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 p-0.5"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-[11px] text-rose-600 mt-1">{errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold text-white bg-[#111827] hover:bg-neutral-800 transition shadow-xs disabled:opacity-50"
            >
              <span>{isSubmitting ? 'Signing in...' : 'Sign in'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>

          {/* Quick Demo Logins for Hackathon Team */}
          <div className="mt-6 pt-5 border-t border-neutral-100">
            <span className="block text-[10px] font-semibold tracking-wider text-neutral-400 uppercase text-center mb-2.5">
              Quick Seed Logins (Hackathon)
            </span>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => fillQuickAccount('admin@brightloop.io', 'Admin@123456')}
                className="px-2.5 py-1 text-[11px] font-medium bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-lg transition"
              >
                Admin
              </button>
              <button
                type="button"
                onClick={() => fillQuickAccount('staff1@brightloop.io', 'Staff@123456')}
                className="px-2.5 py-1 text-[11px] font-medium bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-lg transition"
              >
                Staff
              </button>
            </div>
          </div>
        </div>

        <div className="text-center mt-5 text-xs text-neutral-500">
          Don't have an account?{' '}
          <Link to="/signup" className="font-semibold text-neutral-900 hover:underline">
            Create account
          </Link>
        </div>
      </div>
    </div>
  )
}
