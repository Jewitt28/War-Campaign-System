import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { queryKeys } from '../lib/queryKeys'

type VisibilityRebuildDto = {
  campaignId: string
  viewerFactionCount: number
  visibilityRowCount: number
}

type SnapshotExportDto = {
  campaignId: string
  members: unknown[]
  territories: unknown[]
  platoons: unknown[]
  battles: unknown[]
  resolutionEvents: unknown[]
  auditLog: unknown[]
}

type PhaseAdvanceDto = {
  campaignId: string
  currentTurnNumber: number
  currentPhase: string
  phaseStartedAt: string | null
  phaseEndsAt: string | null
}

export type VisibilityRebuildResult = VisibilityRebuildDto
export type SnapshotExportResult = SnapshotExportDto
export type PhaseAdvanceResult = PhaseAdvanceDto

async function advancePhase(campaignId: string) {
  const response = await api.post<PhaseAdvanceDto>(`/api/campaigns/${campaignId}/phase/advance`)
  return response.data
}

async function rebuildVisibility(campaignId: string) {
  const response = await api.post<VisibilityRebuildDto>(`/api/campaigns/${campaignId}/visibility/rebuild`)
  return response.data
}

async function exportSnapshot(campaignId: string) {
  const response = await api.post<SnapshotExportDto>(`/api/campaigns/${campaignId}/snapshots/export`)
  return response.data
}

export function useAdvancePhase(campaignId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => advancePhase(campaignId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.campaign(campaignId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.campaignPhase(campaignId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.notifications }),
      ])
    },
  })
}

export function useRebuildVisibility(campaignId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => rebuildVisibility(campaignId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.campaignMap(campaignId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.notifications }),
      ])
    },
  })
}

export function useExportSnapshot(campaignId: string) {
  return useMutation({
    mutationFn: () => exportSnapshot(campaignId),
  })
}
