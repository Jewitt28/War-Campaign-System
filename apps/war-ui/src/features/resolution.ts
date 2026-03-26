import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { queryKeys } from '../lib/queryKeys'

type BattleParticipantDto = {
  platoonId: string
  platoonKey: string
  platoonName: string
  side: string
  factionName: string
  nationName: string | null
  preConditionBand: string | null
  postConditionBand: string | null
}

type BattleSummaryDto = {
  battleId: string
  territoryId: string
  territoryName: string
  battleStatus: string
  battleMode: string
  attackerFactionId: string
  attackerFactionName: string
  defenderFactionId: string
  defenderFactionName: string
  createdAt: string
  participants: BattleParticipantDto[]
}

type BattleDetailDto = {
  battleId: string
  campaignId: string
  turnNumber: number
  territoryId: string
  territoryName: string
  battleStatus: string
  battleMode: string
  attackerFactionId: string
  attackerFactionName: string
  defenderFactionId: string
  defenderFactionName: string
  scenarioKey: string | null
  scheduledFor: string | null
  tabletopResultSummary: string | null
  strategicResultJson: string | null
  createdAt: string
  participants: BattleParticipantDto[]
}

type ResolutionSubmissionSummaryDto = {
  submissionId: string
  submittedByMemberId: string
  submittedByDisplayName: string
  factionId: string
  factionName: string
  status: string
  lockedAt: string | null
  revealAt: string | null
  checksum: string | null
  orderCount: number
}

type ResolutionEventDto = {
  eventId: string
  eventType: string
  visibilityScope: string
  territoryId: string | null
  territoryName: string | null
  actorFactionId: string | null
  actorFactionName: string | null
  targetFactionId: string | null
  targetFactionName: string | null
  payloadJson: string | null
  createdByType: string
  createdByMemberId: string | null
  createdAt: string
}

type ResolutionSummaryDto = {
  campaignId: string
  turnNumber: number
  currentPhase: string
  revealedSubmissionCount: number
  battleCount: number
  eventCount: number
  submissions: ResolutionSubmissionSummaryDto[]
  battles: BattleSummaryDto[]
  events: ResolutionEventDto[]
}

type AuditLogDto = {
  auditLogId: string
  actorType: string
  actorUserId: string | null
  actorDisplayName: string | null
  actorMemberId: string | null
  actionType: string
  entityType: string
  entityId: string
  beforeJson: string | null
  afterJson: string | null
  createdAt: string
}

export type BattleParticipant = BattleParticipantDto

export type BattleSummary = Omit<BattleSummaryDto, 'createdAt' | 'participants'> & {
  createdAt: Date
  participants: BattleParticipant[]
}

export type BattleDetail = Omit<BattleDetailDto, 'createdAt' | 'scheduledFor' | 'participants'> & {
  createdAt: Date
  scheduledFor: Date | null
  participants: BattleParticipant[]
}

export type ResolutionSubmissionSummary = Omit<ResolutionSubmissionSummaryDto, 'lockedAt' | 'revealAt'> & {
  lockedAt: Date | null
  revealAt: Date | null
}

export type ResolutionEvent = Omit<ResolutionEventDto, 'createdAt'> & {
  createdAt: Date
}

export type ResolutionSummary = Omit<ResolutionSummaryDto, 'submissions' | 'battles' | 'events'> & {
  submissions: ResolutionSubmissionSummary[]
  battles: BattleSummary[]
  events: ResolutionEvent[]
}

export type AuditLog = Omit<AuditLogDto, 'createdAt'> & {
  createdAt: Date
}

export type RecordBattleResultInput = {
  tabletopResultSummary: string
  winnerFactionId: string
  participantResults: {
    platoonId: string
    postConditionBand: string
  }[]
}

function mapBattleParticipant(dto: BattleParticipantDto): BattleParticipant {
  return dto
}

function mapBattleSummary(dto: BattleSummaryDto): BattleSummary {
  return {
    ...dto,
    createdAt: new Date(dto.createdAt),
    participants: dto.participants.map(mapBattleParticipant),
  }
}

function mapBattleDetail(dto: BattleDetailDto): BattleDetail {
  return {
    ...dto,
    createdAt: new Date(dto.createdAt),
    scheduledFor: dto.scheduledFor ? new Date(dto.scheduledFor) : null,
    participants: dto.participants.map(mapBattleParticipant),
  }
}

function mapResolutionSummary(dto: ResolutionSummaryDto): ResolutionSummary {
  return {
    ...dto,
    submissions: dto.submissions.map((submission) => ({
      ...submission,
      lockedAt: submission.lockedAt ? new Date(submission.lockedAt) : null,
      revealAt: submission.revealAt ? new Date(submission.revealAt) : null,
    })),
    battles: dto.battles.map(mapBattleSummary),
    events: dto.events.map((event) => ({
      ...event,
      createdAt: new Date(event.createdAt),
    })),
  }
}

function mapAudit(dto: AuditLogDto): AuditLog {
  return {
    ...dto,
    createdAt: new Date(dto.createdAt),
  }
}

async function fetchResolutionSummary(campaignId: string, turnNumber: number) {
  const response = await api.get<ResolutionSummaryDto>(`/api/campaigns/${campaignId}/turns/${turnNumber}/resolution`)
  return mapResolutionSummary(response.data)
}

async function fetchBattleDetail(campaignId: string, battleId: string) {
  const response = await api.get<BattleDetailDto>(`/api/campaigns/${campaignId}/battles/${battleId}`)
  return mapBattleDetail(response.data)
}

async function fetchAuditLog(campaignId: string) {
  const response = await api.get<AuditLogDto[]>(`/api/campaigns/${campaignId}/audit`)
  return response.data.map(mapAudit)
}

async function recordBattleResult(campaignId: string, battleId: string, payload: RecordBattleResultInput) {
  const response = await api.post<BattleDetailDto>(`/api/campaigns/${campaignId}/battles/${battleId}/result`, payload)
  return mapBattleDetail(response.data)
}

export function useResolutionSummary(campaignId: string, turnNumber: number, enabled = true) {
  return useQuery({
    queryKey: queryKeys.resolutionSummary(campaignId, turnNumber),
    queryFn: () => fetchResolutionSummary(campaignId, turnNumber),
    enabled: Boolean(campaignId && turnNumber && enabled),
  })
}

export function useBattleDetail(campaignId: string, battleId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.battleDetail(campaignId, battleId),
    queryFn: () => fetchBattleDetail(campaignId, battleId),
    enabled: Boolean(campaignId && battleId && enabled),
  })
}

export function useAuditLog(campaignId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.auditLog(campaignId),
    queryFn: () => fetchAuditLog(campaignId),
    enabled: Boolean(campaignId && enabled),
  })
}

export function useRecordBattleResult(campaignId: string, battleId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: RecordBattleResultInput) => recordBattleResult(campaignId, battleId, payload),
    onSuccess: async (detail) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.battleDetail(campaignId, battleId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.resolutionSummary(campaignId, detail.turnNumber) }),
      ])
    },
  })
}
