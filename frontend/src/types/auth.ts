export type UserRole = 'ADMIN' | 'INTERNAL' | 'CUSTOMER'

export interface User {
  id: number
  email: string
  first_name?: string
  last_name?: string
  role: UserRole
  is_active: boolean
  is_staff: boolean
  created_at: string
}

export interface AuthTokens {
  access: string
  refresh: string
}

export interface AuthResponse {
  user: User
  tokens: AuthTokens
  message?: string
}

