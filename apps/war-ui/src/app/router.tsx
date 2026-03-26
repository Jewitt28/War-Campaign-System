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
import { CampaignOrdersPage } from '../routes/pages/CampaignOrdersPage'
import { CampaignBattlesPage } from '../routes/pages/CampaignBattlesPage'
import { CampaignEventsPage } from '../routes/pages/CampaignEventsPage'
import { CampaignPlatoonsPage } from '../routes/pages/CampaignPlatoonsPage'
import { CampaignWorkspaceLayout } from '../routes/pages/CampaignWorkspaceLayout'
import { GmAdminPlaceholderPage } from '../routes/pages/GmAdminPlaceholderPage'
import { InvitePage } from '../routes/pages/InvitePage'
import { LoginPage } from '../routes/pages/LoginPage'
import { UpdatesPage } from '../routes/pages/UpdatesPage'

export const router = createBrowserRouter(
  [
    {
      path: '/',
      element: <RootRedirect />,
    },
    {
      element: <PublicLayout />,
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
              path: 'campaigns/:campaignId',
              element: <CampaignMembershipRoute />,
              children: [
                {
                  index: true,
                  element: <CampaignIndexRedirect />,
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
