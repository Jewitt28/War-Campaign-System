import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { queryKeys } from '../lib/queryKeys'

type NotificationDto = {
  id: string
  campaignId: string | null
  type: string
  title: string
  body: string
  payloadJson: string | null
  readAt: string | null
  createdAt: string
}

export type UserNotification = Omit<NotificationDto, 'readAt' | 'createdAt'> & {
  readAt: Date | null
  createdAt: Date
}

function mapNotification(dto: NotificationDto): UserNotification {
  return {
    ...dto,
    readAt: dto.readAt ? new Date(dto.readAt) : null,
    createdAt: new Date(dto.createdAt),
  }
}

async function fetchNotifications() {
  const response = await api.get<NotificationDto[]>('/api/me/notifications')
  return response.data.map(mapNotification)
}

async function markNotificationRead(notificationId: string) {
  const response = await api.post<NotificationDto>(`/api/me/notifications/${notificationId}/read`)
  return mapNotification(response.data)
}

export function useNotifications() {
  return useQuery({
    queryKey: queryKeys.notifications,
    queryFn: fetchNotifications,
  })
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (notificationId: string) => markNotificationRead(notificationId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.notifications })
    },
  })
}
