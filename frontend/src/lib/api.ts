const API_BASE = '/api'

interface RequestOptions extends RequestInit {
  skipAuth?: boolean
}

class ApiClient {
  private isRefreshing = false
  private refreshSubscribers: ((token: string) => void)[] = []

  private subscribeTokenRefresh(cb: (token: string) => void) {
    this.refreshSubscribers.push(cb)
  }

  private onRefreshed(token: string) {
    this.refreshSubscribers.forEach((cb) => cb(token))
    this.refreshSubscribers = []
  }

  public getAccessToken(): string | null {
    return localStorage.getItem('brightloop_access_token')
  }

  public getRefreshToken(): string | null {
    return localStorage.getItem('brightloop_refresh_token')
  }

  public setTokens(access: string, refresh: string) {
    localStorage.setItem('brightloop_access_token', access)
    localStorage.setItem('brightloop_refresh_token', refresh)
  }

  public clearTokens() {
    localStorage.removeItem('brightloop_access_token')
    localStorage.removeItem('brightloop_refresh_token')
    localStorage.removeItem('brightloop_user')
  }

  async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { skipAuth = false, headers: customHeaders, ...rest } = options

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...((customHeaders as Record<string, string>) || {}),
    }

    const token = this.getAccessToken()
    if (token && !skipAuth) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`
    let response = await fetch(url, { ...rest, headers })

    // Auto token refresh on 401
    if (response.status === 401 && !skipAuth && this.getRefreshToken()) {
      if (!this.isRefreshing) {
        this.isRefreshing = true
        try {
          const refreshRes = await fetch(`${API_BASE}/accounts/token/refresh/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh: this.getRefreshToken() }),
          })

          if (refreshRes.ok) {
            const data = await refreshRes.json()
            this.setTokens(data.access, this.getRefreshToken()!)
            this.isRefreshing = false
            this.onRefreshed(data.access)

            // Retry original request
            headers['Authorization'] = `Bearer ${data.access}`
            response = await fetch(url, { ...rest, headers })
          } else {
            this.isRefreshing = false
            this.clearTokens()
            window.location.href = '/login'
            throw new Error('Session expired. Please log in again.')
          }
        } catch (err) {
          this.isRefreshing = false
          this.clearTokens()
          window.location.href = '/login'
          throw err
        }
      } else {
        // Wait for token refresh to finish
        const newToken = await new Promise<string>((resolve) => {
          this.subscribeTokenRefresh(resolve)
        })
        headers['Authorization'] = `Bearer ${newToken}`
        response = await fetch(url, { ...rest, headers })
      }
    }

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      const errorMsg =
        data?.error?.message ||
        data?.detail ||
        (data?.error?.fields ? JSON.stringify(data.error.fields) : 'Request failed')
      const error = new Error(errorMsg) as any
      error.status = response.status
      error.data = data
      throw error
    }

    return data as T
  }

  get<T>(endpoint: string, options?: RequestOptions) {
    return this.request<T>(endpoint, { method: 'GET', ...options })
  }

  post<T>(endpoint: string, body?: any, options?: RequestOptions) {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
      ...options,
    })
  }

  patch<T>(endpoint: string, body?: any, options?: RequestOptions) {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
      ...options,
    })
  }

  delete<T>(endpoint: string, options?: RequestOptions) {
    return this.request<T>(endpoint, { method: 'DELETE', ...options })
  }
}

export const api = new ApiClient()

