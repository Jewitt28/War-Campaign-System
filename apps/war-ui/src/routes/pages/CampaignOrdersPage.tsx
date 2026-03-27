import { useMemo, useState } from 'react'
import { NavLink, useParams } from 'react-router-dom'
import { useCampaign, useCampaignMap, useCampaignPhase } from '../../features/campaigns'
import { useMyOrders, useLockMyOrders, useSaveMyOrders } from '../../features/orders'
import { useCampaignPlatoons } from '../../features/platoons'
import { Notice, SkeletonCard, StateCard } from '../components'

type EditableOrder = {
  platoonId: string
  orderType: string
  sourceTerritoryId: string | null
  targetTerritoryId: string | null
  payloadJson: string
}

const orderTypes = ['MOVE', 'ATTACK', 'WITHDRAW', 'HOLD', 'RECON', 'BOMBARD', 'REFIT', 'REDEPLOY', 'SUPPORT', 'DIPLOMACY_ATTACH']
const orderTypesRequiringTarget = new Set(['MOVE', 'ATTACK', 'WITHDRAW', 'RECON', 'BOMBARD', 'REDEPLOY', 'SUPPORT', 'DIPLOMACY_ATTACH'])

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

function formatTimestamp(date: Date | null) {
  if (!date) {
    return 'Not yet recorded'
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function buildEditableOrders(
  existingOrders: {
    platoonId: string
    orderType: string
    sourceTerritoryId: string | null
    targetTerritoryId: string | null
    payloadJson: string | null
  }[],
): EditableOrder[] {
  return existingOrders.map((order) => ({
    platoonId: order.platoonId,
    orderType: order.orderType,
    sourceTerritoryId: order.sourceTerritoryId,
    targetTerritoryId: order.targetTerritoryId,
    payloadJson: order.payloadJson ?? '',
  }))
}

export function CampaignOrdersPage() {
  const { campaignId = '' } = useParams()
  const campaign = useCampaign(campaignId)
  const phase = useCampaignPhase(campaignId)
  const mapSummary = useCampaignMap(campaignId)
  const turnNumber = phase.data?.currentTurnNumber ?? 0
  const pendingActivation =
    campaign.data?.myMembership.role === 'PLAYER' &&
    campaign.data?.myMembership.onboarding?.activationStatus === 'PENDING_NEXT_TURN'
  const canLoadOrders =
    Boolean(turnNumber) &&
    campaign.data?.myMembership.role === 'PLAYER' &&
    !pendingActivation
  const platoons = useCampaignPlatoons(campaignId, Boolean(canLoadOrders))
  const orders = useMyOrders(campaignId, turnNumber, Boolean(canLoadOrders))
  const saveOrders = useSaveMyOrders(campaignId, turnNumber)
  const lockOrders = useLockMyOrders(campaignId, turnNumber)
  const [draftOrders, setDraftOrders] = useState<EditableOrder[] | null>(null)
  const [isDirty, setIsDirty] = useState(false)
  const [showLockConfirm, setShowLockConfirm] = useState(false)

  const territoryOptions = useMemo(() => {
    return (mapSummary.data?.territories ?? []).map((territory) => ({
      id: territory.id,
      label: territory.name,
    }))
  }, [mapSummary.data?.territories])

  const platoonOptions = useMemo(() => {
    return (platoons.data ?? []).map((platoon) => ({
      id: platoon.id,
      label: `${platoon.name} (${platoon.currentTerritory?.name ?? 'Unknown territory'})`,
      defaultSourceTerritoryId: platoon.currentTerritory?.id ?? null,
    }))
  }, [platoons.data])

  if (
    campaign.isLoading ||
    phase.isLoading ||
    mapSummary.isLoading ||
    (canLoadOrders && (platoons.isLoading || orders.isLoading))
  ) {
    return (
      <div className="page-stack">
        <SkeletonCard lines={4} />
        <SkeletonCard lines={6} />
      </div>
    )
  }

  if (
    campaign.isError ||
    phase.isError ||
    mapSummary.isError ||
    !campaign.data ||
    !phase.data ||
    !mapSummary.data
  ) {
    return (
      <StateCard
        title="Orders unavailable"
        description="The orders workflow could not be assembled from the current campaign data."
      />
    )
  }

  const myRole = campaign.data.myMembership.role
  if (myRole !== 'PLAYER') {
    return (
      <StateCard
        title="Player role required"
        description="Orders are only available to player memberships. GM and observer sessions remain outside the submission flow."
        actions={<NavLink className="button-link" to={`/app/campaigns/${campaignId}/dashboard`}>Back to dashboard</NavLink>}
      />
    )
  }

  if (pendingActivation) {
    return (
      <StateCard
        title="Orders unlock next turn"
        description="Your nation is staged for activation, so order drafting stays disabled until the next turn begins."
        actions={
          <>
            <NavLink className="button-link" to={`/app/campaigns/${campaignId}/waiting`}>
              Open waiting status
            </NavLink>
            <NavLink className="button-secondary" to={`/app/help?campaignId=${campaignId}#orders`}>
              Orders help
            </NavLink>
          </>
        }
      />
    )
  }

  if (platoons.isError || orders.isError || !platoons.data || !orders.data) {
    return (
      <StateCard
        title="Orders unavailable"
        description="The orders workflow could not be assembled from the current campaign data."
      />
    )
  }

  const phaseData = phase.data
  const ordersData = orders.data
  const platoonsData = platoons.data
  const isLocked = ordersData.status === 'LOCKED'
  const editableWindow = phaseData.currentPhase === 'OPERATIONS' && phaseData.currentTurnNumber === ordersData.turnNumber && !isLocked
  const workingDraftOrders = isDirty && draftOrders !== null ? draftOrders : buildEditableOrders(ordersData.orders)

  function updateDraftOrder(index: number, patch: Partial<EditableOrder>) {
    setDraftOrders((current) =>
      (current ?? workingDraftOrders).map((order, currentIndex) => (currentIndex === index ? { ...order, ...patch } : order)),
    )
    setIsDirty(true)
  }

  function addDraftOrder() {
    const defaultPlatoon = platoonOptions[0]
    setDraftOrders((current) => [
      ...(current ?? workingDraftOrders),
      {
        platoonId: defaultPlatoon?.id ?? '',
        orderType: 'HOLD',
        sourceTerritoryId: defaultPlatoon?.defaultSourceTerritoryId ?? null,
        targetTerritoryId: null,
        payloadJson: '',
      },
    ])
    setIsDirty(true)
  }

  function removeDraftOrder(index: number) {
    setDraftOrders((current) => (current ?? workingDraftOrders).filter((_, currentIndex) => currentIndex !== index))
    setIsDirty(true)
  }

  function resetDraftToSaved() {
    setDraftOrders(null)
    setIsDirty(false)
  }

  async function handleSave() {
    const payload = workingDraftOrders.map((order) => ({
      platoonId: order.platoonId,
      orderType: order.orderType,
      sourceTerritoryId: order.sourceTerritoryId || null,
      targetTerritoryId: orderTypesRequiringTarget.has(order.orderType) ? order.targetTerritoryId || null : null,
      payloadJson: order.payloadJson.trim() ? order.payloadJson : null,
    }))

    await saveOrders.mutateAsync(payload)
    setDraftOrders(null)
    setIsDirty(false)
  }

  async function handleLock() {
    await lockOrders.mutateAsync()
    setShowLockConfirm(false)
    setDraftOrders(null)
    setIsDirty(false)
  }

  function canLockSubmission() {
    return editableWindow && ordersData.status === 'VALIDATED' && !isDirty
  }

  return (
    <section className="page-stack">
      <div className="page-header">
        <div className="page-header-copy">
          <p className="eyebrow">Orders</p>
          <h2 className="detail-title">Operations submission</h2>
          <p className="muted">Save drafts, review backend validation, and lock the current turn submission when ready.</p>
        </div>
        <div className="pill-row">
          <span className="meta-pill">Turn {ordersData.turnNumber}</span>
          <span className="meta-pill">{ordersData.status}</span>
          <span className="meta-pill">{phaseData.currentPhase}</span>
        </div>
      </div>

      {isLocked ? (
        <Notice tone="success">This submission is locked and read-only.</Notice>
      ) : editableWindow ? (
        <Notice>This submission is editable during the current operations phase.</Notice>
      ) : (
        <Notice tone="error">This submission is currently read-only because the campaign is outside the active operations edit window.</Notice>
      )}

      <Notice>
        Need a refresher on drafting and locking submissions? <NavLink to={`/app/help?campaignId=${campaignId}#orders`}>Open the orders guide</NavLink>.
      </Notice>

      <div className="hero-grid">
        <section className="surface-card page-card page-stack">
          <h3 className="detail-title">Submission status</h3>
          <div className="detail-list">
            <div className="detail-row">
              <dt>Submitted at</dt>
              <dd>{formatTimestamp(ordersData.submittedAt)}</dd>
            </div>
            <div className="detail-row">
              <dt>Locked at</dt>
              <dd>{formatTimestamp(ordersData.lockedAt)}</dd>
            </div>
            <div className="detail-row">
              <dt>Checksum</dt>
              <dd>{ordersData.checksum ?? 'Not locked yet'}</dd>
            </div>
          </div>
        </section>

        <section className="surface-card surface-card-strong page-card page-stack">
          <h3 className="detail-title">Controlled platoons</h3>
          {platoonOptions.length === 0 ? (
            <Notice>No visible platoons available for this player submission.</Notice>
          ) : (
            <div className="campaign-grid">
              {platoonsData.map((platoon) => (
                <article key={platoon.id} className="campaign-card">
                  <div className="pill-row">
                    <span className="meta-pill">{platoon.unitType}</span>
                    <span className="meta-pill">{platoon.readinessStatus}</span>
                  </div>
                  <h3>{platoon.name}</h3>
                  <p className="muted">{platoon.currentTerritory?.name ?? 'Unknown territory'}</p>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="surface-card page-card page-stack">
        <div className="page-header">
          <div className="page-header-copy">
            <h3 className="detail-title">Order editor</h3>
            <p className="muted">The editor only stages request payloads. Validation comes from the backend save response.</p>
          </div>
          {editableWindow ? (
            <div className="button-row">
              <button className="button-secondary" onClick={addDraftOrder} type="button">
                Add order
              </button>
              <button className="button-secondary" onClick={resetDraftToSaved} type="button">
                Reset draft
              </button>
            </div>
          ) : null}
        </div>

        {workingDraftOrders.length === 0 ? (
          <Notice>No draft lines yet. Add an order to begin the submission.</Notice>
        ) : (
          <div className="page-stack">
            {workingDraftOrders.map((order, index) => {
              const selectedPlatoon = platoonOptions.find((platoon) => platoon.id === order.platoonId)
              const needsTarget = orderTypesRequiringTarget.has(order.orderType)

              return (
                <article key={`${order.platoonId}-${index}`} className="campaign-card">
                  <div className="field-grid">
                    <label className="field-label">
                      Platoon
                      <select
                        className="field-input"
                        disabled={!editableWindow}
                        onChange={(event) => {
                          const nextPlatoon = platoonOptions.find((platoon) => platoon.id === event.target.value)
                          updateDraftOrder(index, {
                            platoonId: event.target.value,
                            sourceTerritoryId: nextPlatoon?.defaultSourceTerritoryId ?? null,
                          })
                        }}
                        value={order.platoonId}
                      >
                        {platoonOptions.map((platoon) => (
                          <option key={platoon.id} value={platoon.id}>
                            {platoon.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="field-label">
                      Order type
                      <select
                        className="field-input"
                        disabled={!editableWindow}
                        onChange={(event) =>
                          updateDraftOrder(index, {
                            orderType: event.target.value,
                            targetTerritoryId: orderTypesRequiringTarget.has(event.target.value) ? order.targetTerritoryId : null,
                          })
                        }
                        value={order.orderType}
                      >
                        {orderTypes.map((orderType) => (
                          <option key={orderType} value={orderType}>
                            {orderType}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="field-label">
                      Source territory
                      <select
                        className="field-input"
                        disabled={!editableWindow}
                        onChange={(event) => updateDraftOrder(index, { sourceTerritoryId: event.target.value || null })}
                        value={order.sourceTerritoryId ?? ''}
                      >
                        <option value="">Unspecified</option>
                        {territoryOptions.map((territory) => (
                          <option key={territory.id} value={territory.id}>
                            {territory.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="field-label">
                      Target territory
                      <select
                        className="field-input"
                        disabled={!editableWindow || !needsTarget}
                        onChange={(event) => updateDraftOrder(index, { targetTerritoryId: event.target.value || null })}
                        value={order.targetTerritoryId ?? ''}
                      >
                        <option value="">Unspecified</option>
                        {territoryOptions.map((territory) => (
                          <option key={territory.id} value={territory.id}>
                            {territory.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="field-label">
                      Payload JSON
                      <textarea
                        className="field-input field-textarea"
                        disabled={!editableWindow}
                        onChange={(event) => updateDraftOrder(index, { payloadJson: event.target.value })}
                        placeholder='{"stance":"aggressive"}'
                        value={order.payloadJson}
                      />
                    </label>
                  </div>

                  <div className="button-row">
                    <span className="meta-pill">{selectedPlatoon?.label ?? 'Platoon not selected'}</span>
                    {editableWindow ? (
                      <button className="button-danger" onClick={() => removeDraftOrder(index)} type="button">
                        Remove
                      </button>
                    ) : null}
                  </div>
                </article>
              )
            })}
          </div>
        )}

        {(saveOrders.isError || lockOrders.isError) ? (
          <Notice tone="error">{saveOrders.error?.message ?? lockOrders.error?.message}</Notice>
        ) : null}

        <div className="button-row">
          <button className="button-link" disabled={!editableWindow || saveOrders.isPending} onClick={handleSave} type="button">
            {saveOrders.isPending ? 'Saving...' : 'Save draft'}
          </button>
          <button
            className="button-secondary"
            disabled={!canLockSubmission() || lockOrders.isPending}
            onClick={() => setShowLockConfirm(true)}
            type="button"
          >
            Lock submission
          </button>
        </div>
        {isDirty ? <Notice>Unsaved changes are present. Save before locking.</Notice> : null}
      </section>

      <section className="surface-card page-card page-stack">
        <h3 className="detail-title">Saved draft summary</h3>
        {ordersData.orders.length === 0 ? (
          <Notice>No saved orders yet for this turn.</Notice>
        ) : (
          <div className="campaign-grid">
            {ordersData.orders.map((order) => (
              <article key={order.id} className="campaign-card">
                <div className="pill-row">
                  <span className="meta-pill">{order.platoonName}</span>
                  <span className="meta-pill">{order.orderType}</span>
                  <span className="meta-pill">{order.validationStatus}</span>
                </div>
                {parseValidationErrors(order.validationErrorsJson).length > 0 ? (
                  <Notice tone="error">{parseValidationErrors(order.validationErrorsJson).join(', ')}</Notice>
                ) : (
                  <Notice tone="success">Backend validation passed.</Notice>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      {showLockConfirm ? (
        <section className="surface-card page-card page-stack">
          <h3 className="detail-title">Confirm lock</h3>
          <p className="muted">Locking makes the submission read-only. The UI will switch into review mode immediately after success.</p>
          <div className="button-row">
            <button className="button-link" disabled={lockOrders.isPending} onClick={handleLock} type="button">
              {lockOrders.isPending ? 'Locking...' : 'Confirm lock'}
            </button>
            <button className="button-secondary" onClick={() => setShowLockConfirm(false)} type="button">
              Cancel
            </button>
          </div>
        </section>
      ) : null}
    </section>
  )
}
