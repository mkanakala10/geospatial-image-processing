import axios, { AxiosError } from 'axios'
import type {
  TokenResponse, User, Analysis, Region,
  CreateAnalysisPayload, CreateRegionPayload, AnalysisStatusPoll,
} from '@/types'

const BASE = import.meta.env.VITE_API_URL ?? ''

export const http = axios.create({
  baseURL: `${BASE}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
})

// ─── Token injection ──────────────────────────────────────────────────────────
http.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// ─── Auto-refresh on 401 ──────────────────────────────────────────────────────
let isRefreshing = false
let queue: Array<(token: string) => void> = []

http.interceptors.response.use(
  (res) => res,
  async (err: AxiosError) => {
    const original = err.config as typeof err.config & { _retry?: boolean }
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true
      if (isRefreshing) {
        return new Promise((resolve) => {
          queue.push((token) => {
            original.headers!.Authorization = `Bearer ${token}`
            resolve(http(original))
          })
        })
      }
      isRefreshing = true
      const refresh_token = localStorage.getItem('refresh_token')
      if (!refresh_token) {
        localStorage.clear()
        window.location.href = '/login'
        return Promise.reject(err)
      }
      try {
        const { data } = await axios.post<TokenResponse>(`${BASE}/api/v1/auth/refresh`, { refresh_token })
        localStorage.setItem('access_token', data.access_token)
        localStorage.setItem('refresh_token', data.refresh_token)
        queue.forEach((cb) => cb(data.access_token))
        queue = []
        original.headers!.Authorization = `Bearer ${data.access_token}`
        return http(original)
      } catch {
        localStorage.clear()
        window.location.href = '/login'
        return Promise.reject(err)
      } finally {
        isRefreshing = false
      }
    }
    return Promise.reject(err)
  },
)

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    http.post<TokenResponse>('/auth/login', { email, password }).then((r) => r.data),

  register: (data: { email: string; username: string; password: string; full_name?: string }) =>
    http.post<User>('/auth/register', data).then((r) => r.data),

  refresh: (refresh_token: string) =>
    http.post<TokenResponse>('/auth/refresh', { refresh_token }).then((r) => r.data),
}

// ─── Users ────────────────────────────────────────────────────────────────────
export const usersApi = {
  me: () => http.get<User>('/users/me').then((r) => r.data),
  update: (data: { full_name?: string; email?: string }) =>
    http.patch<User>('/users/me', data).then((r) => r.data),
  list: () => http.get<User[]>('/users/').then((r) => r.data),
  updateRole: (userId: string, role: string) =>
    http.patch<User>(`/users/${userId}/role`, { role }).then((r) => r.data),
  delete: (userId: string) => http.delete(`/users/${userId}`),
}

// ─── Regions ──────────────────────────────────────────────────────────────────
export const regionsApi = {
  list: () => http.get<Region[]>('/regions/').then((r) => r.data),
  get: (id: string) => http.get<Region>(`/regions/${id}`).then((r) => r.data),
  create: (data: CreateRegionPayload) => http.post<Region>('/regions/', data).then((r) => r.data),
  update: (id: string, data: Partial<CreateRegionPayload>) =>
    http.patch<Region>(`/regions/${id}`, data).then((r) => r.data),
  delete: (id: string) => http.delete(`/regions/${id}`),
}

// ─── Analyses ─────────────────────────────────────────────────────────────────
export const analysesApi = {
  list: () => http.get<Analysis[]>('/analyses/').then((r) => r.data),
  get: (id: string) => http.get<Analysis>(`/analyses/${id}`).then((r) => r.data),
  getStatus: (id: string) =>
    http.get<AnalysisStatusPoll>(`/analyses/${id}/status`).then((r) => r.data),
  create: (data: CreateAnalysisPayload) =>
    http.post<Analysis>('/analyses/', data).then((r) => r.data),
  cancel: (id: string) => http.post<AnalysisStatusPoll>(`/analyses/${id}/cancel`).then((r) => r.data),
  delete: (id: string) => http.delete(`/analyses/${id}`),
}

// ─── Error helpers ────────────────────────────────────────────────────────────
export function getErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const detail = (err.response?.data as { detail?: string | Array<{ msg: string }> })?.detail
    if (typeof detail === 'string') return detail
    if (Array.isArray(detail)) return detail.map((d) => d.msg).join(', ')
  }
  return 'An unexpected error occurred'
}
