export type WalkthroughStep = {
  title: string
  body: string
}

export const DEFAULT_WALKTHROUGH_STEPS: WalkthroughStep[] = [
  {
    title: 'Dashboard',
    body: 'The dashboard shows the current phase, turn, and the next action you should take.',
  },
  {
    title: 'Lobby',
    body: 'The lobby is where your role, faction, and nation assignment are shown before play begins.',
  },
  {
    title: 'Map',
    body: 'Use the map to inspect territories, selections, and campaign geography.',
  },
  {
    title: 'Orders',
    body: 'Orders are saved and locked from the campaign workflow once your membership is active.',
  },
  {
    title: 'Help and notifications',
    body: 'Use help topics for rules context and the notifications drawer for campaign links.',
  },
]
