import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { queryKeys } from '../lib/queryKeys'

type CampaignRole = 'GM' | 'PLAYER' | 'OBSERVER'
type CampaignStatus = 'ACTIVE' | 'COMPLETED' | 'ARCHIVED'

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

type CampaignLifecycleDto = {
  campaignId: string
  campaignName: string
  campaignStatus: CampaignStatus
  currentPhase: string
  currentTurnNumber: number
}

type CampaignInviteAdminDto = {
  inviteId: string
  campaignId: string
  inviteeEmail: string
  inviteToken: string
  intendedRole: CampaignRole
  status: string
  expiresAt: string
}

export type VisibilityRebuildResult = VisibilityRebuildDto
export type SnapshotExportResult = SnapshotExportDto
export type PhaseAdvanceResult = PhaseAdvanceDto
export type CreateCampaignInput = {
  name: string
}

export type CreateCampaignResult = {
  campaignId: string
  campaignName: string
  campaignStatus: CampaignStatus
  currentPhase: string
  currentTurnNumber: number
}

export type CampaignInvite = {
  inviteId: string
  campaignId: string
  inviteeEmail: string
  inviteToken: string
  intendedRole: CampaignRole
  status: string
  expiresAt: Date
}

export type CreateCampaignInviteInput = {
  inviteeEmail: string
  intendedRole: CampaignRole
  expiresInDays: number
}

export type CampaignLifecycleResult = CreateCampaignResult

function mapLifecycle(dto: CampaignLifecycleDto): CampaignLifecycleResult {
  return {
    campaignId: dto.campaignId,
    campaignName: dto.campaignName,
    campaignStatus: dto.campaignStatus,
    currentPhase: dto.currentPhase,
    currentTurnNumber: dto.currentTurnNumber,
  }
}

function mapInvite(dto: CampaignInviteAdminDto): CampaignInvite {
  return {
    inviteId: dto.inviteId,
    campaignId: dto.campaignId,
    inviteeEmail: dto.inviteeEmail,
    inviteToken: dto.inviteToken,
    intendedRole: dto.intendedRole,
    status: dto.status,
    expiresAt: new Date(dto.expiresAt),
  }
}

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

async function createCampaign(input: CreateCampaignInput) {
  const response = await api.post<CampaignLifecycleDto>('/api/campaigns', input)
  return mapLifecycle(response.data)
}

async function listCampaignInvites(campaignId: string) {
  const response = await api.get<CampaignInviteAdminDto[]>(`/api/campaigns/${campaignId}/invites`)
  return response.data.map(mapInvite)
}

async function createCampaignInvite(campaignId: string, input: CreateCampaignInviteInput) {
  const response = await api.post<CampaignInviteAdminDto>(`/api/campaigns/${campaignId}/invites`, input)
  return mapInvite(response.data)
}

async function revokeCampaignInvite(campaignId: string, inviteId: string) {
  const response = await api.post<CampaignInviteAdminDto>(`/api/campaigns/${campaignId}/invites/${inviteId}/revoke`)
  return mapInvite(response.data)
}

async function completeCampaign(campaignId: string) {
  const response = await api.post<CampaignLifecycleDto>(`/api/campaigns/${campaignId}/complete`)
  return mapLifecycle(response.data)
}

async function archiveCampaign(campaignId: string) {
  const response = await api.post<CampaignLifecycleDto>(`/api/campaigns/${campaignId}/archive`)
  return mapLifecycle(response.data)
}

async function resetDemoCampaign(campaignId: string) {
  const response = await api.post<CampaignLifecycleDto>(`/api/campaigns/${campaignId}/reset-demo`)
  return mapLifecycle(response.data)
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

export function useCreateCampaign() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createCampaign,
    onSuccess: async (data) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.campaigns }),
        queryClient.invalidateQueries({ queryKey: queryKeys.campaign(data.campaignId) }),
      ])
    },
  })
}

export function useCampaignInvites(campaignId: string) {
  return useQuery({
    queryKey: queryKeys.campaignInvites(campaignId),
    queryFn: () => listCampaignInvites(campaignId),
    enabled: Boolean(campaignId),
  })
}

export function useCreateCampaignInvite(campaignId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateCampaignInviteInput) => createCampaignInvite(campaignId, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.campaignInvites(campaignId) })
    },
  })
}

export function useRevokeCampaignInvite(campaignId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (inviteId: string) => revokeCampaignInvite(campaignId, inviteId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.campaignInvites(campaignId) })
    },
  })
}

function invalidateLifecycleQueries(queryClient: ReturnType<typeof useQueryClient>, campaignId: string) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.campaigns }),
    queryClient.invalidateQueries({ queryKey: queryKeys.campaign(campaignId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.campaignPhase(campaignId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.campaignInvites(campaignId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.notifications }),
  ])
}

export function useCompleteCampaign(campaignId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => completeCampaign(campaignId),
    onSuccess: async () => {
      await invalidateLifecycleQueries(queryClient, campaignId)
    },
  })
}

export function useArchiveCampaign(campaignId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => archiveCampaign(campaignId),
    onSuccess: async () => {
      await invalidateLifecycleQueries(queryClient, campaignId)
    },
  })
}

export function useResetDemoCampaign(campaignId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => resetDemoCampaign(campaignId),
    onSuccess: async (data) => {
      await Promise.all([
        invalidateLifecycleQueries(queryClient, campaignId),
        queryClient.invalidateQueries({ queryKey: queryKeys.campaign(data.campaignId) }),
      ])
    },
  })
}
