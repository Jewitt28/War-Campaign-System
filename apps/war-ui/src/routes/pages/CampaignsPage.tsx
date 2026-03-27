import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useCreateCampaign } from '../../features/admin'
import { useCampaigns } from '../../features/campaigns'
import { Notice, SkeletonCard, StateCard } from '../components'

export function CampaignsPage() {
  const navigate = useNavigate()
  const campaigns = useCampaigns()
  const createCampaign = useCreateCampaign()
  const [campaignName, setCampaignName] = useState('')

  async function handleCreateCampaign(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmedName = campaignName.trim()
    if (!trimmedName) {
      return
    }

    const createdCampaign = await createCampaign.mutateAsync({ name: trimmedName })
    setCampaignName('')
    navigate(`/app/campaigns/${createdCampaign.campaignId}/admin`)
  }

  if (campaigns.isLoading) {
    return (
      <div className="page-stack">
        <SkeletonCard lines={4} />
        <SkeletonCard lines={4} />
        <SkeletonCard lines={4} />
      </div>
    )
  }

  if (campaigns.isError) {
    return (
      <div className="page-stack">
        <StateCard
          title="Campaign list unavailable"
          description="The app shell loaded, but the joined campaigns list could not be fetched from the backend."
        />
        <section className="surface-card page-card page-stack">
          <div className="page-header-copy">
            <p className="eyebrow">GM setup</p>
            <h2 className="detail-title">Start a new campaign</h2>
            <p className="muted">Campaign creation is still available even if the joined list fails to load.</p>
          </div>
          <CampaignCreateForm
            campaignName={campaignName}
            createError={createCampaign.error?.message ?? null}
            isPending={createCampaign.isPending}
            onCampaignNameChange={setCampaignName}
            onSubmit={handleCreateCampaign}
          />
        </section>
      </div>
    )
  }

  const campaignList = campaigns.data ?? []

  if (campaignList.length === 0) {
    return (
      <div className="page-stack">
        <section className="surface-card page-card page-stack">
          <div className="page-header">
            <div className="page-header-copy">
              <p className="eyebrow">GM setup</p>
              <h1 className="page-title">Start a new campaign</h1>
              <p className="muted">Create a fresh campaign here, then open its admin route to send invites.</p>
            </div>
          </div>
          <CampaignCreateForm
            campaignName={campaignName}
            createError={createCampaign.error?.message ?? null}
            isPending={createCampaign.isPending}
            onCampaignNameChange={setCampaignName}
            onSubmit={handleCreateCampaign}
          />
        </section>
        <StateCard
          title="No joined campaigns yet"
          description="This account is authenticated but not attached to any campaigns. Use an invite link to join your first campaign."
        />
        <Notice>Create a campaign if you are acting as GM, or open an invite link if you are joining as a player or observer.</Notice>
      </div>
    )
  }

  return (
    <section className="page-stack">
      <div className="page-header">
        <div className="page-header-copy">
          <p className="eyebrow">Authenticated app</p>
          <h1 className="page-title">My campaigns</h1>
          <p className="muted">Only campaigns joined by the authenticated user are listed here.</p>
        </div>
        <div className="pill-row">
          <span className="meta-pill">{campaignList.length} joined</span>
        </div>
      </div>

      <section className="surface-card page-card page-stack">
        <div className="page-header">
          <div className="page-header-copy">
            <p className="eyebrow">GM setup</p>
            <h2 className="detail-title">Start a new campaign</h2>
            <p className="muted">Creating a campaign makes this account the GM and opens the admin route for invites and lifecycle controls.</p>
          </div>
        </div>
        <CampaignCreateForm
          campaignName={campaignName}
          createError={createCampaign.error?.message ?? null}
          isPending={createCampaign.isPending}
          onCampaignNameChange={setCampaignName}
          onSubmit={handleCreateCampaign}
        />
      </section>

      <div className="campaign-grid">
        {campaignList.map((campaign) => (
          <article key={campaign.id} className="campaign-card">
            <div className="section-stack">
              <div className="pill-row">
                <span className="meta-pill">{campaign.currentPhase}</span>
                <span className="meta-pill">{campaign.myRole}</span>
              </div>
              <div className="section-stack" style={{ gap: 6 }}>
                <h3>{campaign.name}</h3>
                <p className="muted">{campaign.memberCount} active members</p>
              </div>
            </div>
            <div className="campaign-actions">
              <NavLink className="button-link" to={`/app/campaigns/${campaign.id}`}>
                Open campaign
              </NavLink>
              {campaign.myRole === 'GM' ? (
                <NavLink className="button-secondary" to={`/app/campaigns/${campaign.id}/admin`}>
                  GM admin
                </NavLink>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

type CampaignCreateFormProps = {
  campaignName: string
  createError: string | null
  isPending: boolean
  onCampaignNameChange: (value: string) => void
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => Promise<void>
}

function CampaignCreateForm({
  campaignName,
  createError,
  isPending,
  onCampaignNameChange,
  onSubmit,
}: CampaignCreateFormProps) {
  return (
    <form className="field-grid" onSubmit={(event) => void onSubmit(event)}>
      <label className="field-label">
        Campaign name
        <input
          className="field-input"
          maxLength={80}
          onChange={(event) => onCampaignNameChange(event.target.value)}
          placeholder="Operation Torch Alpha"
          type="text"
          value={campaignName}
        />
      </label>
      <div className="button-row">
        <button className="button-link" disabled={isPending || !campaignName.trim()} type="submit">
          {isPending ? 'Creating campaign...' : 'Create campaign'}
        </button>
      </div>
      {createError ? <Notice tone="error">{createError}</Notice> : null}
    </form>
  )
}
