import { createBrowserRouter } from 'react-router-dom'
import {
  AppShellLayout,
  AuthenticatedRoute,
  CampaignMembershipRoute,
  GmOnlyRoute,
  PublicLayout,
  RootRedirect,
} from '../routes/layouts'
import { CampaignsPage } from '../routes/pages/CampaignsPage'
import { CampaignDashboardPage } from '../routes/pages/CampaignDashboardPage'
import { CampaignIndexRedirect } from '../routes/pages/CampaignIndexRedirect'
import { CampaignLobbyPage } from '../routes/pages/CampaignLobbyPage'
import { CampaignMapPage } from '../routes/pages/CampaignMapPage'
import { CampaignOnboardingPage } from '../routes/pages/CampaignOnboardingPage'
import { CampaignOrdersPage } from '../routes/pages/CampaignOrdersPage'
import { CampaignBattlesPage } from '../routes/pages/CampaignBattlesPage'
import { CampaignEventsPage } from '../routes/pages/CampaignEventsPage'
import { CampaignPlatoonsPage } from '../routes/pages/CampaignPlatoonsPage'
import { CampaignWaitingPage } from '../routes/pages/CampaignWaitingPage'
import { CampaignWorkspaceLayout } from '../routes/pages/CampaignWorkspaceLayout'
import { GmAdminPlaceholderPage } from '../routes/pages/GmAdminPlaceholderPage'
import { HelpPage } from '../routes/pages/HelpPage'
import { InvitePage } from '../routes/pages/InvitePage'
import { LoginPage } from '../routes/pages/LoginPage'
import { UpdatesPage } from '../routes/pages/UpdatesPage'
import { RouteErrorPage } from '../routes/error-page'

export const router = createBrowserRouter(
  [
    {
      path: '/',
      element: <RootRedirect />,
      errorElement: <RouteErrorPage />,
    },
    {
      element: <PublicLayout />,
      errorElement: <RouteErrorPage />,
      children: [
        {
          path: '/login',
          element: <LoginPage />,
        },
        {
          path: '/invite/:token',
          element: <InvitePage />,
        },
      ],
    },
    {
      path: '/app',
      element: <AuthenticatedRoute />,
      errorElement: <RouteErrorPage />,
      children: [
        {
          element: <AppShellLayout />,
          children: [
            {
              path: 'campaigns',
              element: <CampaignsPage />,
            },
            {
              path: 'updates',
              element: <UpdatesPage />,
            },
            {
              path: 'help',
              element: <HelpPage />,
            },
            {
              path: 'campaigns/:campaignId',
              element: <CampaignMembershipRoute />,
              children: [
                {
                  index: true,
                  element: <CampaignIndexRedirect />,
                },
                {
                  path: 'onboarding',
                  element: <CampaignOnboardingPage />,
                },
                {
                  path: 'onboarding/:step',
                  element: <CampaignOnboardingPage />,
                },
                {
                  path: 'waiting',
                  element: <CampaignWaitingPage />,
                },
                {
                  element: <CampaignWorkspaceLayout />,
                  children: [
                    {
                      path: 'lobby',
                      element: <CampaignLobbyPage />,
                    },
                    {
                      path: 'dashboard',
                      element: <CampaignDashboardPage />,
                    },
                    {
                      path: 'map',
                      element: <CampaignMapPage />,
                    },
                    {
                      path: 'orders',
                      element: <CampaignOrdersPage />,
                    },
                    {
                      path: 'platoons',
                      element: <CampaignPlatoonsPage />,
                    },
                    {
                      path: 'battles',
                      element: <CampaignBattlesPage />,
                    },
                    {
                      path: 'events',
                      element: <CampaignEventsPage />,
                    },
                  ],
                },
                {
                  path: 'admin',
                  element: <GmOnlyRoute />,
                  children: [
                    {
                      index: true,
                      element: <GmAdminPlaceholderPage />,
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
  {
    basename: import.meta.env.BASE_URL,
  },
)
