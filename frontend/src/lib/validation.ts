import { z } from 'zod'

export const passwordSchema = z
  .string()
  .min(9, 'Password must be more than 8 characters long')
  .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Must contain at least one lowercase letter')
  .regex(/[\W_]/, 'Must contain at least one special character')

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

export type LoginFormData = z.infer<typeof loginSchema>

export const signupSchema = z
  .object({
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    email: z.string().email('Please enter a valid email address'),
    password: passwordSchema,
    confirm_password: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: 'Passwords do not match',
    path: ['confirm_password'],
  })

export type SignupFormData = z.infer<typeof signupSchema>

export const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
})

export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>

export const resetPasswordSchema = z
  .object({
    new_password: passwordSchema,
    confirm_password: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: 'Passwords do not match',
    path: ['confirm_password'],
  })

export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>
