import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { queryKeys } from '../lib/queryKeys'

export type OnboardingStatus = 'NOT_REQUIRED' | 'REQUIRED' | 'IN_PROGRESS' | 'COMPLETE'
export type OnboardingActivationStatus = 'ACTIVE' | 'PENDING_NEXT_TURN'

export type OnboardingPolicy = {
  allowCustomNationCreation: boolean
  allowPlayerCreatedFactions: boolean
  allowImmediateActivation: boolean
}

export type OnboardingFactionOption = {
  id: string
  key: string
  name: string
  factionId: string | null
  factionKey: string | null
  color: string | null
  custom: boolean
}

export type OnboardingNationOption = {
  id: string
  key: string
  name: string
  factionId: string | null
  factionKey: string | null
  color: string | null
  custom: boolean
}

export type OnboardingHomelandOption = {
  id: string
  key: string
  name: string
  theatreId: string
  theatreKey: string
  theatreName: string
}

export type CampaignOnboarding = {
  campaignId: string
  membershipId: string
  status: OnboardingStatus
  activationStatus: OnboardingActivationStatus
  activationTurnNumber: number | null
  nextStep: string
  settings: OnboardingPolicy
  selectedFaction: OnboardingFactionOption | null
  selectedNation: OnboardingNationOption | null
  selectedHomeland: OnboardingHomelandOption | null
  eligibleFactions: OnboardingFactionOption[]
  eligibleNations: OnboardingNationOption[]
  eligibleHomelands: OnboardingHomelandOption[]
  starterPlatoonName: string
  tutorialCompletedAt: Date | null
  tutorialVersion: string | null
}

export type CampaignMemberOnboarding = {
  onboardingStatus: OnboardingStatus
  activationStatus: OnboardingActivationStatus
  activationTurnNumber: number | null
  tutorialCompletedAt: Date | null
  tutorialVersion: string | null
}

export type CompleteOnboardingResponse = {
  campaignId: string
  membershipId: string
  onboardingStatus: OnboardingStatus
  activationStatus: OnboardingActivationStatus
  activationTurnNumber: number | null
  redirectPath: string
  starterPlatoonName: string
}

export type SelectOnboardingFactionInput =
  | {
      factionId: string
      customFactionName?: never
      customFactionColor?: never
    }
  | {
      factionId?: never
      customFactionName: string
      customFactionColor?: string | null
    }

export type SelectOnboardingNationInput =
  | {
      nationId: string
      customNationName?: never
      customNationColor?: never
    }
  | {
      nationId?: never
      customNationName: string
      customNationColor?: string | null
    }

export type SelectOnboardingHomelandInput = {
  territoryId: string
}

export type CompleteOnboardingTutorialInput = {
  tutorialVersion: string
}

type OnboardingPolicyDto = OnboardingPolicy

type OnboardingOptionDto = {
  id: string
  key: string
  name: string
  factionId: string | null
  factionKey: string | null
  color: string | null
  custom: boolean
}

type OnboardingHomelandOptionDto = {
  id: string
  key: string
  name: string
  theatreId: string
  theatreKey: string
  theatreName: string
}

type CampaignMemberOnboardingDto = {
  onboardingStatus: OnboardingStatus
  activationStatus: OnboardingActivationStatus
  activationTurnNumber: number | null
  tutorialCompletedAt: string | null
  tutorialVersion: string | null
}

type CampaignOnboardingDto = {
  campaignId: string
  membershipId: string
  status: OnboardingStatus
  activationStatus: OnboardingActivationStatus
  activationTurnNumber: number | null
  nextStep: string
  settings: OnboardingPolicyDto
  selectedFaction: OnboardingOptionDto | null
  selectedNation: OnboardingOptionDto | null
  selectedHomeland: OnboardingHomelandOptionDto | null
  eligibleFactions: OnboardingOptionDto[]
  eligibleNations: OnboardingOptionDto[]
  eligibleHomelands: OnboardingHomelandOptionDto[]
  starterPlatoonName: string
  tutorialCompletedAt: string | null
  tutorialVersion: string | null
}

type CompleteOnboardingResponseDto = {
  campaignId: string
  membershipId: string
  onboardingStatus: OnboardingStatus
  activationStatus: OnboardingActivationStatus
  activationTurnNumber: number | null
  redirectPath: string
  starterPlatoonName: string
}

function mapDate(value: string | null) {
  return value ? new Date(value) : null
}

function mapOption(dto: OnboardingOptionDto): OnboardingFactionOption {
  return {
    id: dto.id,
    key: dto.key,
    name: dto.name,
    factionId: dto.factionId,
    factionKey: dto.factionKey,
    color: dto.color,
    custom: dto.custom,
  }
}

function mapNationOption(dto: OnboardingOptionDto): OnboardingNationOption {
  return {
    id: dto.id,
    key: dto.key,
    name: dto.name,
    factionId: dto.factionId,
    factionKey: dto.factionKey,
    color: dto.color,
    custom: dto.custom,
  }
}

function mapHomelandOption(dto: OnboardingHomelandOptionDto): OnboardingHomelandOption {
  return { ...dto }
}

