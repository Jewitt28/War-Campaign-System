import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { queryKeys } from '../lib/queryKeys'

type PlatoonOrderDto = {
  id: string
  platoonId: string
  platoonKey: string
  platoonName: string
  orderType: string
  sourceTerritoryId: string | null
  targetTerritoryId: string | null
  payloadJson: string | null
  validationStatus: string
  validationErrorsJson: string | null
  createdAt: string
}

type MyOrderSubmissionDto = {
  submissionId: string | null
  campaignId: string
  turnNumber: number
  submittedByMemberId: string
  factionId: string
  status: string
  submittedAt: string | null
  lockedAt: string | null
  checksum: string | null
  orders: PlatoonOrderDto[]
}

export type OrderLine = {
  id: string
  platoonId: string
  platoonKey: string
  platoonName: string
  orderType: string
  sourceTerritoryId: string | null
  targetTerritoryId: string | null
  payloadJson: string | null
  validationStatus: string
  validationErrorsJson: string | null
  createdAt: Date
}

export type OrderSubmission = {
  submissionId: string | null
  campaignId: string
  turnNumber: number
  submittedByMemberId: string
  factionId: string
  status: string
  submittedAt: Date | null
  lockedAt: Date | null
  checksum: string | null
  orders: OrderLine[]
}

export type SaveOrderLineInput = {
  platoonId: string
  orderType: string
  sourceTerritoryId: string | null
  targetTerritoryId: string | null
  payloadJson: string | null
}

function mapOrderLine(dto: PlatoonOrderDto): OrderLine {
  return {
    id: dto.id,
    platoonId: dto.platoonId,
    platoonKey: dto.platoonKey,
    platoonName: dto.platoonName,
    orderType: dto.orderType,
    sourceTerritoryId: dto.sourceTerritoryId,
    targetTerritoryId: dto.targetTerritoryId,
    payloadJson: dto.payloadJson,
    validationStatus: dto.validationStatus,
    validationErrorsJson: dto.validationErrorsJson,
    createdAt: new Date(dto.createdAt),
  }
}

function mapOrderSubmission(dto: MyOrderSubmissionDto): OrderSubmission {
  return {
    submissionId: dto.submissionId,
    campaignId: dto.campaignId,
    turnNumber: dto.turnNumber,
    submittedByMemberId: dto.submittedByMemberId,
    factionId: dto.factionId,
    status: dto.status,
    submittedAt: dto.submittedAt ? new Date(dto.submittedAt) : null,
    lockedAt: dto.lockedAt ? new Date(dto.lockedAt) : null,
    checksum: dto.checksum,
    orders: dto.orders.map(mapOrderLine),
  }
}

async function fetchMyOrders(campaignId: string, turnNumber: number) {
  const response = await api.get<MyOrderSubmissionDto>(`/api/campaigns/${campaignId}/turns/${turnNumber}/orders/me`)
  return mapOrderSubmission(response.data)
}

async function saveMyOrders(campaignId: string, turnNumber: number, orders: SaveOrderLineInput[]) {
  const response = await api.put<MyOrderSubmissionDto>(`/api/campaigns/${campaignId}/turns/${turnNumber}/orders/me`, {
    orders,
  })
  return mapOrderSubmission(response.data)
}

async function lockMyOrders(campaignId: string, turnNumber: number) {
  const response = await api.post<MyOrderSubmissionDto>(`/api/campaigns/${campaignId}/turns/${turnNumber}/orders/me/lock`)
  return mapOrderSubmission(response.data)
}

export function useMyOrders(campaignId: string, turnNumber: number, enabled = true) {
  return useQuery({
    queryKey: queryKeys.myOrders(campaignId, turnNumber),
    queryFn: () => fetchMyOrders(campaignId, turnNumber),
    enabled: Boolean(campaignId && turnNumber && enabled),
  })
}

export function useSaveMyOrders(campaignId: string, turnNumber: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (orders: SaveOrderLineInput[]) => saveMyOrders(campaignId, turnNumber, orders),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.myOrders(campaignId, turnNumber) })
    },
  })
}

export function useLockMyOrders(campaignId: string, turnNumber: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => lockMyOrders(campaignId, turnNumber),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.myOrders(campaignId, turnNumber) })
    },
  })
}
