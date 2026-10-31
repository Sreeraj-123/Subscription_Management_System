import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from 'react-router-dom'
import { Sparkles, ArrowRight, AlertCircle, CheckCircle2, Circle } from 'lucide-react'
import { signupSchema, type SignupFormData } from '@/lib/validation'
import { useAuth } from '@/context'

export const SignupPage: React.FC = () => {
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [passwordVal, setPasswordVal] = useState('')
  const [confirmVal, setConfirmVal] = useState('')
  const { signup } = useAuth()
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      password: '',
      confirm_password: '',
    },
  })

  const checks = [
    { label: 'More than 8 characters', valid: passwordVal.length > 8 },
    { label: 'One uppercase letter (A-Z)', valid: /[A-Z]/.test(passwordVal) },
    { label: 'One lowercase letter (a-z)', valid: /[a-z]/.test(passwordVal) },
    { label: 'One special character (!@#$%...)', valid: /[\W_]/.test(passwordVal) },
    { label: 'Passwords match', valid: confirmVal.length > 0 && passwordVal === confirmVal },
  ]

  const onSubmit = async (data: SignupFormData) => {
    try {
      setErrorMessage(null)
      await signup(data)
      navigate('/dashboard', { replace: true })
    } catch (err: any) {
      setErrorMessage(err.message || 'Signup failed. Please try again.')
    }
  }

  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-4 bg-[#F8F9FA] select-none">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-6 text-center">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#111827] text-white shadow-md mb-3">
            <Sparkles className="w-5 h-5 text-orange-400" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900">
            Create your account
          </h1>
          <p className="text-xs text-neutral-500 mt-1">
            Start managing software subscriptions & automated billing
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

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  First Name
                </label>
                <input
                  type="text"
                  {...register('first_name')}
                  placeholder="Jane"
                  className="w-full px-3 py-1.5 text-xs bg-white border border-neutral-300 rounded-lg placeholder-neutral-400 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-[#111827] transition"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Last Name
                </label>
                <input
                  type="text"
                  {...register('last_name')}
                  placeholder="Doe"
                  className="w-full px-3 py-1.5 text-xs bg-white border border-neutral-300 rounded-lg placeholder-neutral-400 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-[#111827] transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Work Email
              </label>
              <input
                type="email"
                {...register('email')}
                placeholder="jane@company.com"
                className="w-full px-3.5 py-2 text-xs bg-white border border-neutral-300 rounded-lg placeholder-neutral-400 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-[#111827] transition"
              />
              {errors.email && (
                <p className="text-[11px] text-rose-600 mt-1">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Password
              </label>
              <input
                type="password"
                {...register('password')}
                onChange={(e) => {
                  setPasswordVal(e.target.value)
                  setValue('password', e.target.value)
                }}
                placeholder="At least 9 characters"
                className="w-full px-3.5 py-2 text-xs bg-white border border-neutral-300 rounded-lg placeholder-neutral-400 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-[#111827] transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Confirm Password
              </label>
              <input
                type="password"
                {...register('confirm_password')}
                onChange={(e) => {
                  setConfirmVal(e.target.value)
                  setValue('confirm_password', e.target.value)
                }}
                placeholder="Repeat password"
                className="w-full px-3.5 py-2 text-xs bg-white border border-neutral-300 rounded-lg placeholder-neutral-400 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-[#111827] transition"
              />
              {errors.confirm_password && (
                <p className="text-[11px] text-rose-600 mt-1">{errors.confirm_password.message}</p>
              )}
            </div>

            {/* Password Rules Checklist */}
            <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200/70 space-y-1.5">
              <span className="block text-[10px] font-semibold tracking-wider text-neutral-500 uppercase">
                Password Requirements:
              </span>
              {checks.map((c, i) => (
                <div key={i} className="flex items-center gap-2 text-[11px]">
                  {c.valid ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  ) : (
                    <Circle className="w-3.5 h-3.5 text-neutral-300 shrink-0" />
                  )}
                  <span className={c.valid ? 'text-emerald-700 font-medium' : 'text-neutral-500'}>
                    {c.label}
                  </span>
                </div>
              ))}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full !mt-4 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold text-white bg-[#111827] hover:bg-neutral-800 transition shadow-xs disabled:opacity-50"
            >
              <span>{isSubmitting ? 'Creating account...' : 'Create account'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>

        <div className="text-center mt-5 text-xs text-neutral-500">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-neutral-900 hover:underline">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  )
}