function mapCampaignMemberOnboarding(dto: CampaignMemberOnboardingDto): CampaignMemberOnboarding {
  return {
    onboardingStatus: dto.onboardingStatus,
    activationStatus: dto.activationStatus,
    activationTurnNumber: dto.activationTurnNumber,
    tutorialCompletedAt: mapDate(dto.tutorialCompletedAt),
    tutorialVersion: dto.tutorialVersion,
  }
}

function mapCampaignOnboarding(dto: CampaignOnboardingDto): CampaignOnboarding {
  return {
    campaignId: dto.campaignId,
    membershipId: dto.membershipId,
    status: dto.status,
    activationStatus: dto.activationStatus,
    activationTurnNumber: dto.activationTurnNumber,
    nextStep: dto.nextStep,
    settings: dto.settings,
    selectedFaction: dto.selectedFaction ? mapOption(dto.selectedFaction) : null,
    selectedNation: dto.selectedNation ? mapNationOption(dto.selectedNation) : null,
    selectedHomeland: dto.selectedHomeland ? mapHomelandOption(dto.selectedHomeland) : null,
    eligibleFactions: dto.eligibleFactions.map(mapOption),
    eligibleNations: dto.eligibleNations.map(mapNationOption),
    eligibleHomelands: dto.eligibleHomelands.map(mapHomelandOption),
    starterPlatoonName: dto.starterPlatoonName,
    tutorialCompletedAt: mapDate(dto.tutorialCompletedAt),
    tutorialVersion: dto.tutorialVersion,
  }
}

function mapCompleteOnboardingResponse(dto: CompleteOnboardingResponseDto): CompleteOnboardingResponse {
  return {
    campaignId: dto.campaignId,
    membershipId: dto.membershipId,
    onboardingStatus: dto.onboardingStatus,
    activationStatus: dto.activationStatus,
    activationTurnNumber: dto.activationTurnNumber,
    redirectPath: dto.redirectPath,
    starterPlatoonName: dto.starterPlatoonName,
  }
}

async function fetchOnboarding(campaignId: string) {
  const response = await api.get<CampaignOnboardingDto>(`/api/campaigns/${campaignId}/onboarding`)
  return mapCampaignOnboarding(response.data)
}

async function selectFaction(campaignId: string, payload: SelectOnboardingFactionInput) {
  const response = await api.post<CampaignOnboardingDto>(`/api/campaigns/${campaignId}/onboarding/faction`, payload)
  return mapCampaignOnboarding(response.data)
}

async function selectNation(campaignId: string, payload: SelectOnboardingNationInput) {
  const response = await api.post<CampaignOnboardingDto>(`/api/campaigns/${campaignId}/onboarding/nation`, payload)
  return mapCampaignOnboarding(response.data)
}

async function selectHomeland(campaignId: string, payload: SelectOnboardingHomelandInput) {
  const response = await api.post<CampaignOnboardingDto>(`/api/campaigns/${campaignId}/onboarding/homeland`, payload)
  return mapCampaignOnboarding(response.data)
}

async function completeOnboarding(campaignId: string) {
  const response = await api.post<CompleteOnboardingResponseDto>(`/api/campaigns/${campaignId}/onboarding/complete`)
  return mapCompleteOnboardingResponse(response.data)
}

async function completeTutorial(campaignId: string, payload: CompleteOnboardingTutorialInput) {
  const response = await api.post<CampaignMemberOnboardingDto>(
    `/api/campaigns/${campaignId}/onboarding/tutorial/complete`,
    payload,
  )
  return mapCampaignMemberOnboarding(response.data)
}

export function useCampaignOnboarding(campaignId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.campaignOnboarding(campaignId),
    queryFn: () => fetchOnboarding(campaignId),
    enabled: Boolean(campaignId && enabled),
  })
}

export function useSelectOnboardingFaction(campaignId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: SelectOnboardingFactionInput) => selectFaction(campaignId, payload),
    onSuccess: async () => {
      await invalidateCampaignState(queryClient, campaignId)
    },
  })
}

export function useSelectOnboardingNation(campaignId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: SelectOnboardingNationInput) => selectNation(campaignId, payload),
    onSuccess: async () => {
      await invalidateCampaignState(queryClient, campaignId)
    },
  })
}

export function useSelectOnboardingHomeland(campaignId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: SelectOnboardingHomelandInput) => selectHomeland(campaignId, payload),
    onSuccess: async () => {
      await invalidateCampaignState(queryClient, campaignId)
    },
  })
}

export function useCompleteOnboarding(campaignId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => completeOnboarding(campaignId),
    onSuccess: async () => {
      await invalidateCampaignState(queryClient, campaignId)
    },
  })
}

export function useCompleteOnboardingTutorial(campaignId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CompleteOnboardingTutorialInput) => completeTutorial(campaignId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.campaignOnboarding(campaignId) })
      await queryClient.invalidateQueries({ queryKey: queryKeys.campaign(campaignId) })
      await queryClient.invalidateQueries({ queryKey: queryKeys.campaignMembers(campaignId) })
    },
  })
}

async function invalidateCampaignState(queryClient: ReturnType<typeof useQueryClient>, campaignId: string) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.campaignOnboarding(campaignId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.campaign(campaignId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.campaigns }),
    queryClient.invalidateQueries({ queryKey: queryKeys.campaignMembers(campaignId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.campaignMap(campaignId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.campaignPhase(campaignId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.campaignPlatoons(campaignId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.campaignMapBridge(campaignId) }),
  ])
}
