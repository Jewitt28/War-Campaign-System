import { Navigate, useParams } from 'react-router-dom'
import { useCampaign } from '../../features/campaigns'
import { SkeletonCard } from '../components'

export function CampaignIndexRedirect() {
  const { campaignId = '' } = useParams()
  const campaign = useCampaign(campaignId)

  if (campaign.isLoading) {
    return <SkeletonCard lines={3} />
  }

  const target =
    campaign.data?.currentPhase === 'LOBBY'
      ? `/app/campaigns/${campaignId}/lobby`
      : `/app/campaigns/${campaignId}/dashboard`

  return <Navigate replace to={target} />
}
