import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { Sparkles, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react'
import { forgotPasswordSchema, resetPasswordSchema, type ForgotPasswordFormData, type ResetPasswordFormData } from '@/lib/validation'
import { api } from '@/lib/api'

export const ForgotPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const uid = searchParams.get('uid')
  const token = searchParams.get('token')
  const isResetMode = Boolean(uid && token)

  const [submitted, setSubmitted] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const forgotForm = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  })

  const resetForm = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { new_password: '', confirm_password: '' },
  })

  const handleRequestReset = async (data: ForgotPasswordFormData) => {
    try {
      setErrorMessage(null)
      await api.post('/accounts/password-reset/', { email: data.email }, { skipAuth: true })
      setSubmitted(true)
    } catch (err: any) {
      setErrorMessage(err.message || 'Unable to process reset request.')
    }
  }

  const handleConfirmReset = async (data: ResetPasswordFormData) => {
    try {
      setErrorMessage(null)
      await api.post(
        '/accounts/password-reset-confirm/',
        {
          uidb64: uid,
          token: token,
          new_password: data.new_password,
        },
        { skipAuth: true }
      )
      setSuccessMessage('Password reset successfully. Redirecting to login...')
      setTimeout(() => navigate('/login'), 2000)
    } catch (err: any) {
      setErrorMessage(err.message || 'Password reset link is invalid or expired.')
    }
  }

  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-4 bg-[#F8F9FA] select-none">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-6 text-center">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#111827] text-white shadow-md mb-3">
            <Sparkles className="w-5 h-5 text-orange-400" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900">
            {isResetMode ? 'Set new password' : 'Reset your password'}
          </h1>
          <p className="text-xs text-neutral-500 mt-1">
            {isResetMode
              ? 'Enter your new credentials below'
              : "We'll send a password recovery link to your inbox"}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-neutral-200/90 shadow-sm p-6 sm:p-8">
          {errorMessage && (
            <div className="flex items-start gap-2.5 p-3 mb-5 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="flex items-start gap-2.5 p-3 mb-5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {isResetMode ? (
            <form onSubmit={resetForm.handleSubmit(handleConfirmReset)} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  {...resetForm.register('new_password')}
                  placeholder="At least 9 characters"
                  className="w-full px-3.5 py-2 text-xs bg-white border border-neutral-300 rounded-lg placeholder-neutral-400 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-[#111827] transition"
                />
                {resetForm.formState.errors.new_password && (
                  <p className="text-[11px] text-rose-600 mt-1">
                    {resetForm.formState.errors.new_password.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  {...resetForm.register('confirm_password')}
                  placeholder="Repeat new password"
                  className="w-full px-3.5 py-2 text-xs bg-white border border-neutral-300 rounded-lg placeholder-neutral-400 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-[#111827] transition"
                />
                {resetForm.formState.errors.confirm_password && (
                  <p className="text-[11px] text-rose-600 mt-1">
                    {resetForm.formState.errors.confirm_password.message}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={resetForm.formState.isSubmitting}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold text-white bg-[#111827] hover:bg-neutral-800 transition shadow-xs disabled:opacity-50"
              >
                <span>{resetForm.formState.isSubmitting ? 'Updating...' : 'Update password'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
          ) : submitted ? (
            <div className="text-center py-4 space-y-3">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 mb-1">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-neutral-900">
                Check your console / inbox
              </h3>
              <p className="text-xs text-neutral-500 leading-relaxed">
                If an account matches your email address, we have dispatched a password reset link. In dev mode, check the backend console logs.
              </p>
              <Link
                to="/login"
                className="inline-block pt-2 text-xs font-semibold text-[#111827] hover:underline"
              >
                Back to Sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={forgotForm.handleSubmit(handleRequestReset)} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  {...forgotForm.register('email')}
                  placeholder="name@company.com"
                  className="w-full px-3.5 py-2 text-xs bg-white border border-neutral-300 rounded-lg placeholder-neutral-400 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-[#111827] transition"
                />
                {forgotForm.formState.errors.email && (
                  <p className="text-[11px] text-rose-600 mt-1">
                    {forgotForm.formState.errors.email.message}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={forgotForm.formState.isSubmitting}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold text-white bg-[#111827] hover:bg-neutral-800 transition shadow-xs disabled:opacity-50"
              >
                <span>{forgotForm.formState.isSubmitting ? 'Sending link...' : 'Send reset link'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
          )}
        </div>

        <div className="text-center mt-5 text-xs text-neutral-500">
          Remember your password?{' '}
          <Link to="/login" className="font-semibold text-neutral-900 hover:underline">
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  )
}

