import { useMemo, useState } from 'react'
import { NavLink, useParams } from 'react-router-dom'
import { useCampaign, useCampaignMap } from '../../features/campaigns'
import { useGmTerritory, usePlayerTerritory } from '../../features/map'
import { Notice, SkeletonCard, StateCard } from '../components'

type LayerMode = 'control' | 'supply' | 'forts'
type SidePanelMode = 'detail' | 'legend'

function parseTags(raw: string | null) {
  if (!raw) {
    return []
  }

  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.map(String) : []
  } catch {
    return []
  }
}

function describeTerritoryCard(layerMode: LayerMode, territory: {
  strategicStatus: string | null
  supplyStatus: string | null
  fortLevel: number
}) {
  if (layerMode === 'supply') {
    return territory.supplyStatus ?? 'Hidden'
  }

  if (layerMode === 'forts') {
    return `Fort ${territory.fortLevel}`
  }

  return territory.strategicStatus ?? 'Unknown'
}

export function CampaignMapPage() {
  const { campaignId = '' } = useParams()
  const campaign = useCampaign(campaignId)
  const mapSummary = useCampaignMap(campaignId)
  const [selectedTerritoryId, setSelectedTerritoryId] = useState<string>('')
  const [layerMode, setLayerMode] = useState<LayerMode>('control')
  const [theatreFilter, setTheatreFilter] = useState<string>('all')
  const [sidePanelMode, setSidePanelMode] = useState<SidePanelMode>('detail')

  const visibleTerritories = useMemo(() => {
    const territories = mapSummary.data?.territories ?? []
    if (theatreFilter === 'all') {
      return territories
    }

    return territories.filter((territory) => territory.theatreId === theatreFilter)
  }, [mapSummary.data?.territories, theatreFilter])

  const territoryId = useMemo(() => {
    if (!visibleTerritories.length) {
      return ''
    }

    return visibleTerritories.some((territory) => territory.id === selectedTerritoryId)
      ? selectedTerritoryId
      : visibleTerritories[0].id
  }, [selectedTerritoryId, visibleTerritories])

  const isGm = campaign.data?.myMembership.role === 'GM'
  const playerTerritory = usePlayerTerritory(campaignId, territoryId, Boolean(territoryId && !isGm))
  const gmTerritory = useGmTerritory(campaignId, territoryId, Boolean(territoryId && isGm))

  if (campaign.isLoading || mapSummary.isLoading) {
    return (
      <div className="page-stack">
        <SkeletonCard lines={4} />
        <SkeletonCard lines={5} />
      </div>
    )
  }

  if (campaign.isError || mapSummary.isError || !campaign.data || !mapSummary.data) {
    return (
      <StateCard
        title="Map unavailable"
        description="The campaign map projection could not be loaded from the backend."
      />
    )
  }

  const detail = isGm ? gmTerritory.data : playerTerritory.data
  const detailLoading = territoryId ? (isGm ? gmTerritory.isLoading : playerTerritory.isLoading) : false
  const detailError = isGm ? gmTerritory.error : playerTerritory.error
  const isGmDetail = Boolean(detail && 'partisanRisk' in detail)

  return (
    <section className="page-stack">
      <div className="page-header">
        <div className="page-header-copy">
          <p className="eyebrow">Campaign map</p>
          <h2 className="detail-title">Strategic geography</h2>
          <p className="muted">
            Select territories to inspect campaign state. Rendering stays role-safe by switching between player and GM
            detail endpoints rather than sharing a superset DTO.
          </p>
        </div>
        <div className="pill-row">
          <span className="meta-pill">{visibleTerritories.length} visible territories</span>
          <span className="meta-pill">{isGm ? 'GM detail' : 'Player detail'}</span>
        </div>
      </div>

      <section className="surface-card page-card page-stack">
        <div className="page-header">
          <div className="page-header-copy">
            <h3 className="detail-title">Map controls</h3>
          </div>
          <div className="button-row">
            <button className={layerMode === 'control' ? 'button-link' : 'button-secondary'} onClick={() => setLayerMode('control')} type="button">
              Control
            </button>
            <button className={layerMode === 'supply' ? 'button-link' : 'button-secondary'} onClick={() => setLayerMode('supply')} type="button">
              Supply
            </button>
            <button className={layerMode === 'forts' ? 'button-link' : 'button-secondary'} onClick={() => setLayerMode('forts')} type="button">
              Forts
            </button>
          </div>
        </div>
        <div className="button-row">
          <button className={theatreFilter === 'all' ? 'button-link' : 'button-secondary'} onClick={() => setTheatreFilter('all')} type="button">
            All theatres
          </button>
          {mapSummary.data.theatres.map((theatre) => (
            <button
              key={theatre.id}
              className={theatreFilter === theatre.id ? 'button-link' : 'button-secondary'}
              onClick={() => setTheatreFilter(theatre.id)}
              type="button"
            >
              {theatre.name}
            </button>
          ))}
        </div>
      </section>

      <div className="map-layout">
        <section className="surface-card page-card page-stack">
          <div className="page-header">
            <div className="page-header-copy">
              <h3 className="detail-title">Territory canvas</h3>
              <p className="muted">Desktop-first list-grid view for alpha playtesting. Each tile is selectable and keyed to the side panel.</p>
            </div>
          </div>
          {visibleTerritories.length === 0 ? (
            <Notice>No territories match the current theatre filter.</Notice>
          ) : (
            <div className="territory-grid">
              {visibleTerritories.map((territory) => (
                <button
                  key={territory.id}
                  className={territory.id === territoryId ? 'territory-tile territory-tile-active' : 'territory-tile'}
                  onClick={() => setSelectedTerritoryId(territory.id)}
                  type="button"
                >
                  <strong>{territory.name}</strong>
                  <span>{describeTerritoryCard(layerMode, territory)}</span>
                </button>
              ))}
            </div>
          )}
        </section>

        <aside className="surface-card page-card page-stack">
          <div className="page-header">
            <div className="page-header-copy">
              <h3 className="detail-title">Side panel</h3>
            </div>
            <div className="button-row">
              <button className={sidePanelMode === 'detail' ? 'button-link' : 'button-secondary'} onClick={() => setSidePanelMode('detail')} type="button">
                Details
              </button>
              <button className={sidePanelMode === 'legend' ? 'button-link' : 'button-secondary'} onClick={() => setSidePanelMode('legend')} type="button">
                Legend
              </button>
            </div>
          </div>

          {sidePanelMode === 'legend' ? (
            <div className="detail-list">
              <div className="detail-row">
                <dt>Control layer</dt>
                <dd>Shows strategic status as exposed by the backend map projection.</dd>
              </div>
              <div className="detail-row">
                <dt>Supply layer</dt>
                <dd>Shows supply bands where visible. Hidden fields remain hidden for players.</dd>
              </div>
              <div className="detail-row">
                <dt>Fort layer</dt>
                <dd>Highlights fortification level from the current turn state.</dd>
              </div>
            </div>
          ) : detailLoading ? (
            <SkeletonCard lines={5} />
          ) : detailError ? (
            <Notice tone="error">{detailError.message}</Notice>
          ) : detail ? (
            <div className="page-stack">
              <div className="section-stack" style={{ gap: 6 }}>
                <p className="eyebrow">{detail.theatre.name}</p>
                <h3>{detail.name}</h3>
                <p className="muted">{detail.terrainType}</p>
              </div>
              <div className="detail-list">
                <div className="detail-row">
                  <dt>Strategic status</dt>
                  <dd>{detail.strategicStatus ?? 'Unknown'}</dd>
                </div>
                <div className="detail-row">
                  <dt>Controller</dt>
                  <dd>{detail.controllingFaction?.name ?? 'Unknown'}</dd>
                </div>
                <div className="detail-row">
                  <dt>Nation</dt>
                  <dd>{detail.controllerNation?.name ?? 'Unknown'}</dd>
                </div>
                <div className="detail-row">
                  <dt>Supply</dt>
                  <dd>{detail.supplyStatus ?? 'Hidden'}</dd>
                </div>
                <div className="detail-row">
                  <dt>Fort level</dt>
                  <dd>{detail.fortLevel} / {detail.maxFortLevel}</dd>
                </div>
                <div className="detail-row">
                  <dt>Industry / manpower</dt>
                  <dd>{detail.baseIndustry} / {detail.baseManpower}</dd>
                </div>
              </div>
              <div className="pill-row">
                {detail.hasPort ? <span className="meta-pill">Port</span> : null}
                {detail.hasAirfield ? <span className="meta-pill">Airfield</span> : null}
                {parseTags(detail.strategicTagsJson).map((tag) => (
                  <span key={tag} className="meta-pill">{tag}</span>
                ))}
              </div>
              {isGmDetail ? (
                <div className="detail-list">
                  <div className="detail-row">
                    <dt>Partisan risk</dt>
                    <dd>{gmTerritory.data?.partisanRisk ?? 'Unknown'}</dd>
                  </div>
                  <div className="detail-row">
                    <dt>Notes</dt>
                    <dd>{gmTerritory.data?.notes ?? 'No GM notes'}</dd>
                  </div>
                </div>
              ) : null}
              <div className="button-row">
                <NavLink className="button-secondary" to={`/app/campaigns/${campaignId}/dashboard`}>
                  Back to dashboard
                </NavLink>
                <span className="nav-link-disabled">Orders links arrive in PR D</span>
              </div>
            </div>
          ) : (
            <Notice>Select a territory to inspect it.</Notice>
          )}
        </aside>
      </div>
    </section>
  )
}
