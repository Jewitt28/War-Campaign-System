import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { queryKeys } from '../lib/queryKeys'

type CampaignBridgeCustomFactionDto = {
  id: string
  key: string
  name: string
  color: string | null
}

type CampaignBridgeCustomNationDto = {
  key: string
  name: string
  defaultFactionKey: string
  color: string | null
}

type CampaignNationStateDto = {
  nationKey: string
  supplies: number
  manpower: number
  resourcePoints: number
  economyPool: Record<string, number>
  researchState: Record<string, unknown> | null
  doctrineState: Record<string, unknown> | null
  upgradesState: Record<string, unknown> | null
}

type CampaignMapBridgeDto = {
  useDefaultFactions: boolean
  activeTheatres: Record<string, boolean>
  nationsEnabled: Record<string, boolean>
  customFactions: CampaignBridgeCustomFactionDto[]
  customNations: CampaignBridgeCustomNationDto[]
  homelandsByNation: Record<string, string>
  nationStates: Record<string, CampaignNationStateDto>
}

type SaveCampaignMapSetupInput = {
  useDefaultFactions: boolean
  activeTheatres: Record<string, boolean>
  nationsEnabled: Record<string, boolean>
  customFactions: Array<{
    id: string
    name: string
    color: string
  }>
  customNations: Array<{
    key: string
    name: string
    defaultFactionKey: string
    color: string
  }>
  homelandsByNation: Record<string, string>
}

export type SaveCampaignNationStatesInput = {
  nationStates: Record<string, {
    supplies: number
    manpower: number
    resourcePoints: number
    economyPool: Record<string, number>
    researchState: Record<string, unknown> | null
    doctrineState: Record<string, unknown> | null
    upgradesState: Record<string, unknown> | null
  }>
}

type CampaignChatMessageDto = {
  messageId: string
  authorMemberId: string | null
  authorDisplayName: string
  message: string
  createdAt: string
}

export type CampaignMapBridge = CampaignMapBridgeDto

export type CampaignChatMessage = Omit<CampaignChatMessageDto, 'createdAt'> & {
  createdAt: Date
}

function mapChatMessage(dto: CampaignChatMessageDto): CampaignChatMessage {
  return {
    ...dto,
    createdAt: new Date(dto.createdAt),
  }
}

async function fetchCampaignMapBridge(campaignId: string) {
  const response = await api.get<CampaignMapBridgeDto>(`/api/campaigns/${campaignId}/map/bridge`)
  return response.data
}

async function saveCampaignMapSetup(campaignId: string, payload: SaveCampaignMapSetupInput) {
  const response = await api.put<CampaignMapBridgeDto>(`/api/campaigns/${campaignId}/map/bridge/setup`, payload)
  return response.data
}

async function saveCampaignNationStates(campaignId: string, payload: SaveCampaignNationStatesInput) {
  const response = await api.put<CampaignMapBridgeDto>(`/api/campaigns/${campaignId}/map/bridge/nation-states`, payload)
  return response.data
}

async function fetchWorldChat(campaignId: string) {
  const response = await api.get<CampaignChatMessageDto[]>(`/api/campaigns/${campaignId}/world-chat`)
  return response.data.map(mapChatMessage)
}

async function postWorldChatMessage(campaignId: string, message: string) {
  const response = await api.post<CampaignChatMessageDto>(`/api/campaigns/${campaignId}/world-chat`, { message })
  return mapChatMessage(response.data)
}

export function useCampaignMapBridge(campaignId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.campaignMapBridge(campaignId),
    queryFn: () => fetchCampaignMapBridge(campaignId),
    enabled: Boolean(campaignId && enabled),
  })
}

export function useSaveCampaignMapSetup(campaignId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: SaveCampaignMapSetupInput) => saveCampaignMapSetup(campaignId, payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.campaignMapBridge(campaignId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.campaignMap(campaignId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.campaign(campaignId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.campaignMembers(campaignId) }),
      ])
    },
  })
}

export function useSaveCampaignNationStates(campaignId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: SaveCampaignNationStatesInput) => saveCampaignNationStates(campaignId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.campaignMapBridge(campaignId) })
    },
  })
}

export function useWorldChatMessages(campaignId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.campaignWorldChat(campaignId),
    queryFn: () => fetchWorldChat(campaignId),
    enabled: Boolean(campaignId && enabled),
    refetchInterval: 15000,
  })
}

export function usePostWorldChatMessage(campaignId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (message: string) => postWorldChatMessage(campaignId, message),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.campaignWorldChat(campaignId) })
    },
  })
}
