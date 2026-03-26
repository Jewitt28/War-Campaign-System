export const queryKeys = {
  auth: ['auth', 'me'] as const,
  campaigns: ['campaigns'] as const,
  campaign: (campaignId: string) => ['campaigns', campaignId] as const,
  campaignMembers: (campaignId: string) => ['campaigns', campaignId, 'members'] as const,
  campaignMap: (campaignId: string) => ['campaigns', campaignId, 'map'] as const,
  campaignPhase: (campaignId: string) => ['campaigns', campaignId, 'phase'] as const,
  playerTerritory: (campaignId: string, territoryId: string) => ['campaigns', campaignId, 'territories', territoryId] as const,
  gmTerritory: (campaignId: string, territoryId: string) => ['campaigns', campaignId, 'territories', territoryId, 'gm'] as const,
  invite: (token: string) => ['invites', token] as const,
}
