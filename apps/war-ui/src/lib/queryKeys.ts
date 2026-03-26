export const queryKeys = {
  auth: ['auth', 'me'] as const,
  campaigns: ['campaigns'] as const,
  campaign: (campaignId: string) => ['campaigns', campaignId] as const,
  invite: (token: string) => ['invites', token] as const,
}
