import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useCampaign, useCampaignMap, useCampaignPhase } from '../../features/campaigns'
import { useLockMyOrders, useMyOrders, useSaveMyOrders, type SaveOrderLineInput } from '../../features/orders'
import { useCampaignPlatoons } from '../../features/platoons'
import { useCampaignStore } from '../../store/useCampaignStore'
import { Notice, SkeletonCard, StateCard } from '../components'

type DraftOrderType = 'MOVE' | 'HOLD' | 'RECON'

const orderTypes: DraftOrderType[] = ['MOVE', 'HOLD', 'RECON']
const orderTypesRequiringTarget = new Set<DraftOrderType>(['MOVE', 'RECON'])

function formatTimestamp(date: Date | null) {
  if (!date) {
    return 'Not recorded'
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function parseValidationErrors(raw: string | null) {
  if (!raw) {
    return []
  }

  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.map(String) : [String(parsed)]
  } catch {
    return [raw]
  }
}

export function CampaignMapOrdersPanel() {
  const { campaignId = '' } = useParams()
  const campaign = useCampaign(campaignId)
  const phase = useCampaignPhase(campaignId)
  const mapSummary = useCampaignMap(campaignId)
  const platoons = useCampaignPlatoons(campaignId)
  const selectedTerritoryKey = useCampaignStore((state) => state.selectedTerritoryId)
  const setSelectedTerritory = useCampaignStore((state) => state.setSelectedTerritory)
  const selectedPlatoonId = useCampaignStore((state) => state.selectedPlatoonId)
  const setSelectedPlatoonId = useCampaignStore((state) => state.setSelectedPlatoonId)
  const turnNumber = phase.data?.currentTurnNumber ?? 0
  const orders = useMyOrders(campaignId, turnNumber, Boolean(turnNumber))
  const saveOrders = useSaveMyOrders(campaignId, turnNumber)
  const lockOrders = useLockMyOrders(campaignId, turnNumber)
  const [activeOrderType, setActiveOrderType] = useState<DraftOrderType>('MOVE')
  const [payloadJson, setPayloadJson] = useState('')

  const territoryByKey = useMemo(
    () => new Map((mapSummary.data?.territories ?? []).map((territory) => [territory.key, territory])),
    [mapSummary.data?.territories],
  )
  const selectedTarget = selectedTerritoryKey ? territoryByKey.get(selectedTerritoryKey) ?? null : null
  const selectedPlatoon = useMemo(
    () => (platoons.data ?? []).find((platoon) => platoon.id === selectedPlatoonId) ?? null,
    [platoons.data, selectedPlatoonId],
  )

  if (campaign.isLoading || phase.isLoading || mapSummary.isLoading || platoons.isLoading || orders.isLoading) {
    return (
      <div className="page-stack">
        <SkeletonCard lines={4} />
        <SkeletonCard lines={5} />
      </div>
    )
  }

  if (
    campaign.isError ||
    phase.isError ||
    mapSummary.isError ||
    platoons.isError ||
    orders.isError ||
    !campaign.data ||
    !phase.data ||
    !mapSummary.data ||
    !platoons.data ||
    !orders.data
  ) {
    return (
      <StateCard
        title="Map orders unavailable"
        description="The backend-authoritative map orders panel could not be assembled from the current campaign data."
      />
    )
  }

  if (campaign.data.myMembership.role !== 'PLAYER') {
    return (
      <Notice>
        Backend order drafting is player-only. GM sessions can inspect the map and switch to player accounts to test the
        draft/lock flow.
      </Notice>
    )
  }

  const orderSubmission = orders.data
  const isEditable = phase.data.currentPhase === 'OPERATIONS' && orderSubmission.status !== 'LOCKED'
  const selectedOrder = orderSubmission.orders.find((order) => order.platoonId === selectedPlatoonId) ?? null
  const selectedValidationErrors = parseValidationErrors(selectedOrder?.validationErrorsJson ?? null)

  function buildMergedPayload(nextOrder: SaveOrderLineInput) {
    const withoutCurrent = orderSubmission.orders
      .filter((order) => order.platoonId !== nextOrder.platoonId)
      .map(
        (order): SaveOrderLineInput => ({
          platoonId: order.platoonId,
          orderType: order.orderType,
          sourceTerritoryId: order.sourceTerritoryId,
          targetTerritoryId: order.targetTerritoryId,
          payloadJson: order.payloadJson,
        }),
      )

    return [...withoutCurrent, nextOrder]
  }

  async function saveSelectedOrder() {
    if (!selectedPlatoon) {
      return
    }

    const needsTarget = orderTypesRequiringTarget.has(activeOrderType)
    const targetTerritoryId = needsTarget ? selectedTarget?.id ?? null : null
    const nextOrder: SaveOrderLineInput = {
      platoonId: selectedPlatoon.id,
      orderType: activeOrderType,
      sourceTerritoryId: selectedPlatoon.currentTerritory?.id ?? null,
      targetTerritoryId,
      payloadJson: payloadJson.trim() ? payloadJson.trim() : null,
    }

    await saveOrders.mutateAsync(buildMergedPayload(nextOrder))
  }

  async function lockSubmission() {
    await lockOrders.mutateAsync()
  }

  return (
    <div className="page-stack">
      <div className="page-header">
        <div className="page-header-copy">
          <h3 className="detail-title">Map orders</h3>
          <p className="muted">
            Select a platoon here, then use the map selection as the order target. Drafts and locks save through the
            backend order API instead of the old local map store.
          </p>
        </div>
        <div className="pill-row">
          <span className="meta-pill">Turn {orderSubmission.turnNumber}</span>
          <span className="meta-pill">{orderSubmission.status}</span>
          <span className="meta-pill">{phase.data.currentPhase}</span>
        </div>
      </div>

      {orderSubmission.status === 'LOCKED' ? (
        <Notice tone="success">This submission is locked and read-only.</Notice>
      ) : isEditable ? (
        <Notice>Orders can be drafted from the map during the current operations phase.</Notice>
      ) : (
        <Notice tone="error">This campaign is outside the editable operations window, so the submission is read-only.</Notice>
      )}

      <section className="surface-card page-card page-stack">
        <h3 className="detail-title">Controlled platoons</h3>
        {platoons.data.length === 0 ? (
          <Notice>No controlled platoons are visible for this player.</Notice>
        ) : (
          <div className="campaign-grid">
            {platoons.data.map((platoon) => {
              const platoonOrder = orderSubmission.orders.find((order) => order.platoonId === platoon.id) ?? null
              const isSelected = selectedPlatoonId === platoon.id
              return (
                <button
                  key={platoon.id}
                  className="campaign-card"
                  onClick={() => {
                    setSelectedPlatoonId(platoon.id)
                    setSelectedTerritory(platoon.currentTerritory?.key ?? null)
                    setPayloadJson(platoonOrder?.payloadJson ?? '')
                    if (platoonOrder && orderTypes.includes(platoonOrder.orderType as DraftOrderType)) {
                      setActiveOrderType(platoonOrder.orderType as DraftOrderType)
                    }
                  }}
                  type="button"
                >
                  <div className="pill-row">
                    <span className="meta-pill">{platoon.unitType}</span>
                    <span className="meta-pill">{platoon.readinessStatus}</span>
                    {platoonOrder ? <span className="meta-pill">{platoonOrder.orderType}</span> : null}
                  </div>
                  <h3>{platoon.name}</h3>
                  <p className="muted">{platoon.currentTerritory?.name ?? 'Unknown territory'}</p>
                  {platoonOrder?.targetTerritoryId ? (
                    <p className="muted">Backend order saved</p>
                  ) : platoonOrder ? (
                    <p className="muted">No target required</p>
                  ) : isSelected ? (
                    <p className="muted">Selected for drafting</p>
                  ) : null}
                </button>
              )
            })}
          </div>
        )}
      </section>

      <section className="surface-card page-card page-stack">
        <h3 className="detail-title">Draft editor</h3>
        {!selectedPlatoon ? (
          <Notice>Select a platoon to draft an order from the map.</Notice>
        ) : (
          <>
            <div className="detail-list">
              <div className="detail-row">
                <dt>Platoon</dt>
                <dd>{selectedPlatoon.name}</dd>
              </div>
              <div className="detail-row">
                <dt>Source</dt>
                <dd>{selectedPlatoon.currentTerritory?.name ?? 'Unknown territory'}</dd>
              </div>
              <div className="detail-row">
                <dt>Selected map target</dt>
                <dd>{selectedTarget?.name ?? 'No map territory selected'}</dd>
              </div>
              <div className="detail-row">
                <dt>Saved status</dt>
                <dd>{selectedOrder?.validationStatus ?? 'No backend draft yet'}</dd>
              </div>
            </div>

            <div className="button-row">
              {orderTypes.map((orderType) => (
                <button
                  key={orderType}
                  className={activeOrderType === orderType ? 'button-link' : 'button-secondary'}
                  onClick={() => setActiveOrderType(orderType)}
                  type="button"
                >
                  {orderType}
                </button>
              ))}
            </div>

            <label className="field-label">
              Optional payload JSON
              <textarea
                className="field-input"
                onChange={(event) => setPayloadJson(event.target.value)}
                placeholder='{"stance":"aggressive"}'
                rows={4}
                value={payloadJson}
              />
            </label>

            {selectedValidationErrors.length > 0 ? (
              <Notice tone="error">{selectedValidationErrors.join(', ')}</Notice>
            ) : null}

            <div className="button-row">
              <button
                className="button-link"
                disabled={
                  !isEditable ||
                  saveOrders.isPending ||
                  (orderTypesRequiringTarget.has(activeOrderType) && !selectedTarget)
                }
                onClick={() => void saveSelectedOrder()}
                type="button"
              >
                {saveOrders.isPending ? 'Saving...' : 'Save backend draft'}
              </button>
              <button
                className="button-secondary"
                disabled={!isEditable || lockOrders.isPending || orderSubmission.status !== 'VALIDATED'}
                onClick={() => void lockSubmission()}
                type="button"
              >
                {lockOrders.isPending ? 'Locking...' : 'Lock submission'}
              </button>
            </div>
          </>
        )}
      </section>

      <section className="surface-card page-card page-stack">
        <h3 className="detail-title">Submission summary</h3>
        <div className="detail-list">
          <div className="detail-row">
            <dt>Submitted at</dt>
            <dd>{formatTimestamp(orderSubmission.submittedAt)}</dd>
          </div>
          <div className="detail-row">
            <dt>Locked at</dt>
            <dd>{formatTimestamp(orderSubmission.lockedAt)}</dd>
          </div>
          <div className="detail-row">
            <dt>Checksum</dt>
            <dd>{orderSubmission.checksum ?? 'Not locked yet'}</dd>
          </div>
        </div>
      </section>
    </div>
  )
}
