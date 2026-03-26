import axios from 'axios'
import { clearDevSessionEmail, getDevSessionEmail } from './session'

export type ApiErrorPayload = {
  timestamp: string
  code: string
  message: string
  path: string
  details: Record<string, unknown>
}

export class ApiError extends Error {
  code: string
  status: number
  path?: string
  details: Record<string, unknown>

  constructor(message: string, status: number, code = 'UNKNOWN', path?: string, details: Record<string, unknown> = {}) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
    this.path = path
    this.details = details
  }
}

function resolveApiBaseUrl() {
  const configured = import.meta.env.VITE_API_BASE_URL
  if (configured && typeof configured === 'string') {
    return configured
  }

  return 'http://localhost:8080'
}

export const api = axios.create({
  baseURL: resolveApiBaseUrl(),
  headers: {
    Accept: 'application/json',
  },
})

api.interceptors.request.use((config) => {
  const email = getDevSessionEmail()
  if (email) {
    config.headers.set('X-Dev-User', email)
  }

  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError<ApiErrorPayload>(error)) {
      const status = error.response?.status ?? 500
      const payload = error.response?.data

      if (status === 401) {
        clearDevSessionEmail()
      }

      throw new ApiError(
        payload?.message ?? error.message ?? 'Request failed',
        status,
        payload?.code,
        payload?.path,
        payload?.details ?? {},
      )
    }

    throw error
  },
)
