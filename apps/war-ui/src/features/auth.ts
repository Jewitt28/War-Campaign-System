import { queryOptions, useQuery } from '@tanstack/react-query'
import { api, ApiError } from '../lib/api'
import { queryKeys } from '../lib/queryKeys'

type AuthMeDto = {
  userId: string
  email: string
  displayName: string
}

export type AuthUser = {
  id: string
  email: string
  displayName: string
}

function mapAuthUser(dto: AuthMeDto): AuthUser {
  return {
    id: dto.userId,
    email: dto.email,
    displayName: dto.displayName,
  }
}

async function fetchAuthUser() {
  try {
    const response = await api.get<AuthMeDto>('/api/auth/me')
    return mapAuthUser(response.data)
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return null
    }

    throw error
  }
}

export const authQueryOptions = () =>
  queryOptions({
    queryKey: queryKeys.auth,
    queryFn: fetchAuthUser,
  })

export function useAuth() {
  return useQuery(authQueryOptions())
}
