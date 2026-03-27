import { Navigate, useParams } from 'react-router-dom'
import { useCampaign } from '../../features/campaigns'
import { SkeletonCard } from '../components'

export function CampaignIndexRedirect() {
  const { campaignId = '' } = useParams()
  const campaign = useCampaign(campaignId)

  if (campaign.isLoading) {
    return <SkeletonCard lines={3} />
  }

  const onboarding = campaign.data?.myMembership.onboarding
  if (
    campaign.data?.myMembership.role === 'PLAYER' &&
    onboarding &&
    onboarding.onboardingStatus !== 'NOT_REQUIRED' &&
    onboarding.onboardingStatus !== 'COMPLETE'
  ) {
    return <Navigate replace to={`/app/campaigns/${campaignId}/onboarding`} />
  }

  if (campaign.data?.myMembership.role === 'PLAYER' && onboarding?.activationStatus === 'PENDING_NEXT_TURN') {
    return <Navigate replace to={`/app/campaigns/${campaignId}/waiting`} />
  }

  const target =
    campaign.data?.currentPhase === 'LOBBY'
      ? `/app/campaigns/${campaignId}/lobby`
      : `/app/campaigns/${campaignId}/dashboard`

  return <Navigate replace to={target} />
}
